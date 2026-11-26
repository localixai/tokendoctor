// Keeping the prompt cache warm through a pause (tokendoctor.keepalive): shortly before the one-hour
// cache of the main conversation expires, a one-word fork of the conversation ($.model.fork) reads it
// from the cache, and a cache read starts its hour again. A pause longer than the hour otherwise
// writes the whole context again on the next message, at 2x the input price; a ping reads it at the
// model's cache-read price, 0.025x to 0.1x.
//
// Pure: the hooks module (hooks/keepalive.ts) and the replay of past sessions (lib/sessions.mjs) both
// decide with these functions, so what /tokendoctor:sessions says a setting would have done is what
// the setting does.

const MIN = 60_000

export const KEEPALIVE = {
  /** Only the one-hour cache: a 5-minute one leaves no room for a safe margin. */
  ttlMs: 60 * MIN,
  /**
   * A ping goes 6 minutes before the cache expires. The hour counts from the start of the request
   * that last read or wrote it, and `at` is taken just before that request is sent, so the true
   * expiry is never earlier than the one computed. Six minutes leaves room for one retry and for a
   * timer that fires a little late, and pings about 1.1 times an hour.
   */
  leadMs: 6 * MIN,
  /** No ping starts later than 2 minutes before expiry: past that the cache may be gone. */
  cutoffMs: 2 * MIN,
  /** A timer that fires this much before its time is not trusted either. */
  earlyMs: 1 * MIN,
  /** One retry after an overloaded API or a lost connection, if it still starts before the cutoff. */
  retryMs: 45_000,
  /**
   * Contexts under 200K are not kept: on the sessions measured, pauses with less came back once in
   * 25, and a rebuild of a small context costs little.
   */
  minTokens: 200_000,
  /**
   * A ping counts as warm only if it wrote back little: at most a tenth of the context, or 16K where
   * that is more. Every request of Claude Code's writes a short tail anew even on a warm cache (what
   * it adds to the last message each turn; 7.7K measured on Sonnet 5.5, 2026-11-26), so the fork
   * never reads the whole context; on a cold one it writes nearly all of it.
   */
  maxWriteShare: 0.1,
  minWriteSlack: 16_000,
  // The decay: a pause starts with the score `s0`, each ping halves it, and pings go on while it is at
  // least `floor`. s0 = 1 gives 4 pings, which keep the cache warm 4.6 h; on the sessions measured
  // almost no one came back after the 4th ping.
  decay: 0.5,
  floor: 0.1,
  start: 1,
  s0Min: 0.25, // 2 pings
  s0Max: 4, // 6 pings
  // A pause the pings kept warm raises s0, one they did not lowers it. A kept pause saves 1.9x to 1.975x
  // the context; a lost one costs its 4 pings, 0.1x to 0.4x by the model's read price. So one kept pause
  // is worth 5 to 20 lost ones; s0 settles where they balance at ln 1.5 / ln (1 / 0.93) = 5.6, the
  // cautious end.
  up: 1.5,
  down: 0.93,
  /** A session the person already came back to after a long pause gets one ping more. */
  longLived: 2,
  maxPerPause: 6,
  /** Across every session on the machine. */
  maxPerHour: 3,
  maxPerDay: 30,
  /** No ping when the plan's 5-hour or weekly window is this full. */
  quotaStop: 80,
  /** What a ping asks; a fork has no tools, and the answer is a word. */
  prompt: 'This is an automatic keep-alive request, not a task. Reply with the single word "ok". Do not think it over and do not use tools.',
}

/** Pings allowed in a pause that starts with score `s0`. */
export function pingsFor(s0, longLived = false) {
  let s = s0 * (longLived ? KEEPALIVE.longLived : 1)
  let n = 0
  while (s >= KEEPALIVE.floor && n < KEEPALIVE.maxPerPause) {
    n++
    s *= KEEPALIVE.decay
  }
  return n
}

/** The score after a pause: `kept` when the pings kept it warm, `wasted` when they did not. */
export function learn(s0, outcome) {
  const s = Number.isFinite(s0) ? s0 : KEEPALIVE.start
  if (outcome === 'kept') return Math.min(KEEPALIVE.s0Max, s * KEEPALIVE.up)
  if (outcome === 'wasted') return Math.max(KEEPALIVE.s0Min, s * KEEPALIVE.down)
  return Math.min(KEEPALIVE.s0Max, Math.max(KEEPALIVE.s0Min, s))
}

/** When the next ping is due, for a cache last read or written by a request sent at `at`. */
export const pingAt = (at) => at + KEEPALIVE.ttlMs - KEEPALIVE.leadMs

/**
 * Why no ping may go now, or null when one may. Anything not known for sure is a reason: a ping on a
 * cache that has gone cold writes the whole context again for nothing.
 *
 * `at`: when the request that last read or wrote the cache was sent (ms); `ttl`: the lifetime its
 * last write had ('1h', '5m', or null when not reported); `prefix`: the tokens it holds; `running`:
 * a turn is under way; `pinged` and `allowed`: this pause's pings so far and its share; `recent`:
 * the machine's pings in the last hour and day; `quota`: the fullest plan window in percent, 0 when
 * there is none (an API key), undefined when it could not be read.
 */
export function refuse({ now, at, ttl, prefix, running, pinged, allowed, recent, quota }) {
  if (!Number.isFinite(now) || !Number.isFinite(at) || at > now) return 'the time of the last request is not known'
  if (ttl !== '1h') return ttl === '5m' ? 'the cache lives 5 minutes' : 'the cache lifetime is not known'
  if (!Number.isFinite(prefix) || prefix < KEEPALIVE.minTokens) return 'the context is under 200K'
  if (running) return 'a turn is running'
  if (!(pinged < allowed)) return 'the pings of this pause are used up'
  if (now >= at + KEEPALIVE.ttlMs - KEEPALIVE.cutoffMs) return 'the cache may already be cold'
  if (now < pingAt(at) - KEEPALIVE.earlyMs) return 'too early'
  if (!recent || !Number.isFinite(recent.hour) || !Number.isFinite(recent.day)) return 'the recent pings are not known'
  if (recent.hour >= KEEPALIVE.maxPerHour) return `${KEEPALIVE.maxPerHour} pings in the last hour`
  if (recent.day >= KEEPALIVE.maxPerDay) return `${KEEPALIVE.maxPerDay} pings in the last day`
  if (!Number.isFinite(quota)) return 'the plan usage could not be read'
  if (quota >= KEEPALIVE.quotaStop) return `the plan is ${KEEPALIVE.quotaStop}% used`
  return null
}

/** The TTL a response's usage shows it wrote with, or `keep` when it wrote nothing (a read keeps the lifetime). */
export function ttlOf(usage, keep) {
  if (!usage) return keep
  if ((usage.ephemeral_1h_input_tokens ?? 0) > 0) return '1h'
  if ((usage.ephemeral_5m_input_tokens ?? 0) > 0) return '5m'
  // Written with no lifetime named, or nothing read or written: not known.
  if ((usage.cache_creation_input_tokens ?? 0) > 0) return null
  return (usage.cache_read_input_tokens ?? 0) > 0 ? keep : null
}

/** The tokens a request carried, as the cache holds them. */
export const prefixOf = (usage) =>
  (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0)

/** Whether a ping found the cache warm: it read from it, and wrote back no more than a short tail. */
export const warm = (usage, prefix) =>
  (usage?.cache_read_input_tokens ?? 0) > 0 &&
  Number.isFinite(usage?.cache_creation_input_tokens) &&
  usage.cache_creation_input_tokens <= Math.max(KEEPALIVE.maxWriteShare * prefix, KEEPALIVE.minWriteSlack)

/**
 * How a pause ended, for the score: `kept` when the person came back after the hour and the pings
 * had kept the cache warm, `wasted` when there were pings and the cache was cold by then (or never
 * came back), null when no ping went or the cache would have been warm anyway.
 */
export function outcome({ pinged, now, realAt, warmUntil }) {
  if (!pinged) return null
  if (!Number.isFinite(now)) return 'wasted'
  if (now < realAt + KEEPALIVE.ttlMs) return null
  return now < warmUntil ? 'kept' : 'wasted'
}

/**
 * What the setting would have done over past pauses, the score learned in time order as the hooks
 * learn it (the per-hour and per-day caps are left out: they only lower both sides).
 *
 * Each pause: `{ at, session, prefix, ttl1h, gap, rewritten, rates: { read, w1, output } }`, `gap`
 * the ms to the next main-thread request or null when the session ended there, `rewritten` the
 * tokens of the old context the next request wrote again. `now` leaves out the last pause of a
 * session that may still be open.
 */
export function replay(pauses, now = Date.now()) {
  const P = KEEPALIVE.ttlMs - KEEPALIVE.leadMs
  const out = { pauses: 0, kept: 0, wasted: 0, early: 0, pings: 0, savedUsd: 0, pingUsd: 0, netUsd: 0, s0: KEEPALIVE.start }
  const long = new Set()
  let s0 = KEEPALIVE.start
  for (const p of [...pauses].sort((a, b) => a.at - b.at)) {
    if (!p.ttl1h || !(p.prefix >= KEEPALIVE.minTokens) || !p.rates) continue
    if (p.gap === null && now - p.at < KEEPALIVE.ttlMs) continue
    if (p.gap !== null && p.gap <= P) continue
    out.pauses++
    const allowed = pingsFor(s0, long.has(p.session))
    const sent = p.gap === null ? allowed : Math.min(allowed, Math.ceil(p.gap / P) - 1)
    out.pings += sent
    // A ping: the context read from the cache, the prompt, and a short answer (100 tokens, thinking included).
    out.pingUsd += sent * (p.prefix * p.rates.read + 80 * p.rates.read * 10 + 100 * p.rates.output)
    if (p.gap !== null) long.add(p.session)
    const end = outcome({ pinged: sent, now: p.gap === null ? NaN : p.gap, realAt: 0, warmUntil: sent * P + KEEPALIVE.ttlMs })
    if (end === 'kept') {
      out.kept++
      out.savedUsd += p.rewritten * (p.rates.w1 - p.rates.read)
    }
    if (end === 'wasted') out.wasted++
    // Back within the hour: the ping went, but the cache was warm without it.
    if (end === null) out.early++
    s0 = learn(s0, end)
  }
  out.s0 = s0
  out.netUsd = out.savedUsd - out.pingUsd
  return out
}
