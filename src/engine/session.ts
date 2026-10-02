import { KECAK_PRESETS, type KecakPreset } from '../data/kecakPresets'
import {
  CUE_CALL,
  CUE_CALL_ACCENT,
  CUE_RESPONSE,
  CUE_RESPONSE_ACCENT,
} from '../data/cuePhrase'
import {
  TEMPO_DEFAULT,
  TEMPO_MAX,
  TEMPO_MIN,
  type Hit,
  type Performer,
  type Session,
} from './types'

export function parsePattern(pattern: string): Hit[] {
  return [...pattern].map((c) => ({ on: c === '1', accent: 1 }))
}

export function createPerformer(preset: KecakPreset): Performer {
  return {
    id: preset.id,
    entry: preset.entry,
    name: preset.displayName,
    kecakPart: preset.kecakPart,
    role: preset.role,
    voice: preset.voice,
    pattern: parsePattern(preset.pattern),
    rotation: 0,
    joined: preset.entry === 1,
    muted: false,
    volume: preset.defaultVolume,
    groupSize: 1,
  }
}

export function createSession(
  presets: readonly KecakPreset[] = KECAK_PRESETS,
): Session {
  return {
    tempoBpm: TEMPO_DEFAULT,
    pendingTempoBpm: null,
    globalPulse: 0,
    playing: false,
    cue: 'idle',
    performers: presets.map(createPerformer),
  }
}

export function clampTempo(bpm: number): number {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(bpm)))
}

export function patternPosition(p: Performer, globalPulse: number): number {
  const len = p.pattern.length
  return (((globalPulse + p.rotation) % len) + len) % len
}

export type PulseHit = { performer: Performer; position: number; hit: Hit }

/** Which performers sound at `globalPulse`. */
export function hitsAtPulse(
  performers: readonly Performer[],
  globalPulse: number,
): PulseHit[] {
  const out: PulseHit[] = []
  for (const performer of performers) {
    const position = patternPosition(performer, globalPulse)
    const hit = performer.pattern[position]
    if (performer.joined && !performer.muted && hit.on) {
      out.push({ performer, position, hit })
    }
  }
  return out
}

export function joinedCount(session: Session): number {
  return session.performers.filter((p) => p.joined).length
}

/** One full cue cycle: call + response (16 pulses). */
export const CUE_LENGTH = CUE_CALL.length + CUE_RESPONSE.length

/** Hits for pulse `rel` (0-based) of a running cue. */
export function cueHitsAt(
  performers: readonly Performer[],
  rel: number,
  globalPulse: number,
): PulseHit[] {
  const inCall = rel < CUE_CALL.length
  const phrase = inCall ? CUE_CALL : CUE_RESPONSE
  const idx = inCall ? rel : rel - CUE_CALL.length
  if (phrase[idx] !== '1') return []
  const accent = inCall ? CUE_CALL_ACCENT : CUE_RESPONSE_ACCENT
  return performers
    .filter(
      (p) =>
        p.joined && !p.muted && (!inCall || p.role === 'beat-keeper'),
    )
    .map((performer) => ({
      performer,
      position: patternPosition(performer, globalPulse),
      hit: { on: true, accent },
    }))
}
