import {
  type SampleId,
  type VoicePattern,
  SUBTICKS_PER_BEAT,
} from './rhythm'

const LEGACY_POSITIONS_PER_BEAT = 4
const LEGACY_TO_SUBTICK = [0, 3, 6, 9] as const

export type LegacyMigrationOptions = {
  sampleId?: SampleId
  durationSubticks?: number
  accent?: number
}

export function migrateLegacyPattern(
  bits: readonly number[],
  options: LegacyMigrationOptions = {},
): VoicePattern {
  if (bits.length === 0) {
    throw new Error('legacy pattern must not be empty')
  }

  if (bits.length % LEGACY_POSITIONS_PER_BEAT !== 0) {
    throw new Error(
      'legacy pattern length must be divisible by 4',
    )
  }

  for (const bit of bits) {
    if (bit !== 0 && bit !== 1) {
      throw new Error('legacy pattern may contain only 0 or 1')
    }
  }

  const sampleId = options.sampleId ?? 'cak-short'
  const durationSubticks = options.durationSubticks ?? 2
  const accent = options.accent ?? 1

  const beats = []

  for (
    let start = 0;
    start < bits.length;
    start += LEGACY_POSITIONS_PER_BEAT
  ) {
    const beat = []

    for (
      let q = 0;
      q < LEGACY_POSITIONS_PER_BEAT;
      q += 1
    ) {
      if (bits[start + q] === 1) {
        beat.push({
          offsetSubtick: LEGACY_TO_SUBTICK[q],
          durationSubticks,
          sampleId,
          accent,
        })
      }
    }

    beats.push(beat)
  }

  return { beats }
}

export function legacyQuarterPositionToSubtick(
  quarterPosition: number,
): number {
  if (
    !Number.isInteger(quarterPosition) ||
    quarterPosition < 0 ||
    quarterPosition >= LEGACY_POSITIONS_PER_BEAT
  ) {
    throw new Error('quarterPosition must be 0, 1, 2, or 3')
  }

  return (
    quarterPosition *
    (SUBTICKS_PER_BEAT / LEGACY_POSITIONS_PER_BEAT)
  )
}
