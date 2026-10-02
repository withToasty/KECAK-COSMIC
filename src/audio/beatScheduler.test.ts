import { describe, expect, it } from 'vitest'
import { collectBeatEvents } from './beatScheduler'
import type { Performer } from '../domain/rhythm'
import {
  CAK_DOUBLE,
  CAK_LONG,
  CAK_TRIPLE,
} from '../data/gestureLibrary'
import { migrateLegacyPattern } from '../domain/migrateLegacyPattern'

const ensemble = {
  size: 1,
  timingSpreadMs: 0,
  gainSpread: 0,
  seed: 1,
}

function performer(
  id: string,
  beat: Performer['pattern']['beats'][number],
): Performer {
  return {
    id,
    entry: 1,
    name: id,
    role: 'polos',
    pattern: { beats: [beat] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 1,
    ensemble,
  }
}

describe('collectBeatEvents', () => {
  it('schedules long cak at beat start', () => {
    const events = collectBeatEvents({
      globalBeat: 0,
      beatTime: 0,
      tempoBpm: 120,
      performers: [performer('long', CAK_LONG)],
    })

    expect(events).toHaveLength(1)
    expect(events[0].audioTime).toBe(0)
    expect(events[0].durationSeconds).toBe(0.5)
    expect(events[0].sampleId).toBe('cak-long')
  })

  it('schedules double at beat start and halfway', () => {
    const events = collectBeatEvents({
      globalBeat: 0,
      beatTime: 10,
      tempoBpm: 120,
      performers: [performer('double', CAK_DOUBLE)],
    })

    expect(events.map((event) => event.audioTime)).toEqual([
      10,
      10.25,
    ])
  })

  it('schedules triple at thirds of the beat', () => {
    const events = collectBeatEvents({
      globalBeat: 0,
      beatTime: 0,
      tempoBpm: 120,
      performers: [performer('triple', CAK_TRIPLE)],
    })

    expect(events[0].audioTime).toBeCloseTo(0, 8)
    expect(events[1].audioTime).toBeCloseTo(1 / 6, 8)
    expect(events[2].audioTime).toBeCloseTo(1 / 3, 8)
  })

  it('keeps same-subtick voices on exactly the same base time', () => {
    const events = collectBeatEvents({
      globalBeat: 0,
      beatTime: 5,
      tempoBpm: 120,
      performers: [
        performer('a', CAK_DOUBLE),
        performer('b', CAK_DOUBLE),
      ],
    })

    const starts = events.filter(
      (event) => event.offsetSubtick === 0,
    )

    expect(starts).toHaveLength(2)
    expect(starts[0].audioTime).toBe(starts[1].audioTime)
  })
})

describe('migrateLegacyPattern', () => {
  it('maps q0 q1 q2 q3 to subticks 0 3 6 9', () => {
    const pattern = migrateLegacyPattern([1, 1, 1, 1])

    expect(
      pattern.beats[0].map((event) => event.offsetSubtick),
    ).toEqual([0, 3, 6, 9])
  })
})
