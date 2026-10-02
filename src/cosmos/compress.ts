// The COSMIC MODE rules. Every rule is a pure function so the translation from
// data to sound can be stated, tested and read (docs/cosmic-model.md).
//
//   real period --(one ratio-preserving compression)--> period in beats
//   period in beats --> one sound each time the orbit completes a revolution
//   rank of the period --> pitch (log scale, pentatonic)

import type { CosmicBody } from './bodies'

/** Period of every body in beats, keeping the real period ratios exactly. */
export function periodsInBeats(
  bodies: readonly CosmicBody[],
  fastestBeats: number,
): Map<string, number> {
  const fastest = Math.min(...bodies.map((b) => b.realPeriodSeconds))
  return new Map(
    bodies.map((b) => [b.id, (fastestBeats * b.realPeriodSeconds) / fastest]),
  )
}

/** How much real time one beat stands for. */
export function realSecondsPerBeat(
  bodies: readonly CosmicBody[],
  fastestBeats: number,
): number {
  return Math.min(...bodies.map((b) => b.realPeriodSeconds)) / fastestBeats
}

/**
 * Sound times (in beats from the start of beat `beat`, each in [0, 1)) of a body
 * with the given period. `phase` (0..1) is how much of its first revolution the
 * body has already completed at beat 0: with 0 it sounds at beat 0 (all bodies
 * start in step); with a real configuration its first sound comes after the
 * remaining (1 - phase) of a revolution.
 */
export function eventOffsetsInBeat(periodBeats: number, beat: number, phase = 0): number[] {
  const first = Math.ceil(beat / periodBeats + phase - 1e-9)
  const out: number[] = []
  for (let k = first; ; k++) {
    const t = (k - phase) * periodBeats - beat
    if (t >= 1 - 1e-9) break
    out.push(Math.max(0, t))
  }
  return out
}

/** Fraction (0..1) of the current revolution at fractional beat position `pos`. */
export function orbitFraction(pos: number, periodBeats: number, phase = 0): number {
  const f = (pos / periodBeats + phase) % 1
  return f < 0 ? f + 1 : f
}

// --- pitch ---------------------------------------------------------------------

const PENTATONIC = [0, 2, 4, 7, 9] // C major pentatonic, semitones
const BASE_HZ = 130.8128 // C3
const DEGREES = 15 // three octaves of the scale
const semitonesOf = (degree: number) =>
  PENTATONIC[degree % 5] + 12 * Math.floor(degree / 5)

/**
 * Pitch from the rank of the period on a log scale: the fastest body gets the
 * highest note, the slowest the lowest. Always on a pentatonic scale, so any
 * combination of bodies stays consonant.
 */
export function pitchHz(realPeriodSeconds: number, allPeriods: readonly number[]): number {
  const lo = Math.log(Math.min(...allPeriods))
  const hi = Math.log(Math.max(...allPeriods))
  const x = hi === lo ? 1 : (hi - Math.log(realPeriodSeconds)) / (hi - lo) // 1 = fastest
  const degree = Math.round(x * (DEGREES - 1))
  return BASE_HZ * 2 ** (semitonesOf(degree) / 12)
}

// --- alignment -----------------------------------------------------------------

/**
 * The first moment (in beats, after the start) at which every body is again
 * within `tolerance` of the start of a revolution, i.e. all of them sound
 * (nearly) together. `phases` are the starting fractions (default: all 0).
 * Null when that does not happen within `maxBeats`.
 */
export function nextRealignment(
  periodBeats: readonly number[],
  maxBeats: number,
  tolerance = 0.03,
  phases: readonly number[] = periodBeats.map(() => 0),
): number | null {
  if (periodBeats.length < 2) return null
  const lead = periodBeats.indexOf(Math.min(...periodBeats))
  const nearZero = (f: number) => Math.min(f, 1 - f) <= tolerance
  // Candidate moments: every time the fastest body completes a revolution.
  for (let k = 1; ; k++) {
    const t = (k - phases[lead]) * periodBeats[lead]
    if (t > maxBeats) return null
    if (t <= 0) continue
    const aligned = periodBeats.every((p, i) => nearZero((((t / p + phases[i]) % 1) + 1) % 1))
    if (aligned) return t
  }
}

// --- display -------------------------------------------------------------------

export function formatDuration(seconds: number): string {
  const min = seconds / 60
  const hour = min / 60
  const day = hour / 24
  const year = day / 365.25
  const f = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2))
  if (seconds < 90) return `${f(seconds)} 秒`
  if (min < 90) return `${f(min)} 分`
  if (hour < 48) return `${f(hour)} 時間`
  if (day < 730) return `${f(day)} 日`
  return `${f(year)} 年`
}
