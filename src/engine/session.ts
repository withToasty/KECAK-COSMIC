import { KECAK_PRESETS, presetPattern, type KecakPreset } from '../data/kecakPresets'
import type { Performer } from '../domain/rhythm'
import { TEMPO_DEFAULT, TEMPO_MAX, TEMPO_MIN, type Session } from './types'

export function createPerformer(preset: KecakPreset): Performer {
  return {
    id: preset.id,
    entry: preset.entry,
    name: preset.displayName,
    role: preset.role,
    pattern: presetPattern(preset),
    rotationBeats: 0,
    joined: preset.entry === 1,
    muted: false,
    volume: preset.defaultVolume,
    ensemble: preset.ensemble,
  }
}

export function createSession(
  presets: readonly KecakPreset[] = KECAK_PRESETS,
  presetSet = 'legacy',
): Session {
  return {
    tempoBpm: TEMPO_DEFAULT,
    pendingTempoBpm: null,
    globalBeat: 0,
    playing: false,
    cue: 'idle',
    presetSet,
    performers: presets.map(createPerformer),
  }
}

export function clampTempo(bpm: number): number {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(bpm)))
}

export function joinedCount(session: Session): number {
  return session.performers.filter((p) => p.joined).length
}
