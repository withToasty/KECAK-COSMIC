// Cue phrase (docs/cue-model.md). One cue cycle = CALL + RESPONSE pulses.
// Kept as data so the phrase can be revised without touching engine logic.

export const CUE_CALL = '10101000' // Juru Klempung alone
export const CUE_RESPONSE = '10101011' // every joined, unmuted voice in unison

export const CUE_CALL_ACCENT = 0.9
export const CUE_RESPONSE_ACCENT = 1
