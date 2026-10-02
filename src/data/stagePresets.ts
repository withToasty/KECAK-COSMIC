// "Stage 4": the four rhythm patterns shown on a stage explainer board
// (photo supplied by the project owner), read by eye onto a 16-column grid:
// 4 beats x 4 columns, header "Sirrr / Pung / Pung / Pung" over the four beats.
//
// Column -> subtick uses the same mapping as the legacy 4-grid (q0..q3 ->
// 0, 3, 6, 9). This is NOT an academic transcription and it is a different
// part set from the Besik / Telu / Lima preset. See docs/stage-board.md.

import type { VoicePattern } from '../domain/rhythm'
import type { EnsembleProfile } from '../domain/rhythm'
import type { KecakPreset } from './kecakPresets'

const BOARD_NOTE =
  'Stage explainer board (photo), read by eye onto a 16-column grid; not a scholarly source.'

const SOLO: EnsembleProfile = { size: 1, timingSpreadMs: 0, gainSpread: 0, seed: 1 }
const group = (seed: number): EnsembleProfile => ({
  size: 4,
  timingSpreadMs: 14,
  gainSpread: 0.08,
  seed,
})

/** Board columns (0-15) that carry a dot, per pattern. */
export const BOARD_COLUMNS = {
  pnyacha: [0, 2, 4, 6, 8, 10, 12],
  lima: [2, 5, 8, 11, 14],
  nem: [0, 3, 6, 9, 12, 14],
  pnyanglot: [1, 4, 7, 10, 13, 15],
} as const

const grid = (columns: readonly number[]) =>
  Array.from({ length: 16 }, (_, i) => (columns.includes(i) ? '1' : '0')).join('')

/** Tambur: "Sirrr" on the first beat, then Pung on each of the next three. */
const TAMBUR: VoicePattern = {
  beats: [
    [{ offsetSubtick: 0, durationSubticks: 12, sampleId: 'sir', accent: 1 }],
    [{ offsetSubtick: 0, durationSubticks: 3, sampleId: 'pung', accent: 1 }],
    [{ offsetSubtick: 0, durationSubticks: 3, sampleId: 'pung', accent: 1 }],
    [{ offsetSubtick: 0, durationSubticks: 3, sampleId: 'pung', accent: 1 }],
  ],
}

export const STAGE_PRESETS: readonly KecakPreset[] = [
  {
    id: 'stage-tambur',
    entry: 1,
    displayName: 'Tambur (Sirrr / Pung)',
    shortLabel: 'TB',
    role: 'beat-keeper',
    legacyGrid: '1000100010001000',
    pattern: TAMBUR,
    defaultVolume: 1,
    ensemble: SOLO,
    description: '4拍で一周。最初の拍が「Sirrr」、続く3拍が「Pung」',
    sourceNote: `${BOARD_NOTE} Header row: Sirrr, Pung, Pung, Pung.`,
    transcriptionStatus: 'stage-board',
  },
  {
    id: 'stage-pnyacha',
    entry: 2,
    displayName: 'Pnyacha (プニャチャ)',
    shortLabel: 'PC',
    role: 'pola',
    legacyGrid: grid(BOARD_COLUMNS.pnyacha),
    defaultVolume: 1,
    ensemble: group(501),
    description: '1マス置きに刻む基本のパターン(0, 2, 4 … 12 マス目)',
    sourceNote: `${BOARD_NOTE} Pattern ①: columns 0,2,4,6,8,10,12. The meaning of the name is not confirmed.`,
    transcriptionStatus: 'stage-board',
  },
  {
    id: 'stage-lima',
    entry: 3,
    displayName: 'Cak Lima (チャクリマ)',
    shortLabel: 'CL',
    role: 'pola',
    legacyGrid: grid(BOARD_COLUMNS.lima),
    defaultVolume: 1,
    ensemble: group(502),
    description: '5つ。3マス間隔で、2・5・8・11・14 マス目',
    sourceNote: `${BOARD_NOTE} Pattern ②: columns 2,5,8,11,14.`,
    transcriptionStatus: 'stage-board',
  },
  {
    id: 'stage-nem',
    entry: 4,
    displayName: 'Cak Nem (チャクナム)',
    shortLabel: 'CN',
    role: 'pola',
    legacyGrid: grid(BOARD_COLUMNS.nem),
    defaultVolume: 1,
    ensemble: group(503),
    description: '6つ。3マス間隔で、最後だけ2マス(0・3・6・9・12・14 マス目)',
    sourceNote: `${BOARD_NOTE} Pattern ③: columns 0,3,6,9,12,14.`,
    transcriptionStatus: 'stage-board',
  },
  {
    id: 'stage-pnyanglot',
    entry: 5,
    displayName: 'Penyanglot (プニャンロット)',
    shortLabel: 'PL',
    role: 'sanglot',
    legacyGrid: grid(BOARD_COLUMNS.pnyanglot),
    defaultVolume: 1,
    ensemble: group(504),
    description: 'Cak Nem を1マス後ろにずらした形で、その隙間を埋める',
    sourceNote: `${BOARD_NOTE} Pattern ④: columns 1,4,7,10,13,15 (pattern ③ shifted by one column).`,
    transcriptionStatus: 'stage-board',
  },
]
