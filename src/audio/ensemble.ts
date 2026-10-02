// Ensemble expansion: one visible performer = a voice group. Each member gets a
// fixed (seeded) small timing / gain offset, so the same seed always sounds the
// same, and size = 1 / spread = 0 stays fully deterministic for tests.

import type { EnsembleProfile } from '../domain/rhythm'

export type EnsembleMember = {
  memberIndex: number
  /** Seconds added to the base event time. Never negative, <= timingSpreadMs. */
  timeOffsetSeconds: number
  /** Multiplier applied to the event gain. */
  gainMultiplier: number
}

/** Small seeded PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildEnsemble(profile: EnsembleProfile): EnsembleMember[] {
  const size = Math.max(1, Math.floor(profile.size))
  const rng = createRng(profile.seed)
  // Loudness: members share the performer's level instead of stacking it.
  const share = 1 / Math.sqrt(size)
  const members: EnsembleMember[] = []
  for (let i = 0; i < size; i++) {
    const t = rng()
    const g = rng()
    const first = i === 0
    members.push({
      memberIndex: i,
      // Member 0 stays on the grid; the others trail it by up to the spread.
      timeOffsetSeconds: first ? 0 : (t * profile.timingSpreadMs) / 1000,
      gainMultiplier: share * (1 - g * profile.gainSpread),
    })
  }
  return members
}
