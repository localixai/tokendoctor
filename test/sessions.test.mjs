import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { analyzeSession, cost, loadSessions, loadUsage, summarize } from '../lib/sessions.mjs'

let n = 0
const turn = (minute, usage, { model = 'claude-opus-5-5', id } = {}) => ({
  type: 'assistant',
  timestamp: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
  message: { id: id ?? `m${n++}`, model, usage, content: [] },
})
const u = (read, write, out = 100) => ({ input_tokens: 10, cache_read_input_tokens: read, cache_creation_input_tokens: write, output_tokens: out })

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} vs ${b}`)

test('cost is dollars at the model list price: cache reads, writes by TTL and output', () => {
  // Opus 5.5: $4 input, $20 output, cache read 0.05x, writes 1.25x and 2x.
  near(cost({ input_tokens: 10, cache_read_input_tokens: 1000, output_tokens: 2 }, 'claude-opus-5-5'), (10 * 4 + 1000 * 0.2 + 2 * 20) / 1e6)
  near(cost({ cache_creation_input_tokens: 100, cache_creation: { ephemeral_1h_input_tokens: 100 } }, 'claude-opus-5-5'), (100 * 8) / 1e6)
  near(cost({ cache_creation_input_tokens: 100 }, 'claude-opus-5-5'), (100 * 5) / 1e6)
  assert.equal(cost({ input_tokens: 10 }, 'some-other-model'), 0)
})

test('a summary compaction adds an estimate of its own request, which the transcript leaves out', () => {
  const rows = [
    turn(0, u(300_000, 1000)),
    { type: 'system', subtype: 'compact_boundary', timestamp: new Date(Date.UTC(2026, 9, 1, 0, 1)).toISOString(), compactMetadata: { trigger: 'auto', preTokens: 300_000 } },
    { type: 'user', isCompactSummary: true, timestamp: new Date(Date.UTC(2026, 9, 1, 0, 1)).toISOString(), message: { content: 'x'.repeat(3500) } },
    turn(2, u(0, 20_000)),
  ]
  const s = analyzeSession(rows)
  // 300K read at Opus 5.5's $0.20, and the summary's ~1,000 tokens written at $20 (its JSON adds 2 characters).
  near(s.hiddenCost, (300_000 * 0.2 + (3502 / 3.5) * 20) / 1e6)
  assert.equal(s.hiddenFrom, 'estimate')
  near(s.mainCost, cost(u(300_000, 1000), 'claude-opus-5-5') + cost(u(0, 20_000), 'claude-opus-5-5') + s.hiddenCost)
  // A compaction with no summary after it (the slide) adds nothing.
  assert.equal(analyzeSession(rows.filter((r) => !r.isCompactSummary)).hiddenCost, 0)
})

test("Claude Code's own session total, where it holds, sets what the transcripts leave out", () => {
  const start = Date.UTC(2026, 9, 1, 0, 0)
  // Two responses of 10M cached tokens each, about $2 apiece, so a 1-cent tolerance does not blur the cases.
  const responses = cost(u(10_000_000, 0), 'claude-opus-5-5') * 2
  const state = (total, startTime = start) => ({ type: 'cost-state', totalCostUSD: total, startTime, hasUnknownModelCost: false })
  const rows = [turn(0, u(10_000_000, 0)), turn(1, u(10_000_000, 0))]
  // It holds: the hidden part is the difference, whatever the summaries' estimate.
  const own = analyzeSession([...rows, state(responses + 0.5)])
  near(own.hiddenCost, 0.5)
  assert.equal(own.hiddenFrom, 'claude code')
  near(own.cost, responses + 0.5)
  // It does not: a total that fell (a restart), a process that started long before, a total under
  // the responses. Then nothing is added where there is no summary to estimate.
  for (const bad of [[state(responses + 1), state(0.1)], [state(responses + 1, start - 3600e3)], [state(responses / 2)]]) {
    const s = analyzeSession([...rows, ...bad])
    assert.equal(s.hiddenFrom, 'estimate')
    assert.equal(s.hiddenCost, 0)
  }
})

test('streamed lines of one response count once', () => {
  const s = analyzeSession([turn(0, u(0, 1000), { id: 'a' }), turn(0, u(0, 1000), { id: 'a' })])
  assert.equal(s.turns, 1)
})

test('a cache rebuild after a long gap is put down to the TTL, after a compaction to compaction', () => {
  const idle = analyzeSession([turn(0, u(100000, 1000)), turn(30, u(0, 100000))])
  assert.equal(idle.rebuilds['idle past the cache TTL'].n, 1)
  const compacted = analyzeSession([
    turn(0, u(100000, 1000)),
    { subtype: 'compact_boundary', timestamp: new Date(Date.UTC(2026, 9, 1, 0, 1)).toISOString(), compactMetadata: { trigger: 'auto', preTokens: 700000 } },
    turn(2, u(0, 50000)),
  ])
  assert.equal(compacted.rebuilds.compaction.n, 1)
  assert.equal(compacted.compactions[0].preTokens, 700000)
})

test('late compaction, subagents on Opus and long sessions are reported', () => {
  const big = analyzeSession(
    Array.from({ length: 500 }, (_, i) => turn(i, u(500000, 1000))),
    [{ type: 'general-purpose', rows: Array.from({ length: 50 }, (_, i) => turn(i, u(300000, 5000))) }],
  )
  const ids = summarize([big]).findings.map((f) => f.id)
  assert.deepEqual(ids, ['late-compaction', 'subagents-on-top-model', 'long-sessions'])
})

test('subagents on Sonnet and small sessions report nothing', () => {
  const s = analyzeSession([turn(0, u(20000, 1000), { model: 'claude-sonnet-5-5' })], [
    { type: 'Explore', rows: [turn(1, u(10000, 1000), { model: 'claude-haiku-5-5' })] },
  ])
  assert.deepEqual(summarize([s]).findings, [])
})

test('only images read repeatedly are reported', () => {
  const read = (id, path) => [
    { type: 'assistant', timestamp: 't', message: { content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: path } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id }] } },
  ]
  const rows = [turn(0, u(0, 100)), ...[1, 2, 3].flatMap((i) => [...read(`p${i}`, '/x/shot.png'), ...read(`t${i}`, '/x/a.ts')])]
  const f = summarize([analyzeSession(rows)]).findings.find((x) => x.id === 'images-read-repeatedly')
  assert.match(f.detail, /shot\.png \(3x\)/)
  assert.doesNotMatch(f.detail, /a\.ts/)
})

test('the CLI reads transcripts under the config folder and prints no message text', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tokendoctor-sessions-'))
  try {
    const proj = join(dir, 'projects', '-p')
    mkdirSync(join(proj, 's1', 'subagents'), { recursive: true })
    const secret = { type: 'user', message: { content: 'private words' } }
    // Today's, as the CLI counts the last 30 days by when each response was made.
    const today = (r) => ({ ...r, timestamp: new Date().toISOString() })
    writeFileSync(join(proj, 's1.jsonl'), [secret, today(turn(0, u(1000, 100)))].map((r) => JSON.stringify(r)).join('\n'))
    writeFileSync(join(proj, 's1', 'subagents', 'agent-1.jsonl'), JSON.stringify(today(turn(1, u(1000, 100)))))
    writeFileSync(join(proj, 's1', 'subagents', 'agent-1.meta.json'), JSON.stringify({ agentType: 'Explore' }))
    const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'tokendoctor-sessions')
    const r = spawnSync(process.execPath, [bin, '--json'], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: dir, CLAUDE_CONFIG_DIR: dir } })
    assert.equal(r.status, 0, r.stderr)
    const out = JSON.parse(r.stdout)
    assert.equal(out.totals.sessions, 1)
    assert.equal(out.totals.agents.Explore.runs, 1)
    assert.doesNotMatch(r.stdout, /private words/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('usage counts tools, Bash prints of files, sleeps and subagent run sizes', () => {
  const call = (id, name, input, at) => [
    { type: 'assistant', timestamp: at, message: { id: `m-${id}`, model: 'claude-opus-5-5', role: 'assistant', usage: { input_tokens: 10, cache_read_input_tokens: 250000, output_tokens: 5 }, content: [{ type: 'tool_use', id, name, input }] } },
    { type: 'user', timestamp: at, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'x'.repeat(1000) }] } },
  ]
  const sub = [
    ...call('a', 'Bash', { command: "cd /r && sed -n '1,40p' docs/A.md" }, '2026-11-01T10:00:00Z'),
    ...call('b', 'Bash', { command: 'bun test | tail -5' }, '2026-11-01T10:01:00Z'),
    ...call('c', 'Bash', { command: 'sleep 30; cat log' }, '2026-11-01T10:02:00Z'),
    ...call('d', 'Read', { file_path: 'docs/A.md' }, '2026-11-01T10:03:00Z'),
  ]
  const s = analyzeSession(call('m', 'Read', { file_path: 'docs/A.md' }, '2026-11-01T09:59:00Z'), [{ type: 'general-purpose', rows: sub }])
  const { usage } = summarize([s])
  assert.deepEqual(usage.subagents.bash, { calls: 3, chars: 3000, fileReads: 1, fileReadChars: 1000, waits: 1 })
  assert.equal(usage.subagents.tools.Read.calls, 1)
  assert.equal(usage.main.tools.Read.chars, 1000)
  assert.deepEqual(usage.filesReadMost[0], { path: 'docs/A.md', times: 3 })
  assert.equal(usage.subagentRuns.runs, 1)
  assert.equal(usage.subagentRuns.requests.max, 4)
  assert.equal(usage.subagentRuns.over200KContext, 1)
})

test('files read before a compaction and read again right after are counted, by kind of compaction', () => {
  const at = (minute) => new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString()
  const read = (minute, path, id) => ({ type: 'assistant', timestamp: at(minute), message: { id, model: 'claude-opus-5-5', usage: u(1000, 10), content: [{ type: 'tool_use', id: `t-${id}`, name: 'Read', input: { file_path: path } }] } })
  const boundary = (minute) => ({ type: 'system', subtype: 'compact_boundary', timestamp: at(minute), compactMetadata: { trigger: 'auto', preTokens: 300_000 } })
  const summary = (minute) => ({ type: 'user', isCompactSummary: true, timestamp: at(minute), message: { content: 'summary' } })
  const session = (withSummary) =>
    analyzeSession([
      read(0, '/p/a.ts', 'r1'),
      read(1, '/p/b.ts', 'r2'),
      boundary(2),
      ...(withSummary ? [summary(2)] : []),
      read(3, '/p/a.ts', 'r3'),
      read(4, '/p/b.ts', 'r4'),
      read(5, '/p/c.ts', 'r5'),
    ])
  const s = session(true)
  assert.equal(s.compactions[0].summary, true)
  assert.equal(s.compactions[0].rereads, 2, 'a.ts and b.ts again, c.ts is new')
  assert.equal(session(false).compactions[0].summary, false)
  const t = summarize([s, session(true), session(true)])
  const f = t.findings.find((x) => x.id === 'rereads-after-compaction')
  assert.match(f.title, /2\.0 files again/)
})

// A forked or resumed session's transcript starts with a copy of the one it came from: the same
// lines, uuids and all, Claude Code's cost-state line among them, and its subagents' transcripts.
function forked() {
  const dir = mkdtempSync(join(tmpdir(), 'tokendoctor-fork-'))
  const proj = join(dir, 'projects', '-p')
  const write = (path, rows) => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, rows.map((r) => JSON.stringify(r)).join('\n'))
  }
  const start = Date.UTC(2026, 9, 1, 0, 0)
  const line = (uuid, minute, usage, id) => ({ ...turn(minute, usage, { id }), uuid })
  const shared = [
    { type: 'user', uuid: 'u0', timestamp: new Date(start).toISOString(), message: { content: 'hello' } },
    line('u1', 1, u(10_000_000, 0), 'm1'),
    line('u2', 2, u(10_000_000, 0), 'm2'),
    { type: 'cost-state', totalCostUSD: cost(u(10_000_000, 0), 'claude-opus-5-5') * 2 + 0.5, startTime: start, hasUnknownModelCost: false },
  ]
  const agent = [line('x1', 1, u(1000, 100), 'a1')]
  // The original is the older file; its name sorts after the fork's, so age decides, not the name.
  for (const [name, own] of [['b-original', line('u3', 3, u(1000, 0), 'm3')], ['a-fork', line('u4', 4, u(2000, 0), 'm4')]]) {
    write(join(proj, `${name}.jsonl`), [...shared, own])
    write(join(proj, name, 'subagents', 'agent-x.jsonl'), agent)
    writeFileSync(join(proj, name, 'subagents', 'agent-x.meta.json'), JSON.stringify({ agentType: 'Explore' }))
    if (name === 'b-original') utimesSync(join(proj, `${name}.jsonl`), start / 1000, start / 1000)
  }
  return dir
}

test("a forked transcript counts only what it added; the file it came from keeps the shared lines", () => {
  const dir = forked()
  try {
    const sessions = loadSessions(dir)
    assert.equal(sessions.length, 2)
    const original = sessions.find((s) => s.turns === 3)
    const fork = sessions.find((s) => s.turns === 1)
    assert.ok(original && fork, `turns ${sessions.map((s) => s.turns)}`)
    assert.equal(original.agents.Explore.runs, 1)
    assert.deepEqual(fork.agents, {}, 'the copied subagent transcript adds no run')
    // Claude Code's own total is the original's; the copy's is not its own.
    assert.equal(original.hiddenFrom, 'claude code')
    assert.equal(fork.hiddenFrom, 'estimate')
    assert.equal(fork.hiddenCost, 0)
    near(fork.cost, cost(u(2000, 0), 'claude-opus-5-5'))
    const usage = loadUsage(dir).map((s) => [s.usage.length, s.agents > 0])
    assert.deepEqual(usage.sort(), [[1, false], [3, true]])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a period counts only what happened in it, also of a session that started before it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tokendoctor-period-'))
  try {
    const proj = join(dir, 'projects', '-p')
    mkdirSync(join(proj, 's', 'subagents'), { recursive: true })
    const at = (days, id) => ({ type: 'assistant', uuid: id, timestamp: new Date(Date.now() - days * 864e5).toISOString(), message: { id, model: 'claude-opus-5-5', usage: u(1000, 0), content: [] } })
    writeFileSync(join(proj, 's.jsonl'), [at(40, 'old'), at(1, 'new')].map((r) => JSON.stringify(r)).join('\n'))
    writeFileSync(join(proj, 's', 'subagents', 'agent-old.jsonl'), JSON.stringify(at(40, 'agent-old')))
    writeFileSync(join(proj, 's', 'subagents', 'agent-new.jsonl'), JSON.stringify(at(1, 'agent-new')))
    const one = cost(u(1000, 0), 'claude-opus-5-5')
    const [s] = loadSessions(dir, { days: 30 })
    assert.equal(s.turns, 1)
    assert.equal(s.runs.length, 1, 'the subagent run before the period is left out')
    near(s.cost, 2 * one)
    const [r] = loadUsage(dir, { days: 30 })
    assert.equal(r.usage.length, 1)
    near(r.agents, one)
    assert.equal(loadSessions(dir)[0].turns, 2, 'without a period, all of it')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
