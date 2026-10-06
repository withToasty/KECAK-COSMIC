// Per-sample analysis, run once when a buffer is loaded.
//
// Recorded samples usually start with a little silence (and MP3 adds an encoder
// delay the browser does not remove), so a hit scheduled at time t would be
// heard late, and by a different amount for each recording. Sounding the start
// of the *audible* part exactly at t keeps every sample on the grid. Levels also
// differ between recordings and the synthesized placeholders, so each sample
// gets a trim that brings its audible part to a common level.

/** Fraction of the peak that counts as "the sound has started". */
export const ONSET_THRESHOLD = 0.1
/** Start playback this long before the detected onset, so the attack is not cut. */
export const ONSET_PREROLL_SECONDS = 0.003
/** Loudness (RMS of the audible part, dBFS) every sample is trimmed towards. */
export const TARGET_RMS_DB = -20
/** Trims never move a sample by more than this. */
export const MAX_TRIM_DB = 12

const WINDOW_SECONDS = 0.005
/** A window counts as audible when its RMS exceeds this fraction of the peak. */
const AUDIBLE_RMS_FRACTION = 0.05

export type SampleInfo = {
  /** Seconds into the buffer at which playback should begin. */
  onsetSeconds: number
  /** Gain (dB) that brings the audible part to TARGET_RMS_DB. */
  trimDb: number
}

function peakOf(data: ArrayLike<number>): number {
  let peak = 0
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  return peak
}

/**
 * Time (seconds) to start playback from: the first sample above ONSET_THRESHOLD
 * of the peak, minus a short pre-roll. 0 for silence or an immediate start.
 */
export function detectOnset(
  data: ArrayLike<number>,
  sampleRate: number,
  threshold = ONSET_THRESHOLD,
  prerollSeconds = ONSET_PREROLL_SECONDS,
): number {
  const peak = peakOf(data)
  if (peak === 0) return 0
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > threshold * peak) {
      return Math.max(0, i / sampleRate - prerollSeconds)
    }
  }
  return 0
}

/** RMS (linear) over the audible 5 ms windows; 0 for silence. */
export function audibleRms(data: ArrayLike<number>, sampleRate: number): number {
  const peak = peakOf(data)
  if (peak === 0) return 0
  const win = Math.max(1, Math.floor(sampleRate * WINDOW_SECONDS))
  let sum = 0
  let count = 0
  for (let start = 0; start + win <= data.length; start += win) {
    let s = 0
    for (let k = 0; k < win; k++) s += data[start + k] * data[start + k]
    const rms = Math.sqrt(s / win)
    if (rms > AUDIBLE_RMS_FRACTION * peak) {
      sum += s / win
      count++
    }
  }
  return count === 0 ? 0 : Math.sqrt(sum / count)
}

/** Trim (dB) from a linear RMS: towards the target, within +/- MAX_TRIM_DB. */
export function trimFor(rms: number, targetDb = TARGET_RMS_DB, maxDb = MAX_TRIM_DB): number {
  if (rms <= 0) return 0
  const db = targetDb - 20 * Math.log10(rms)
  return Math.max(-maxDb, Math.min(maxDb, db))
}

export function analyze(data: ArrayLike<number>, sampleRate: number): SampleInfo {
  return {
    onsetSeconds: detectOnset(data, sampleRate),
    trimDb: trimFor(audibleRms(data, sampleRate)),
  }
}
