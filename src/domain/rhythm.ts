export const SUBTICKS_PER_BEAT = 12 as const

export type SampleId =
  | 'cak-short'
  | 'cak-long'
  | 'pung'
  | 'sir'
  | 'yang'
  | 'nger'
  | 'ngur'

export type VocalEvent = {
  offsetSubtick: number
  durationSubticks: number
  sampleId: SampleId
  accent: number
}

export type BeatCell = readonly VocalEvent[]

export type VoicePattern = {
  beats: readonly BeatCell[]
}

export type EnsembleProfile = {
  size: number
  timingSpreadMs: number
  gainSpread: number
  seed: number
}

export type Performer = {
  id: string
  pattern: VoicePattern
  rotationBeats: number
  joined: boolean
  muted: boolean
  volume: number
  ensemble: EnsembleProfile
}

export function assertVocalEvent(event: VocalEvent): void {
  if (!Number.isInteger(event.offsetSubtick)) {
    throw new Error('offsetSubtick must be an integer')
  }

  if (
    event.offsetSubtick < 0 ||
    event.offsetSubtick >= SUBTICKS_PER_BEAT
  ) {
    throw new Error(
      `offsetSubtick must be between 0 and ${SUBTICKS_PER_BEAT - 1}`,
    )
  }

  if (
    !Number.isInteger(event.durationSubticks) ||
    event.durationSubticks < 1
  ) {
    throw new Error('durationSubticks must be an integer >= 1')
  }

  if (event.accent < 0 || event.accent > 1) {
    throw new Error('accent must be between 0 and 1')
  }
}

export function assertVoicePattern(pattern: VoicePattern): void {
  if (pattern.beats.length < 1) {
    throw new Error('pattern must contain at least one beat')
  }

  for (const beat of pattern.beats) {
    for (const event of beat) {
      assertVocalEvent(event)
    }
  }
}
