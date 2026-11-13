import { expect, test, type TestBody } from 'claude-code/testing'
import type { CommandRunInput, ContextCategory, ProcessRunResult, SessionContextBreakdown } from 'claude-code'

const start = { cwd: '/', surface: 'terminal', isInteractive: true } as const
// What the engine hands over in full: a process's result, a /context row, /tokendoctor typed at the prompt.
const ran = (stdout: string): ProcessRunResult => ({ exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
const row = (name: string, tokens: number, kind: ContextCategory['kind']): ContextCategory => ({ name, tokens, kind, color: 'inactive', isDeferred: false })
const typed = (args = ''): CommandRunInput => ({ command: 'tokendoctor', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
// A /context breakdown of the given rows, the fields the hooks do not read left empty.
const breakdown = (fields: Pick<SessionContextBreakdown, 'categories' | 'model' | 'autoCompactThreshold' | 'isAutoCompactEnabled'>): SessionContextBreakdown => ({
  totalTokens: 0, maxTokens: 0, rawMaxTokens: 0, autocompactSource: 'model-default', percentage: 0,
  gridRows: [], memoryFiles: [], mcpTools: [], agents: [], apiUsage: null, ...fields,
})

test('the five tools are registered at session start, behind ToolSearch', async ($, on) => {
  const names: string[] = []
  on('tool.register', (_, e) => {
    names.push(e.name)
    expect(e.isDeferred).toBe(undefined)
    return { value: { tool: `mcp__tokendoctor__${e.name}` } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start(start)
  expect(names).toEqual(['metrics', 'settings', 'config_list', 'config_set', 'set_setting'])
})

test('its own tools skip the permission prompt, other tools are left alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'engine' }))
  expect((await $.tool.check({ tool: 'mcp__tokendoctor__metrics', input: {} })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'mcp__tokendoctor__set_setting', input: {} })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: { command: 'ls' } })).decision).toBe('deny')
})

test('config_list reports the /config rows and config_set relays a refusal', async ($, on) => {
  on('config.list', () => ({ value: [{ key: 'verbose', label: 'Verbose', kind: 'boolean', value: false, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
  let sets = 0
  on('config.set', (_, e) => (sets++, { value: e.value }))
  let answer = 'Apply'
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => ({ result: { questions: e.questions, answers: { [e.questions[0]!.question]: answer } } }))
  const list = await $.tool.call({ tool: 'mcp__tokendoctor__config_list' })
  expect(String(list.result)).toContain('"verbose"')
  const ok = await $.tool.call({ tool: 'mcp__tokendoctor__config_set', key: 'verbose', value: true })
  expect(String(ok.result)).toContain('verbose is now true')
  answer = 'Cancel'
  const no = await $.tool.call({ tool: 'mcp__tokendoctor__config_set', key: 'verbose', value: false })
  expect(String(no.result)).toContain('did not approve')
  const missing = await $.tool.call({ tool: 'mcp__tokendoctor__config_set', key: 'nope', value: 1 })
  expect(String(missing.result)).toContain('has no row')
  expect(sets).toBe(1)
})

test('set_setting shows the dry run, writes only on Apply, and never without a person', async ($, on) => {
  const runs: (readonly string[])[] = []
  on('process.run', (_, e) => {
    runs.push(e.argv.slice(2))
    const write = e.argv.includes('--write')
    return { value: ran(write ? 'Applying (project): written' : 'Would change (project): x\n\nDry run. Re-run with --write to apply.') }
  })
  let question = ''
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    question = e.questions[0]!.question
    return { result: { questions: e.questions, answers: { [question]: 'Apply' } } }
  })
  const r = await $.tool.call({ tool: 'mcp__tokendoctor__set_setting', key: 'autoCompactWindow', value: 400000, scope: 'project' })
  expect(runs).toEqual([
    ['autoCompactWindow', '400000', '--scope', 'project'],
    ['autoCompactWindow', '400000', '--scope', 'project', '--write'],
  ])
  expect(question).toContain('Would change (project): x')
  expect(String(r.result)).toContain('written')
})

test('with no one to ask (a -p run) nothing is written', async ($, on) => {
  const runs: (readonly string[])[] = []
  on('process.run', (_, e) => (runs.push(e.argv.slice(2)), { value: ran('Would change (user): x') }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'no one to ask' }))
  const r = await $.tool.call({ tool: 'mcp__tokendoctor__set_setting', key: 'idleCompaction' })
  expect(String(r.result)).toContain('did not approve')
  expect(runs).toEqual([['idleCompaction', '--unset', '--scope', 'user']])
})

test('metrics joins the session, the daily trend and the audit findings', async ($, on) => {
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: {
        tokens: 120000,
        window: 1000000,
        percent: 12,
        breakdown: breakdown({
          autoCompactThreshold: 367000,
          isAutoCompactEnabled: true,
          model: 'claude-opus-5-5',
          categories: [
            row('Messages', 90000, 'used'),
            row('Free space', 800000, 'free'),
            row('System tools', 20000, 'used'),
          ],
        }),
      },
      rateLimits: [],
      cost: { usd: 1.5 },
    },
  }))
  on('process.run', (_, e) => ({
    value: ran(
      e.argv[1]?.endsWith('tokendoctor-audit')
      ? JSON.stringify({ findings: [{ id: 'auto-compact-off', severity: 'warn', title: 't', fixes: [] }] })
      : JSON.stringify([{ date: '2026-10-24', cost: 1 }]),
    ),
  }))
  const r = JSON.parse(String((await $.tool.call({ tool: 'mcp__tokendoctor__metrics', days: 7 })).result))
  expect(r.session.compactAt).toBe(367000)
  expect(r.session.biggest.map((c: { name: string }) => c.name)).toEqual(['Messages', 'System tools'])
  expect(r.trend[0].date).toBe('2026-10-24')
  expect(r.findings).toEqual([{ id: 'auto-compact-off', severity: 'warn', title: 't', hasFix: true }])
})

test('settings shows each tunable with its current merged value, unset ones as null', async ($, on) => {
  on('process.run', () => ({
    value: ran(JSON.stringify([{ key: 'autoCompactWindow', live: true, about: 'a' }, { key: 'env.ENABLE_TOOL_SEARCH', live: false, about: 'b' }, { key: 'idleCompaction', live: true, about: 'c' }])),
  }))
  on('settings.read', () => ({ value: { autoCompactWindow: 400000, env: { ENABLE_TOOL_SEARCH: 'auto' } } }))
  const rows = JSON.parse(String((await $.tool.call({ tool: 'mcp__tokendoctor__settings' })).result))
  expect(rows.map((r: { current: unknown }) => r.current)).toEqual([400000, 'auto', null])
})

// /tokendoctor answers here, with no model call: the settings as the engine merged them, the audit and
// tokendoctor-set run as processes.
function console_(on: Parameters<TestBody>[1], merged: Record<string, unknown>) {
  const runs: (readonly string[])[] = []
  on('settings.read', () => ({ value: merged }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 1, window: 1, breakdown: { autoCompactThreshold: 367000, categories: [] } }, rateLimits: [] } }) as never)
  on('process.run', (_, e) => {
    const [bin, ...args] = [e.argv[1]!.split('/').pop()!, ...e.argv.slice(2)]
    runs.push([bin, ...args])
    const stdout =
      bin === 'tokendoctor-audit'
        ? JSON.stringify({ findings: [{ id: 'subagents-on-top-model', severity: 'warn', title: 'Subagents run on Opus', fixes: [{ scope: 'user', ops: [] }] }] })
        : bin === 'tokendoctor-undo'
          ? args.includes('--json')
            ? JSON.stringify([{ at: '2026-11-01T02:31:00Z', path: '/h/s.json', scope: 'user', changes: [{ key: 'advisorModel', after: 'opus' }], backup: null }])
            : 'Applying (user): /h/s.json\n-   "advisorModel": "opus"\n  written\n'
        : bin === 'tokendoctor-set'
          ? 'Applying (user): set autoCompactWindow = 400000\n  written, backup: /h/settings.json.bak\n'
          : args.includes('--write')
            ? 'Applying (user): set env.CLAUDE_CODE_SUBAGENT_MODEL\n  written\n'
            : 'Would change (user): set env.CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"\n\nDry run. Re-run with --write to apply.'
    return { value: ran(stdout) }
  })
  return runs
}

test('/tokendoctor shows the main settings and the audit’s fixes', async ($, on) => {
  console_(on, { promptCacheTtl: '1h' })
  const r = await $.command.run(typed())
  expect(r.text).toContain('default, compacts at 367K')
  expect(r.text).toMatch(/cache\s+1h/)
  expect(r.text).toContain('/tokendoctor fix subagents-on-top-model')
})

test('/tokendoctor <name> <value> writes what was typed, with no dialog', async ($, on) => {
  const runs = console_(on, {})
  let asked = 0
  on('tool.call', { tool: 'AskUserQuestion' }, () => (asked++, { deny: 'not expected' }))
  const r = await $.command.run(typed('window 400k'))
  expect(runs.find(a => a[0] === 'tokendoctor-set')).toEqual(['tokendoctor-set', 'autoCompactWindow', '400000', '--scope', 'user', '--write'])
  expect(r.text).toBe('window: default → 400K in user settings. Applies now.\nBackup: /h/settings.json.bak')
  expect(asked).toBe(0)
})

test('a bad value or name is answered without writing', async ($, on) => {
  const runs = console_(on, {})
  expect((await $.command.run(typed('cache 2h'))).text).toContain('Try: 5m, 1h')
  expect((await $.command.run(typed('slid on'))).text).toContain('Did you mean slide')
  expect(runs.some(a => a[0] === 'tokendoctor-set')).toBe(false)
})

test('/tokendoctor fix <id> shows the change and writes it only on Apply', async ($, on) => {
  const runs = console_(on, {})
  let answer = 'Cancel'
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => ({ result: { questions: e.questions, answers: { [e.questions[0]!.question]: answer } } }))
  const no = await $.command.run(typed('fix subagents-on-top-model'))
  expect(no.text).toContain('Not changed.')
  answer = 'Apply'
  const yes = await $.command.run(typed('fix subagents-on-top-model'))
  expect(yes.text).toContain('written')
  expect(runs.filter(a => a[0] === 'tokendoctor-apply')).toEqual([
    ['tokendoctor-apply', 'subagents-on-top-model'],
    ['tokendoctor-apply', 'subagents-on-top-model'],
    ['tokendoctor-apply', 'subagents-on-top-model', '--write'],
  ])
})

test('/tokendoctor undo lists the changes by number and puts one back as typed', async ($, on) => {
  const runs = console_(on, {})
  const list = await $.command.run(typed('undo'))
  expect(list.text).toMatch(/ 1 .* user\s+advisor: default → opus/)
  const back = await $.command.run(typed('undo 1'))
  expect(back.text).toContain('written')
  expect(runs.filter(a => a[0] === 'tokendoctor-undo')).toEqual([['tokendoctor-undo', '--json'], ['tokendoctor-undo', '1', '--write']])
  expect((await $.command.run(typed('undo last'))).text).toContain('lists them by number')
})
