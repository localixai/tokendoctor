import type { EngineInterface, On, SessionCompactInput, Timer } from 'claude-code'
import { KEEPALIVE as K, learn, outcome, pingAt, pingsFor, prefixOf, refuse, ttlOf, warm } from '../lib/keepalive.mjs'

// Keeps the main conversation's one-hour prompt cache warm through a pause (tokendoctor.keepalive;
// lib/keepalive.mjs has the numbers and the reasons). A ping goes only when every fact `refuse` asks
// for is known and says the cache is warm; anything unknown, and the first ping that finds the cache
// cold, ends the pings until the person's next request.
//
// register.ts registers these hooks, and calls keepaliveForget and keepaliveCompact from its own
// session.start and session.compact (an event takes one hook per module), the compaction ahead of the slide.

/** The score the decay starts from, learned from every pause on the machine. */
const SCORE = 'keepalive.s0'
/** The machine's pings of the last day, every session's: `{ at, session, read, write, warm }`. */
const LOG = 'keepalive.pings'
const DAY = 24 * 3_600_000
const USER_ID = 'tokendoctor@tokendoctor'

type Ttl = '1h' | '5m' | null
/** What the cache holds: when the request that last read or wrote it was sent, its lifetime, its size. */
type Cache = { at: number; ttl: Ttl; prefix: number; model: string }
/** The pause since the person's last request: pings sent and allowed, and until when the cache is warm. */
type Pause = { realAt: number; pinged: number; allowed: number; warmUntil: number; stopped?: string }
type Ping = { at: number; session: string; read: number; write: number; warm: boolean }

// The state of the session the module runs in; registerKeepalive starts it afresh at each load.
let cache: Cache | null = null
let ttl: Ttl = null
let pause: Pause | null = null
let timer: Timer | null = null
let running = false
let longLived = false
// Bumped by every request of the person's: a ping answered after one is not trusted.
let generation = 0
// While a ping is in flight: the fork's own request, if the engine runs it through the turn hooks,
// is not the person's and changes nothing here. The person's prompt (prompt.submit, which no fork
// has) bumps `generation`, and from then on what the turn hooks see is theirs again.
let forking = false
let forkGeneration = -1
function inPing() {
  return forking && generation === forkGeneration
}

function cancel() {
  timer?.cancel()
  timer = null
}
function forget() {
  cancel()
  cache = null
  ttl = null
  pause = null
}
// Read from the settings before every ping, so turning it off stops the next one.
async function isOn($: EngineInterface) {
  return enabled($).catch(() => false)
}

async function schedule($: EngineInterface) {
  cancel()
  if (running || !cache || cache.ttl !== '1h' || cache.prefix < K.minTokens || !(await isOn($))) return
  pause ??= { realAt: cache.at, pinged: 0, allowed: pingsFor(await score($), longLived), warmUntil: cache.at + K.ttlMs }
  if (pause.stopped || pause.pinged >= pause.allowed) return
  const wait = Math.max(0, pingAt(cache.at) - (await $.clock.now()))
  timer = $.clock.after(wait, () => void ping($, false).catch(() => pause && (pause.stopped = 'error')))
}

async function ping($: EngineInterface, retry: boolean) {
  timer = null
  const c = cache
  const p = pause
  const gen = generation
  if (!c || !p || p.stopped || !(await isOn($))) return
  const now = await $.clock.now()
  const model = await $.session.model().catch(() => undefined)
  const why =
    model !== c.model
      ? 'the model changed or is not known'
      : refuse({ now, at: c.at, ttl: c.ttl, prefix: c.prefix, running, pinged: p.pinged, allowed: p.allowed, recent: await recent($, now), quota: await quota($) })
  if (why) return void (p.stopped = why)
  // Taken before sending: the hour counts from the request's start, never earlier than this.
  const sent = await $.clock.now()
  forking = true
  forkGeneration = gen
  const r = await $.model.fork({ prompt: K.prompt }).finally(() => (forking = false))
  // The person's own request came meanwhile and renewed the cache itself.
  if (gen !== generation || cache !== c || pause !== p) return
  const usage = 'usage' in r ? r.usage : undefined
  const reached = usage && usage.cache_read_input_tokens + usage.cache_creation_input_tokens > 0
  if (reached) {
    p.pinged++
    const ok = warm(usage, c.prefix)
    await record($, { at: sent, session: await $.session.id().catch(() => ''), read: usage.cache_read_input_tokens, write: usage.cache_creation_input_tokens, warm: ok })
    if (!ok) return void (p.stopped = 'a ping found the cache cold')
    cache = { ...c, at: sent }
    p.warmUntil = sent + K.ttlMs
    return schedule($)
  }
  // Overloaded or no connection: once more, if it still starts in time (refuse checks that again).
  const again = !r.isAnswered && r.reason === 'api-error' && (r.status === 529 || r.status === null)
  if (again && !retry) {
    timer = $.clock.after(K.retryMs, () => void ping($, true).catch(() => pause && (pause.stopped = 'error')))
    return
  }
  p.stopped = r.isAnswered ? 'no usage reported' : r.reason
}

// The pause ends: the score learns how it went, and a session the person comes back to after a long
// pause counts as one they keep.
async function settle($: EngineInterface, now: number) {
  const p = pause
  pause = null
  if (!p) return
  if (now - p.realAt >= K.ttlMs - K.leadMs) longLived = true
  const end = outcome({ pinged: p.pinged, now, realAt: p.realAt, warmUntil: p.warmUntil })
  if (end) await $.store.set(SCORE, learn(await score($), end)).catch(() => {})
}


/** The hooks that follow the main thread's requests and the person's prompts. */
export function registerKeepalive(on: On) {
  forget()
  running = false
  longLived = false
  generation = 0
  forking = false
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && !inPing()) {
      running = true
      cancel()
      await settle($, await $.clock.now()).catch(() => {})
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined || inPing()) return yield* next(e)
    generation++
    const at = await $.clock.now()
    const model = await $.session.model().catch(() => '')
    const r = yield* next(e)
    if (r.usage) {
      ttl = ttlOf(r.usage, ttl)
      cache = { at, ttl, prefix: prefixOf(r.usage), model }
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && !inPing()) {
      running = false
      await schedule($).catch(() => {})
    }
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    generation++
    cancel()
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const p = pause
    forget()
    if (p) await settle($, NaN).catch(() => {})
    return next(e)
  })
}

/** A new conversation, a resume or a /clear (register.ts's session.start): nothing is known of its cache. */
export function keepaliveForget() {
  forget()
}

/**
 * Before Claude Code compacts (register.ts's session.compact, ahead of the slide): Claude Code's idle
 * compaction is skipped while the pings keep the cache; any other compaction rewrites the conversation,
 * so its old cache is forgotten.
 */
export async function keepaliveCompact($: EngineInterface, e: SessionCompactInput): Promise<{ skip: string } | null> {
  // A summary computed ahead of time changes nothing yet.
  if (e.agentId !== undefined || e.trigger === 'precompute') return null
  // Idle compaction comes while no turn runs, shortly before the cache expires; while the pings keep
  // the cache, it would only shrink a conversation that is cheap to read.
  const keeping = pause && !pause.stopped && pause.pinged < pause.allowed
  if (!running && e.trigger === 'auto' && keeping && (await isOn($))) return { skip: 'tokendoctor keeps the prompt cache warm instead' }
  forget()
  return null
}

async function enabled($: EngineInterface) {
  const s = (await $.settings.read()) as { pluginConfigs?: Record<string, { options?: Record<string, unknown> }> }
  return s.pluginConfigs?.[USER_ID]?.options?.keepalive === true
}

async function score($: EngineInterface) {
  const v = Number(await $.store.get(SCORE).catch(() => undefined))
  return learn(Number.isFinite(v) && v > 0 ? v : K.start, null)
}

/** The machine's pings in the last hour and day; undefined when the log cannot be read. */
async function recent($: EngineInterface, now: number) {
  try {
    const log = ((await $.store.get(LOG)) ?? []) as Ping[]
    if (!Array.isArray(log)) return undefined
    return { hour: log.filter(x => x.at > now - K.ttlMs).length, day: log.filter(x => x.at > now - DAY).length }
  } catch {
    return undefined
  }
}

async function record($: EngineInterface, entry: Ping) {
  const log = ((await $.store.get(LOG).catch(() => [])) ?? []) as Ping[]
  const kept = Array.isArray(log) ? log.filter(x => x.at > entry.at - DAY) : []
  await $.store.set(LOG, [...kept, entry]).catch(() => {})
}

/** The fullest plan window in percent, 0 with none (an API key), undefined when usage cannot be read. */
async function quota($: EngineInterface) {
  try {
    const usage = await $.session.usage()
    return Math.max(0, ...usage.rateLimits.filter(l => l.kind === 'five_hour' || l.kind === 'seven_day').map(l => l.percentUsed))
  } catch {
    return undefined
  }
}
