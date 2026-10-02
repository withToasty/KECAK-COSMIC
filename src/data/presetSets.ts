// Selectable arrangements of the eight voices. Both use the same roles,
// ensembles and seats; only the BeatCell patterns differ, so they can be
// A/B-listened (docs/implementation-plan.md step 10).

import type { BeatCell, VocalEvent, VoicePattern } from '../domain/rhythm'
import { CAK_LONG } from './gestureLibrary'
import { KECAK_PRESETS, presetPattern, type KecakPreset } from './kecakPresets'
import { STAGE_PRESETS } from './stagePresets'

export type PresetSet = {
  id: 'legacy' | 'gesture' | 'stage'
  label: string
  description: string
  presets: readonly KecakPreset[]
}

const short = (offsetSubtick: number): VocalEvent => ({
  offsetSubtick,
  durationSubticks: 2,
  sampleId: 'cak-short',
  accent: 1,
})
const cell = (...offsets: number[]): BeatCell => offsets.map(short)

const legacy = (id: string): VoicePattern =>
  presetPattern(KECAK_PRESETS.find((p) => p.id === id)!)

const beatsOf = (id: string) => legacy(id).beats

/**
 * Arrangement draft built from the legacy parts: sustained "caaak" on the
 * first beat of Besik Polos and Cak Lima Polos, and a fill (triple / late
 * double) on the last beat of each Cak Telu part. This is an arrangement for
 * listening, not a source transcription.
 */
const GESTURE_PATTERNS: Record<string, VoicePattern> = {
  'besik-polos': { beats: [CAK_LONG, cell(0), cell(0), cell(0)] },
  'besik-sangsih': { beats: [cell(6), cell(6), cell(6), cell(6, 9)] },
  'telu-polos': { beats: [...beatsOf('telu-polos'), ...beatsOf('telu-polos').slice(0, 1), cell(0, 4, 8)] },
  'telu-sanglot': { beats: [...beatsOf('telu-sanglot'), ...beatsOf('telu-sanglot').slice(0, 1), cell(3, 9)] },
  'telu-sangsih': { beats: [...beatsOf('telu-sangsih'), ...beatsOf('telu-sangsih').slice(0, 1), cell(2, 6, 10)] },
  'lima-polos': { beats: [CAK_LONG, cell(0), cell(0), cell(0, 6)] },
}

const gesturePresets: readonly KecakPreset[] = KECAK_PRESETS.map((p) =>
  GESTURE_PATTERNS[p.id]
    ? {
        ...p,
        pattern: GESTURE_PATTERNS[p.id],
        sourceNote: `${p.sourceNote} Gesture arrangement draft (long / double / triple), not a source transcription.`,
        transcriptionStatus: 'needs-verification' as const,
      }
    : p,
)

export const PRESET_SETS: readonly PresetSet[] = [
  {
    id: 'legacy',
    label: 'Legacy',
    description: '旧パターンを移行しただけの短い声。すべて単発',
    presets: KECAK_PRESETS,
  },
  {
    id: 'gesture',
    label: 'Gesture',
    description: '長音「チャーー」、2連、3連、裏の2連を入れた編成案',
    presets: gesturePresets,
  },
  {
    id: 'stage',
    label: 'Stage 4',
    description: '舞台の説明板から読み取った4パターン(Cak Lima / Cak Nem / Penyanglot と基本の刻み)と、Sirrr / Pung',
    presets: STAGE_PRESETS,
  },
]

/** Every preset voice across all sets, for labels and descriptions. */
export const ALL_PRESETS: readonly KecakPreset[] = PRESET_SETS.flatMap((s) => s.presets)

export const findPreset = (id: string): KecakPreset | undefined =>
  ALL_PRESETS.find((p) => p.id === id)

export const DEFAULT_PRESET_SET = PRESET_SETS[0]
