// Types for lib/keepalive.mjs, as the hooks module uses it.
type Usage = {
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  ephemeral_5m_input_tokens?: number
  ephemeral_1h_input_tokens?: number
}
export const KEEPALIVE: {
  ttlMs: number
  leadMs: number
  cutoffMs: number
  earlyMs: number
  retryMs: number
  minTokens: number
  maxWriteShare: number
  minWriteSlack: number
  decay: number
  floor: number
  start: number
  s0Min: number
  s0Max: number
  up: number
  down: number
  longLived: number
  maxPerPause: number
  maxPerHour: number
  maxPerDay: number
  quotaStop: number
  prompt: string
}
export function pingsFor(s0: number, longLived?: boolean): number
export function learn(s0: number, outcome: 'kept' | 'wasted' | null): number
export function pingAt(at: number): number
export function refuse(f: {
  now: number
  at: number | undefined
  ttl: '1h' | '5m' | null
  prefix: number | undefined
  running: boolean
  pinged: number
  allowed: number
  recent: { hour: number; day: number } | undefined
  quota: number | undefined
}): string | null
export function ttlOf(usage: Usage | undefined, last: '1h' | '5m' | null): '1h' | '5m' | null
export function prefixOf(usage: Usage | undefined): number
export function warm(usage: Usage | undefined, prefix: number): boolean
export function outcome(p: { pinged: number; now: number; realAt: number; warmUntil: number }): 'kept' | 'wasted' | null
