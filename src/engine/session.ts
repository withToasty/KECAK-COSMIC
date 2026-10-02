import { KECAK_PRESETS, type KecakPreset } from '../data/kecakPresets'
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
