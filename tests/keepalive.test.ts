import { expect, mock, test } from 'claude-code/testing'
import type { ModelForkResult, On, TurnUsage } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const MIN = 60_000
const H = 60 * MIN
const MODEL = 'claude-opus-5-5'
const ON = { pluginConfigs: { 'tokendoctor@tokendoctor': { options: { keepalive: true } } } }

// A response that read `read` tokens from the cache and wrote `write` for the given lifetime.
const usage = (read: number, write = 0, ttl: '1h' | '5m' = '1h'): TurnUsage => ({
  input_tokens: 5, output_tokens: 100, cache_read_input_tokens: read, cache_creation_input_tokens: write, model: MODEL,
  ...(write ? (ttl === '1h' ? { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: write } : { ephemeral_5m_input_tokens: write, ephemeral_1h_input_tokens: 0 }) : {}),
})
const answered = (read: number, write = 0): ModelForkResult => ({ isAnswered: true, text: 'ok', usage: usage(read, write) })

type World = { forks: number[]; fork: (n: number) => ModelForkResult; model: string; settings: unknown; limits: number; usage: TurnUsage; during?: () => Promise<void> }

// The engine beneath the plugin: settings, the model, the store, plan limits, the turn's request and
// the fork, each answered from `w`, which a test changes as it goes.
function world(on: On, over: Partial<World> = {}) {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on)
  const w: World = { forks: [], fork: () => answered(300_000), model: MODEL, settings: ON, limits: 10, usage: usage(0, 300_000), ...over }
  on('settings.read', () => ({ value: w.settings as Record<string, unknown> }))
  on('session.model', () => ({ value: w.model }))
  on('session.id', () => ({ value: 's1' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 300_000, window: 1_000_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: w.limits }, { kind: 'seven_day', percentUsed: w.limits }],
    },
  }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: 'done', toolUses: [], stopReason: 'end_turn' as const, usage: w.usage }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.compact', () => ({ messages: [] }))
  on('model.fork', async () => {
    w.forks.push(clock.now())
    await w.during?.()
    return { value: w.fork(w.forks.length) }
  })
  return { clock, w }
}

// One turn of the person's on the main thread: one request that answers with `u`.
async function turn($: Engine, w: World, u: TurnUsage, n: number) {
  const turnId = `t${n}`
  w.usage = u
  await $.turn.start({ text: 'go', turnId })
  const stream = $.turn.step({ turnId, index: 0, model: MODEL, messageCount: 2 })
  for await (const _ of stream);
  await stream.result
  await $.turn.complete({ turnId, answer: 'done', durationMs: 1, isAborted: false, usage: u, reason: 'answer' })
}

test('off by default: no ping, however long the pause', async ($, on) => {
  const { clock, w } = world(on, { settings: {} })
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(10 * H)
  expect(w.forks).toEqual([])
})

test('on: a ping 6 minutes before each hour runs out, 4 a pause, then none', async ($, on) => {
  const { clock, w } = world(on)
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(10 * H)
  expect(w.forks).toEqual([54 * MIN, 108 * MIN, 162 * MIN, 216 * MIN])
})

test('a ping that finds the cache cold ends the pings', async ($, on) => {
  const { clock, w } = world(on, { fork: () => answered(10_000, 290_000) })
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(10 * H)
  expect(w.forks).toEqual([54 * MIN])
})

test('what is not known or not worth it gets no ping: a 5-minute cache, a small context, a write with no lifetime', async ($, on) => {
  const { clock, w } = world(on)
  await turn($, w, usage(0, 300_000, '5m'), 1)
  await clock.advance(2 * H)
  await turn($, w, usage(0, 150_000), 2)
  await clock.advance(2 * H)
  await turn($, w, { input_tokens: 5, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 300_000, model: MODEL }, 3)
  await clock.advance(2 * H)
  expect(w.forks).toEqual([])
})

test('a model changed since the last request, or plan limits at 80%, stop the ping', async ($, on) => {
  const { clock, w } = world(on)
  await turn($, w, usage(0, 300_000), 1)
  w.model = 'claude-sonnet-5-5'
  await clock.advance(2 * H)
  expect(w.forks).toEqual([])
  w.model = MODEL
  w.limits = 85
  await turn($, w, usage(0, 300_000), 2)
  await clock.advance(2 * H)
  expect(w.forks).toEqual([])
})

test('the person typing cancels the timer; their next turn starts the pause again', async ($, on) => {
  const { clock, w } = world(on)
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(50 * MIN)
  await $.prompt.submit({ text: 'next', wait: false, origin: { kind: 'composer' } })
  await clock.advance(10 * MIN)
  expect(w.forks).toEqual([])
  await turn($, w, usage(300_000), 2)
  await clock.advance(60 * MIN)
  expect(w.forks).toEqual([114 * MIN])
})

test('a rate limit stops the pings; an overloaded API is tried once more, in time', async ($, on) => {
  const { clock, w } = world(on, { fork: () => ({ isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage: usage(0) }) })
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(10 * H)
  expect(w.forks).toEqual([54 * MIN])
  w.forks = []
  w.fork = n => (n === 1 ? { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: usage(0) } : answered(300_000))
  await turn($, w, usage(0, 300_000), 2)
  const at = clock.now()
  await clock.advance(2 * H)
  expect(w.forks.slice(0, 3)).toEqual([at + 54 * MIN, at + 54 * MIN + 45_000, at + 54 * MIN + 45_000 + 54 * MIN])
})

test('while the pings keep the cache, Claude Code’s idle compaction is skipped', async ($, on) => {
  const { clock, w } = world(on)
  await turn($, w, usage(0, 300_000), 1)
  await clock.advance(55 * MIN)
  const r = await $.session.compact({ trigger: 'auto', messages: [] })
  expect(r.skip).toBe('tokendoctor keeps the prompt cache warm instead')
})

test('a fork whose own request runs through the turn hooks is not taken for the person', async ($, on) => {
  const { clock, w } = world(on)
  // While the fork answers, the engine runs its request through the turn hooks, as one might.
  w.during = async () => {
    const turnId = `f${w.forks.length}`
    await $.turn.start({ text: 'ping', turnId })
    const stream = $.turn.step({ turnId, index: 0, model: MODEL, messageCount: 3 })
    for await (const _ of stream);
    await stream.result
    await $.turn.complete({ turnId, answer: 'ok', durationMs: 1, isAborted: false, usage: usage(300_000), reason: 'answer' })
  }
  await turn($, w, usage(0, 300_000), 1)
  w.usage = usage(300_000)
  await clock.advance(10 * H)
  expect(w.forks).toEqual([54 * MIN, 108 * MIN, 162 * MIN, 216 * MIN])
})
