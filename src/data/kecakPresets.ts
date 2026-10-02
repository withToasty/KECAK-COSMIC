// Kecak preset patterns (M0). Patterns live here, not in engine/UI code, so
// transcriptions can be revised without touching scheduler logic.
// See docs/kecak-rhythm-model.md for the source-based abstraction.

import type { KecakPart, Role, Voice } from '../engine/types'

export type TranscriptionStatus = 'source-based' | 'needs-verification'

export type KecakPreset = {
  id: string
  entry: number
  displayName: string
  shortLabel: string
  kecakPart: KecakPart
  role: Role
  voice: Voice
  /** `1` = hit, `0` = rest. One character per internal pulse. */
  pattern: string
  defaultVolume: number
  description: string
  sourceNote: string
  transcriptionStatus: TranscriptionStatus
}

const STEPPUTAT_2021 =
  'Stepputat, The Kecak and Cultural Tourism on Bali, ch.1 (2021/2022)'

export const KECAK_PRESETS: readonly KecakPreset[] = [
  {
    id: 'klempung',
    entry: 1,
    displayName: 'Juru Klempung',
    shortLabel: 'JK',
    kecakPart: 'klempung',
    role: 'beat-keeper',
    voice: 'pung',
    pattern: '1000',
    defaultVolume: 1,
    description: '1拍ごとに pung を発声し、pulse の基準を保つ',
    sourceNote: `Regular pung on every klempung beat (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'besik-polos',
    entry: 2,
    displayName: 'Cak Besik — Polos',
    shortLabel: 'BP',
    kecakPart: 'besik-polos',
    role: 'polos',
    voice: 'cak',
    pattern: '1000',
    defaultVolume: 1,
    description: '拍の頭に入る on-beat の声',
    sourceNote: `Cak besik, on-beat side (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'besik-sangsih',
    entry: 3,
    displayName: 'Cak Besik — Sangsih',
    shortLabel: 'BS',
    kecakPart: 'besik-sangsih',
    role: 'sangsih',
    voice: 'cak',
    pattern: '0010',
    defaultVolume: 1,
    description: 'Polos の裏に入り、拍の中間を埋める',
    sourceNote: `Cak besik, off-beat side (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'telu-polos',
    entry: 4,
    displayName: 'Cak Telu — Polos',
    shortLabel: 'TP',
    kecakPart: 'telu-polos',
    role: 'polos',
    voice: 'cak',
    pattern: '00100101',
    defaultVolume: 1,
    description: '3声 interlock の基準側の声',
    sourceNote: `Cak telu, polos (${STEPPUTAT_2021}). Overlap with sanglot at pulse 5 should be re-checked against the source.`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'telu-sanglot',
    entry: 5,
    displayName: 'Cak Telu — Sanglot',
    shortLabel: 'TL',
    kecakPart: 'telu-sanglot',
    role: 'sanglot',
    voice: 'cak',
    pattern: '10010100',
    defaultVolume: 1,
    description: 'Polos と Sangsih の間を埋める、3声 interlock の中央パート',
    sourceNote: `Cak telu, sanglot (${STEPPUTAT_2021}). Overlap with polos at pulse 5 should be re-checked against the source.`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'telu-sangsih',
    entry: 6,
    displayName: 'Cak Telu — Sangsih',
    shortLabel: 'TS',
    kecakPart: 'telu-sangsih',
    role: 'sangsih',
    voice: 'cak',
    pattern: '01001010',
    defaultVolume: 1,
    description: '3声 interlock の裏側を埋める声',
    sourceNote: `Cak telu, sangsih (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'source-based',
  },
  {
    id: 'lima-polos',
    entry: 7,
    displayName: 'Cak Lima — Polos',
    shortLabel: 'LP',
    kecakPart: 'lima-polos',
    role: 'polos',
    voice: 'cak',
    pattern: '1000100010001010',
    defaultVolume: 1,
    description: '4拍(16 pulse)で一周する、より長い周期の基準側',
    sourceNote: `Cak lima, polos; Stepputat transcription mapped onto the 4-pulse grid (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'needs-verification',
  },
  {
    id: 'lima-sangsih',
    entry: 8,
    displayName: 'Cak Lima — Sangsih',
    shortLabel: 'LS',
    kecakPart: 'lima-sangsih',
    role: 'sangsih',
    voice: 'cak',
    pattern: '0010001000100101',
    defaultVolume: 1,
    description: 'Lima Polos を補い、周期の終わりで密度を上げる',
    sourceNote: `Cak lima, sangsih; Stepputat transcription mapped onto the 4-pulse grid (${STEPPUTAT_2021}).`,
    transcriptionStatus: 'needs-verification',
  },
]
