// Arrangement <-> share code. The code is `k1.` + base64url(JSON). Decoding
// validates every field (type, range, count) and throws on anything unexpected,
// because codes arrive from pasted text and URLs.

import {
  assertVoicePattern,
  SUBTICKS_PER_BEAT,
  type BeatCell,
  type Performer,
  type Role,
  type SampleId,
} from '../domain/rhythm'
import {
  clampEnsemble,
  clampTempo,
  normalizeRotation,
} from '../engine/session'
import {
  MAX_BEATS,
  MAX_EVENTS_PER_BEAT,
  MAX_PERFORMERS,
  type Dynamics,
  type Session,
} from '../engine/types'

export const SHARE_PREFIX = 'k1.'

export type Arrangement = {
  tempoBpm: number
  dynamics: Dynamics
  performers: Performer[]
}

const SAMPLE_TO_CODE: Partial<Record<SampleId, string>> = {
  'cak-short': 's',
  'cak-long': 'l',
  pung: 'p',
  sir: 'r',
}
const CODE_TO_SAMPLE: Record<string, SampleId> = {
  s: 'cak-short',
  l: 'cak-long',
  p: 'pung',
  r: 'sir',
}
const ROLES: readonly Role[] = ['beat-keeper', 'polos', 'sangsih', 'sanglot', 'pola', 'custom']
const MAX_CODE_LENGTH = 40_000

export function encodeArrangement(session: Session): string {
  const data = {
    v: 1,
    t: session.tempoBpm,
    d: session.dynamics === 'soft' ? 's' : 'l',
    p: session.performers.map((p) => ({
      i: p.id,
      n: p.name,
      r: p.role,
      b: p.pattern.beats.map((cell) =>
        cell.map((e) => [e.offsetSubtick, e.durationSubticks, SAMPLE_TO_CODE[e.sampleId] ?? 's', e.accent]),
      ),
      o: p.rotationBeats,
      v: p.volume,
      m: p.muted ? 1 : 0,
      s: p.solo ? 1 : 0,
      j: p.joined ? 1 : 0,
      c: p.custom ? 1 : 0,
      e: [p.ensemble.size, p.ensemble.timingSpreadMs, p.ensemble.gainSpread, p.ensemble.seed],
    })),
  }
  return SHARE_PREFIX + toBase64Url(JSON.stringify(data))
}

export function decodeArrangement(code: string): Arrangement {
  const trimmed = code.trim()
  if (!trimmed.startsWith(SHARE_PREFIX)) throw new Error('not a KECAK-COSMIC share code')
  if (trimmed.length > MAX_CODE_LENGTH) throw new Error('share code is too long')
  let raw: unknown
  try {
    raw = JSON.parse(fromBase64Url(trimmed.slice(SHARE_PREFIX.length)))
  } catch {
    throw new Error('share code is damaged')
  }
  const d = obj(raw, 'code')
  if (d.v !== 1) throw new Error('unsupported share code version')
  const list = arr(d.p, 'voices')
  if (list.length < 1 || list.length > MAX_PERFORMERS) {
    throw new Error(`a share code needs 1-${MAX_PERFORMERS} voices`)
  }
  const ids = new Set<string>()
  const performers = list.map((item, index): Performer => {
    const p = obj(item, 'voice')
    const id = str(p.i, 'id', 40)
    if (ids.has(id)) throw new Error('duplicate voice id')
    ids.add(id)
    const role = str(p.r, 'role', 20) as Role
    if (!ROLES.includes(role)) throw new Error('unknown role')
    const beats = arr(p.b, 'beats')
    if (beats.length < 1 || beats.length > MAX_BEATS) {
      throw new Error(`a voice needs 1-${MAX_BEATS} beats`)
    }
    const pattern = {
      beats: beats.map((cell): BeatCell => {
        const events = arr(cell, 'beat')
        if (events.length > MAX_EVENTS_PER_BEAT) throw new Error('too many events in a beat')
        return events.map((ev) => {
          const [o, du, sc, a] = arr(ev, 'event')
          const sampleId = CODE_TO_SAMPLE[str(sc, 'sample', 1)]
          if (!sampleId) throw new Error('unknown sample')
          return {
            offsetSubtick: int(o, 0, SUBTICKS_PER_BEAT - 1, 'offset'),
            durationSubticks: int(du, 1, SUBTICKS_PER_BEAT * MAX_BEATS, 'duration'),
            sampleId,
            accent: num(a, 0, 1, 'accent'),
          }
        })
      }),
    }
    assertVoicePattern(pattern)
    const e = arr(p.e, 'ensemble')
    return {
      id,
      entry: index + 1,
      name: str(p.n, 'name', 40),
      role,
      pattern,
      rotationBeats: normalizeRotation(int(p.o, -1000, 1000, 'rotation'), pattern.beats.length),
      joined: p.j === 1,
      muted: p.m === 1,
      solo: p.s === 1,
      ...(p.c === 1 ? { custom: true } : {}),
      volume: num(p.v, 0, 1, 'volume'),
      ensemble: clampEnsemble({
        size: num(e[0], 1, 64, 'ensemble size'),
        timingSpreadMs: num(e[1], 0, 1000, 'timing spread'),
        gainSpread: num(e[2], 0, 1, 'gain spread'),
        seed: num(e[3], 0, 4294967295, 'seed'),
      }),
    }
  })
  return {
    tempoBpm: clampTempo(num(d.t, 1, 1000, 'tempo')),
    dynamics: d.d === 's' ? 'soft' : 'loud',
    performers,
  }
}

// --- validation helpers -------------------------------------------------------

function obj(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`${what}: expected an object`)
  return v as Record<string, unknown>
}
function arr(v: unknown, what: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${what}: expected a list`)
  return v
}
function str(v: unknown, what: string, max: number): string {
  if (typeof v !== 'string' || v.length > max) throw new Error(`${what}: expected short text`)
  return v
}
function num(v: unknown, min: number, max: number, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new Error(`${what}: out of range`)
  }
  return v
}
function int(v: unknown, min: number, max: number, what: string): number {
  const n = num(v, min, max, what)
  if (!Number.isInteger(n)) throw new Error(`${what}: expected an integer`)
  return n
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)
  const bin = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
