// Cue phrase (docs/cue-model.md): 2 beats of call + 2 beats of response.
// Kept as data so the phrase can be revised without touching engine logic.

import type { BeatCell } from '../domain/rhythm'

const ev = (offsetSubtick: number, durationSubticks: number, accent: number) =>
  ({ offsetSubtick, durationSubticks, accent })

/** Juru Klempung alone: pung on beat, on the half, then on the next beat. */
export const CUE_CALL: readonly BeatCell[] = [
  [
    { ...ev(0, 3, 0.9), sampleId: 'pung' },
    { ...ev(6, 3, 0.9), sampleId: 'pung' },
  ],
  [{ ...ev(0, 3, 0.9), sampleId: 'pung' }],
]

/**
 * Every joined, unmuted voice in unison. Enters on the off-beat (subtick 6 of
 * the first response beat) and ends with a pick-up into the next downbeat.
 * Offsets only: each voice answers with its own sample (pung / cak-short).
 */
export const CUE_RESPONSE: readonly (readonly { offsetSubtick: number; durationSubticks: number; accent: number }[])[] = [
  [ev(6, 2, 1)],
  [ev(0, 2, 1), ev(6, 2, 1), ev(9, 2, 1)],
]

export const CUE_BEATS = CUE_CALL.length + CUE_RESPONSE.length
