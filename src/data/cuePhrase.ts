// Cue phrases (docs/cue-model.md). Each cue is 2 beats of call + 2 beats of
// response. Kept as data so phrases can be revised without touching the engine.

import type { BeatCell } from '../domain/rhythm'

export type CueKind = 'call' | 'break'

type Timing = { offsetSubtick: number; durationSubticks: number; accent: number }

const ev = (offsetSubtick: number, durationSubticks: number, accent: number): Timing => ({
  offsetSubtick,
  durationSubticks,
  accent,
})

/**
 * Every joined, audible voice in unison. Enters on the off-beat (subtick 6 of
 * the first response beat) and ends with a pick-up into the next downbeat.
 * Offsets only: each voice answers with its own sample (pung / cak-short).
 */
const RESPONSE: readonly (readonly Timing[])[] = [
  [ev(6, 2, 1)],
  [ev(0, 2, 1), ev(6, 2, 1), ev(9, 2, 1)],
]

export type CueDef = {
  label: string
  /** Juru Klempung alone. */
  call: readonly BeatCell[]
  /** Unison answer from every audible voice. */
  response: readonly (readonly Timing[])[]
}

export const CUES: Record<CueKind, CueDef> = {
  // A sustained "caaak" call with a pung under it, then a pung and a short
  // pick-up: audible on a phone speaker.
  call: {
    label: 'CUE',
    call: [
      [
        { ...ev(0, 12, 1), sampleId: 'cak-long' },
        { ...ev(0, 3, 1), sampleId: 'pung' },
        { ...ev(6, 3, 0.9), sampleId: 'pung' },
      ],
      [
        { ...ev(0, 3, 1), sampleId: 'pung' },
        { ...ev(6, 2, 1), sampleId: 'cak-short' },
      ],
    ],
    response: RESPONSE,
  },
  // Conductor-controlled transition: everything stops except a soft pung, one full beat of silence,
  // then the same unison answer.
  break: {
    label: 'BREAK',
    call: [[{ ...ev(0, 3, 0.6), sampleId: 'pung' }], []],
    response: RESPONSE,
  },
}

export const CUE_BEATS = 4
export const CUE_CALL_BEATS = 2
