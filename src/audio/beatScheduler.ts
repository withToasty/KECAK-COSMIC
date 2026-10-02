import {
  type Performer,
  type SampleId,
  SUBTICKS_PER_BEAT,
} from '../domain/rhythm'

export type ScheduledVocalEvent = {
  performerId: string
  sampleId: SampleId
  audioTime: number
  durationSeconds: number
  gain: number
  offsetSubtick: number
  /** Position of the event inside the performer's cycle, for visuals. */
  beatIndex: number
  eventIndex: number
}

export type CollectBeatEventsInput = {
  globalBeat: number
  beatTime: number
  tempoBpm: number
  performers: readonly Performer[]
}

export function collectBeatEvents({
  globalBeat,
  beatTime,
  tempoBpm,
  performers,
}: CollectBeatEventsInput): ScheduledVocalEvent[] {
  if (!Number.isFinite(tempoBpm) || tempoBpm <= 0) {
    throw new Error('tempoBpm must be > 0')
  }

  const secondsPerBeat = 60 / tempoBpm
  const secondsPerSubtick =
    secondsPerBeat / SUBTICKS_PER_BEAT

  const scheduled: ScheduledVocalEvent[] = []

  for (const performer of performers) {
    if (!performer.joined || performer.muted) {
      continue
    }

    const beatCount = performer.pattern.beats.length
    const beatIndex =
      positiveModulo(
        globalBeat + performer.rotationBeats,
        beatCount,
      )

    const beatCell = performer.pattern.beats[beatIndex]

    for (const [eventIndex, event] of beatCell.entries()) {
      scheduled.push({
        performerId: performer.id,
        sampleId: event.sampleId,
        audioTime:
          beatTime +
          event.offsetSubtick * secondsPerSubtick,
        durationSeconds:
          event.durationSubticks * secondsPerSubtick,
        gain: performer.volume * event.accent,
        offsetSubtick: event.offsetSubtick,
        beatIndex,
        eventIndex,
      })
    }
  }

  scheduled.sort((a, b) => {
    if (a.audioTime !== b.audioTime) {
      return a.audioTime - b.audioTime
    }

    return a.performerId.localeCompare(b.performerId)
  })

  return scheduled
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo
}
