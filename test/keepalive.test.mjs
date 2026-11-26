import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KEEPALIVE as K, learn, outcome, pingAt, pingsFor, refuse, replay, ttlOf, warm } from '../lib/keepalive.mjs'

const H = 3_600_000
const MIN = 60_000

test('the decay: 4 pings from the start, 2 to 6 as the score moves, one more in a session the person keeps', () => {
  assert.equal(pingsFor(1), 4)
  assert.equal(pingsFor(K.s0Min), 2)
  assert.equal(pingsFor(K.s0Max), 6)
  assert.equal(pingsFor(1, true), 5)
  assert.equal(pingsFor(K.s0Max, true), K.maxPerPause)
  assert.equal(pingsFor(0), 0)
})

test('the score rises after a kept pause, falls after a lost one, and stays in its bounds', () => {
  assert.equal(learn(1, 'kept'), 1.5)
  assert.equal(learn(1, 'wasted'), 0.93)
  assert.equal(learn(K.s0Max, 'kept'), K.s0Max)
  assert.equal(learn(K.s0Min, 'wasted'), K.s0Min)
  assert.equal(learn(2, null), 2)
  assert.equal(learn(Number.NaN, null), K.start)
})

test('a ping is due 6 minutes before the hour runs out', () => {
  assert.equal(pingAt(0), 54 * MIN)
})

// A pause where everything is known and the cache is warm: the one case a ping may go.
const safe = { now: 54 * MIN, at: 0, ttl: '1h', prefix: 300_000, running: false, pinged: 0, allowed: 4, recent: { hour: 0, day: 0 }, quota: 10 }

test('a ping goes only when every fact is known and says the cache is warm', () => {
  assert.equal(refuse(safe), null)
  assert.equal(refuse({ ...safe, quota: 0 }), null, 'an API key has no plan windows')
  const no = (change, why) => assert.match(String(refuse({ ...safe, ...change })), why, JSON.stringify(change))
  no({ at: undefined }, /not known/)
  no({ at: 60 * MIN }, /not known/) // a request in the future: the clock is not to be trusted
  no({ now: Number.NaN }, /not known/)
  no({ ttl: null }, /lifetime is not known/)
  no({ ttl: '5m' }, /5 minutes/)
  no({ prefix: 199_999 }, /under 200K/)
  no({ prefix: undefined }, /under 200K/)
  no({ running: true }, /turn is running/)
  no({ pinged: 4 }, /used up/)
  no({ now: 58 * MIN }, /may already be cold/)
  no({ now: 3 * H }, /may already be cold/) // a timer that fired after the laptop slept
  no({ now: 52 * MIN }, /too early/)
  no({ recent: undefined }, /not known/)
  no({ recent: { hour: 3, day: 3 } }, /last hour/)
  no({ recent: { hour: 0, day: 30 } }, /last day/)
  no({ quota: undefined }, /could not be read/)
  no({ quota: 80 }, /80% used/)
})

test('the lifetime comes from the write; a read keeps it; anything else is not known', () => {
  assert.equal(ttlOf({ cache_creation_input_tokens: 5, ephemeral_1h_input_tokens: 5 }, null), '1h')
  assert.equal(ttlOf({ cache_creation_input_tokens: 5, ephemeral_5m_input_tokens: 5 }, '1h'), '5m')
  assert.equal(ttlOf({ cache_read_input_tokens: 9, cache_creation_input_tokens: 0 }, '1h'), '1h')
  assert.equal(ttlOf({ cache_creation_input_tokens: 5 }, '1h'), null, 'a write with no lifetime named')
  assert.equal(ttlOf({ input_tokens: 5 }, '1h'), null, 'nothing cached at all')
  assert.equal(ttlOf(undefined, '1h'), '1h', 'no response: nothing learned')
})

test('a ping is warm when it wrote back only a short tail, as Claude Code does on every request', () => {
  assert.ok(warm({ cache_read_input_tokens: 290_000, cache_creation_input_tokens: 10_000 }, 300_000))
  assert.ok(warm({ cache_read_input_tokens: 270_000, cache_creation_input_tokens: 30_000 }, 300_000))
  // Measured live on Sonnet 5.5: a fork of a 22K conversation read 14,166 and wrote 7,714 back.
  assert.ok(warm({ cache_read_input_tokens: 14_166, cache_creation_input_tokens: 7_714 }, 21_877))
  assert.ok(!warm({ cache_read_input_tokens: 260_000, cache_creation_input_tokens: 40_000 }, 300_000))
  assert.ok(!warm({ cache_read_input_tokens: 20_000, cache_creation_input_tokens: 280_000 }, 300_000))
  assert.ok(!warm({ cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, 300_000), 'nothing read')
  assert.ok(!warm({ cache_read_input_tokens: 290_000 }, 300_000), 'the write not reported')
  assert.ok(!warm(undefined, 300_000))
})

test('how a pause ended: kept, lost, or nothing to learn', () => {
  const p = { realAt: 0, warmUntil: 54 * MIN + H }
  assert.equal(outcome({ ...p, pinged: 0, now: 2 * H }), null)
  assert.equal(outcome({ ...p, pinged: 1, now: 58 * MIN }), null, 'back within the hour: the cache was warm anyway')
  assert.equal(outcome({ ...p, pinged: 1, now: 90 * MIN }), 'kept')
  assert.equal(outcome({ ...p, pinged: 1, now: 3 * H }), 'wasted')
  assert.equal(outcome({ ...p, pinged: 2, now: Number.NaN }), 'wasted', 'the session ended')
})

// Opus 5.5 per token: read, 1-hour write, output.
const rates = { read: 0.2e-6, w1: 8e-6, output: 20e-6 }
const pause = (over) => ({ at: 0, session: 'a', prefix: 300_000, ttl1h: true, gap: 2 * H, rewritten: 300_000, rates, ...over })

test('replay: a pause the pings keep saves the rewrite and costs its pings', () => {
  const r = replay([pause()], 10 * H)
  assert.equal(r.kept, 1)
  assert.equal(r.pings, 2) // at 54 and 108 minutes; back at 120
  assert.ok(Math.abs(r.savedUsd - 300_000 * (8e-6 - 0.2e-6)) < 1e-9)
  assert.ok(r.netUsd > 2 && r.netUsd < r.savedUsd)
  assert.equal(r.s0, 1.5)
})

test('replay: what the setting would not touch is left out, and a pause no one came back to is lost', () => {
  const r = replay([pause({ ttl1h: false }), pause({ prefix: 100_000 }), pause({ gap: 30 * MIN }), pause({ gap: null, at: 9.5 * H })], 10 * H)
  assert.equal(r.pauses, 0, 'a 5-minute cache, a small context, a short pause, a session maybe still open')
  const lost = replay([pause({ gap: null })], 10 * H)
  assert.equal(lost.wasted, 1)
  assert.equal(lost.pings, 4)
  assert.equal(lost.savedUsd, 0)
  assert.equal(lost.s0, 0.93)
})

test('replay learns in time order: lost pauses shorten the next, a kept session earns one ping more', () => {
  const lost = Array.from({ length: 20 }, (_, i) => pause({ at: i * 10 * H, session: `s${i}`, gap: null }))
  assert.equal(replay(lost, 1000 * H).s0, K.s0Min)
  const kept = replay([pause({ at: 0 }), pause({ at: 10 * H, gap: 5 * H })], 100 * H)
  // The second pause is the same session's: 1.5 x 2 = 3 gives 6 pings, enough to reach 5 hours.
  assert.equal(kept.kept, 2)
})
