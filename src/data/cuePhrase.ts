// Cue phrase (docs/cue-model.md). One cue cycle = CALL + RESPONSE pulses.
// Kept as data so the phrase can be revised without touching engine logic.

export const CUE_CALL = '10101000' // Juru Klempung alone
export const CUE_RESPONSE = '00101011' // every joined, unmuted voice in unison, entering on the off-beat (pulse 2)

/** A cue may start on any klempung-beat boundary (4 pulses), keeping the wait short. */
export const CUE_START_GRID = 4

export const CUE_CALL_ACCENT = 0.9
export const CUE_RESPONSE_ACCENT = 1
