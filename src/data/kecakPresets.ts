// Kecak presets (M0.1). Patterns live here, not in engine/UI code, so
// transcriptions can be revised without touching scheduler logic.
//
// The legacy 4-grid strings below are migration INPUT only. The runtime source
// of truth is the BeatCell / VocalEvent structure produced by
// migrateLegacyPattern (q0->0, q1->3, q2->6, q3->9 subticks).
// See docs/kecak-rhythm-model.md and docs/beat-gesture-model.md.

import type { EnsembleProfile, Role, VoicePattern } from '../domain/rhythm'
import { migrateLegacyPattern } from '../domain/migrateLegacyPattern'

export type TranscriptionStatus = 'source-based' | 'needs-verification'

export type KecakPreset = {
  id: string
  entry: number
  displayName: string
  shortLabel: string
  role: Role
  /** Legacy 0/1 grid, 4 characters per beat. Migration input only. */
  legacyGrid: string
  /** Explicit BeatCell pattern; takes precedence over legacyGrid. */
  pattern?: VoicePattern
  defaultVolume: number
  ensemble: EnsembleProfile
  description: string
  sourceNote: string
  transcriptionStatus: TranscriptionStatus
}

const STEPPUTAT_2021 =
  'Stepputat, The Kecak and Cultural Tourism on Bali, ch.1 (2021/2022)'

// A visible performer is a voice group. The beat keeper stays a single voice;
// the cak parts expand into a small group with tiny timing / gain differences.
const SOLO: EnsembleProfile = { size: 1, timingSpreadMs: 0, gainSpread: 0, seed: 1 }
const group = (seed: number): EnsembleProfile => ({
  size: 4,
  timingSpreadMs: 14,
  gainSpread: 0.08,
  seed,
})

export const KECAK_PRESETS: readonly KecakPreset[] = [
  {
    id: 'klempung',
    entry: 1,
    displayName: 'Juru Klempung',
    shortLabel: 'JK',
    role: 'beat-keeper',
    legacyGrid: '1000',
    defaultVolume: 1,
    ensemble: SOLO,
    description: '1拍ごとに pung を発声し、拍の基準を保つ',
    sourceNote: `Regular pung on every klempung beat (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'besik-polos',
    entry: 2,
    displayName: 'Cak Besik — Polos',
    shortLabel: 'BP',
    role: 'polos',
    legacyGrid: '1000',
    defaultVolume: 1,
    ensemble: group(201),
    description: '拍の頭に入る on-beat の声',
    sourceNote: `Cak besik, on-beat side (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'besik-sangsih',
    entry: 3,
    displayName: 'Cak Besik — Sangsih',
    shortLabel: 'BS',
    role: 'sangsih',
    legacyGrid: '0010',
    defaultVolume: 1,
    ensemble: group(202),
    description: 'Polos の裏に入り、拍の中間を埋める',
    sourceNote: `Cak besik, off-beat side (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'telu-polos',
    entry: 4,
    displayName: 'Cak Telu — Polos',
    shortLabel: 'TP',
    role: 'polos',
    legacyGrid: '00100101',
    defaultVolume: 1,
    ensemble: group(301),
    description: '3声 interlock の基準側の声',
    sourceNote: `Cak telu, polos (${STEPPUTAT_2021}). Overlap with sanglot at q5 should be re-checked against the source.`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'telu-sanglot',
    entry: 5,
    displayName: 'Cak Telu — Sanglot',
    shortLabel: 'TL',
    role: 'sanglot',
    legacyGrid: '10010100',
    defaultVolume: 1,
    ensemble: group(302),
    description: 'Polos と Sangsih の間を埋める、3声 interlock の中央パート',
    sourceNote: `Cak telu, sanglot (${STEPPUTAT_2021}). Overlap with polos at q5 should be re-checked against the source.`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'telu-sangsih',
    entry: 6,
    displayName: 'Cak Telu — Sangsih',
    shortLabel: 'TS',
    role: 'sangsih',
    legacyGrid: '01001010',
    defaultVolume: 1,
    ensemble: group(303),
    description: '3声 interlock の裏側を埋める声',
    sourceNote: `Cak telu, sangsih (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'lima-polos',
    entry: 7,
    displayName: 'Cak Lima — Polos',
    shortLabel: 'LP',
    role: 'polos',
    legacyGrid: '1000100010001010',
    defaultVolume: 1,
    ensemble: group(401),
    description: '4拍で一周する、より長い周期の基準側',
    sourceNote: `Cak lima, polos; Stepputat transcription mapped onto the 4-grid (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'lima-sangsih',
    entry: 8,
    displayName: 'Cak Lima — Sangsih',
    shortLabel: 'LS',
    role: 'sangsih',
    legacyGrid: '0010001000100101',
    defaultVolume: 1,
    ensemble: group(402),
    description: 'Lima Polos を補い、周期の終わりで密度を上げる',
    sourceNote: `Cak lima, sangsih; Stepputat transcription mapped onto the 4-grid (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'needs-verification',
  },
]

export function presetPattern(preset: KecakPreset): VoicePattern {
  if (preset.pattern) return preset.pattern
  const bits = [...preset.legacyGrid].map((c) => (c === '1' ? 1 : 0))
  return preset.role === 'beat-keeper'
    ? migrateLegacyPattern(bits, { sampleId: 'pung', durationSubticks: 3 })
    : migrateLegacyPattern(bits, { sampleId: 'cak-short', durationSubticks: 2 })
}
