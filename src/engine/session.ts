import { KECAK_PRESETS, presetPattern, type KecakPreset } from '../data/kecakPresets'
import type { EnsembleProfile, Performer, VoicePattern } from '../domain/rhythm'
import {
  MAX_BEATS,
  MAX_ENSEMBLE,
  TEMPO_DEFAULT,
  TEMPO_MAX,
  TEMPO_MIN,
  type Session,
} from './types'

export function createPerformer(preset: KecakPreset): Performer {
  return {
    id: preset.id,
    entry: preset.entry,
    name: preset.displayName,
    role: preset.role,
    pattern: presetPattern(preset),
    rotationBeats: 0,
    joined: false,
    muted: false,
    solo: false,
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
    cueKind: null,
    dynamics: 'loud',
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

/** Audible = joined, not muted, and (if any voice is solo) solo. */
export function audiblePerformers(performers: readonly Performer[]): Performer[] {
  const joined = performers.filter((p) => p.joined && !p.muted)
  const anySolo = performers.some((p) => p.joined && p.solo)
  return anySolo ? joined.filter((p) => p.solo) : joined
}

/** A fresh one-beat voice: a single short cak on the beat. */
export function createCustomPerformer(index: number, existingIds: readonly string[]): Performer {
  let n = index
  while (existingIds.includes(`custom-${n}`)) n++
  return {
    id: `custom-${n}`,
    entry: index,
    name: `Voice ${n}`,
    role: 'custom',
    pattern: {
      beats: [[{ offsetSubtick: 0, durationSubticks: 2, sampleId: 'cak-short', accent: 1 }]],
    },
    rotationBeats: 0,
    joined: true,
    muted: false,
    solo: false,
    custom: true,
    volume: 1,
    ensemble: { size: 4, timingSpreadMs: 14, gainSpread: 0.08, seed: 900 + n },
  }
}

export function clampEnsemble(e: EnsembleProfile): EnsembleProfile {
  const size = Math.min(MAX_ENSEMBLE, Math.max(1, Math.round(e.size)))
  return {
    size,
    timingSpreadMs: Math.min(40, Math.max(0, e.timingSpreadMs)),
    gainSpread: Math.min(0.3, Math.max(0, e.gainSpread)),
    seed: Math.round(e.seed) >>> 0,
  }
}

export const normalizeRotation = (rotation: number, beats: number) =>
  ((Math.round(rotation) % beats) + beats) % beats

/** Pattern must stay within the editor limits. */
export function clampPattern(pattern: VoicePattern): VoicePattern {
  const beats = pattern.beats.slice(0, MAX_BEATS)
  return { beats: beats.length > 0 ? beats : [[]] }
}
