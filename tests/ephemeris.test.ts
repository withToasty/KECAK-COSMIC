import { describe, expect, it } from 'vitest'
import { findBody } from '../src/cosmos/bodies'
import {
  eventOffsetsInBeat,
  nextRealignment,
  orbitFraction,
  periodsInBeats,
} from '../src/cosmos/compress'
import { CosmicCore, type CosmicSink, type CosmicTrigger } from '../src/cosmos/cosmicCore'
import {
  heliocentricLongitude,
  isDateInRange,
  parseDate,
  phasesForDate,
  supportsEphemeris,
} from '../src/cosmos/ephemeris'

const PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']

describe('ephemeris (Astronomy Engine)', () => {
  // Independent checks against events whose dates are well known: at the March
  // equinox the Sun's longitude is 0 deg, so the Earth seen from the Sun is at
  // 180 deg; at the June solstice, 270 deg.
  it('puts the Earth at 180 deg at the 2024 March equinox and 270 deg at the June solstice', () => {
    expect(heliocentricLongitude('earth', new Date('2024-03-20T03:06:00Z'))).toBeCloseTo(180, 0)
    expect(heliocentricLongitude('earth', new Date('2024-06-20T20:51:00Z'))).toBeCloseTo(270, 0)
  })

  it('every planet has a longitude in [0, 360) and a phase in [0, 1)', () => {
    const phases = phasesForDate(PLANET_IDS, new Date('2026-10-02T12:00:00Z'))
    for (const id of PLANET_IDS) {
      expect(phases[id]).toBeGreaterThanOrEqual(0)
      expect(phases[id]).toBeLessThan(1)
    }
  })

  it('a planet advances by about 360 deg per period (Earth: one year later, same place)', () => {
    const a = heliocentricLongitude('earth', new Date('2020-05-01T12:00:00Z'))
    const b = heliocentricLongitude('earth', new Date('2021-05-01T12:00:00Z'))
    const diff = Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
    expect(diff).toBeLessThan(1)
  })

  it('moves counter-clockwise (longitude grows with time) for every planet', () => {
    for (const id of PLANET_IDS) {
      const t0 = new Date('2024-01-01T12:00:00Z')
      const t1 = new Date(t0.getTime() + 3 * 86400000)
      const d = (heliocentricLongitude(id, t1) - heliocentricLongitude(id, t0) + 540) % 360 - 180
      expect(d, id).toBeGreaterThan(0)
    }
  })

  it('rejects unknown ids, malformed and out-of-range dates', () => {
    expect(() => heliocentricLongitude('moon', new Date())).toThrow()
    expect(parseDate('2024-13-40')).toBeNull()
    expect(parseDate('hello')).toBeNull()
    expect(parseDate('2024-03-20')).not.toBeNull()
    expect(isDateInRange('1899-12-31')).toBe(false)
    expect(isDateInRange('2101-01-01')).toBe(false)
    expect(isDateInRange('2026-10-02')).toBe(true)
  })

  it('only the planet systems support a real configuration', () => {
    expect(supportsEphemeris('inner')).toBe(true)
    expect(supportsEphemeris('outer')).toBe(true)
    expect(supportsEphemeris('earth')).toBe(false)
    expect(supportsEphemeris('jupiter')).toBe(false)
  })
})

describe('phase in the event rules', () => {
  it('first sound comes after the remaining part of a revolution', () => {
    // period 4 beats, 25% done at beat 0 -> first sound at 3 beats, then every 4
    const times: number[] = []
    for (let beat = 0; beat < 12; beat++) {
      for (const o of eventOffsetsInBeat(4, beat, 0.25)) times.push(beat + o)
    }
    expect(times).toEqual([3, 7, 11])
  })

  it('phase 0 keeps the "all start in step" behaviour', () => {
    expect(eventOffsetsInBeat(2.5, 0, 0)).toEqual([0])
    expect(eventOffsetsInBeat(2.5, 0)).toEqual([0])
  })

  it('no sound is lost or doubled with a phase, and spacing stays exactly one period', () => {
    const all: number[] = []
    for (let beat = 0; beat < 60; beat++) for (const o of eventOffsetsInBeat(1.7, beat, 0.6)) all.push(beat + o)
    expect(all[0]).toBeCloseTo(0.4 * 1.7, 9)
    for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeCloseTo(1.7, 9)
  })

  it('orbit fraction starts at the phase and wraps', () => {
    expect(orbitFraction(0, 4, 0.25)).toBeCloseTo(0.25)
    expect(orbitFraction(3, 4, 0.25)).toBeCloseTo(0)
    expect(orbitFraction(4, 4, 0.25)).toBeCloseTo(0.25)
  })

  it('realignment accounts for the starting phases', () => {
    // same periods, but out of step at the start: they only sound together later (or never)
    expect(nextRealignment([2, 4], 100)).toBe(4)
    expect(nextRealignment([2, 4], 100, 0.03, [0, 0.5])).toBe(2) // 4-beat body is half done: it sounds at 2 and 6...
    expect(nextRealignment([2, 4], 100, 0.001, [0.3, 0.7])).toBeNull()
  })
})

function setup(systemId: 'inner' | 'outer' | 'jupiter' = 'inner') {
  const triggers: CosmicTrigger[] = []
  const sink: CosmicSink = { trigger: (t) => triggers.push(t), setTempo: () => {} }
  const core = new CosmicCore(sink)
  core.reset(systemId)
  let t = 10
  const beat = () => {
    const b = core.onBeat(t)
    t += b.secondsPerBeat
    return b
  }
  return { core, triggers, beat, run: (n: number) => Array.from({ length: n }, beat) }
}

describe('CosmicCore: starting from a real configuration', () => {
  it('computes a phase for every planet of the system', () => {
    const { core } = setup('inner')
    expect(core.setStartDate('2024-03-20')).toBe(true)
    const s = core.getSession()
    expect(s.startDate).toBe('2024-03-20')
    expect(Object.keys(s.phases).sort()).toEqual(['earth', 'mars', 'mercury', 'venus'])
    expect(s.phases.earth).toBeCloseTo(0.5, 2) // 180 deg at the equinox
  })

  it('refuses a system without an ephemeris, bad dates, and changes while playing', () => {
    const j = setup('jupiter')
    expect(j.core.setStartDate('2024-03-20')).toBe(false)
    const { core, beat } = setup('inner')
    expect(core.setStartDate('not-a-date')).toBe(false)
    expect(core.setStartDate('1800-01-01')).toBe(false)
    core.markStarted()
    beat()
    expect(core.setStartDate('2024-03-20')).toBe(false)
  })

  it('the first sound of each planet comes after its remaining fraction of a revolution', () => {
    const { core, triggers, run } = setup('inner')
    while (core.join());
    core.setStartDate('2024-03-20')
    const phases = core.getSession().phases
    const periods = periodsInBeats(['mercury', 'venus', 'earth', 'mars'].map((id) => findBody(id)!), 2)
    core.markStarted()
    run(40)
    for (const id of ['mercury', 'venus', 'earth', 'mars']) {
      const first = triggers.find((t) => t.bodyId === id)
      expect(first, id).toBeDefined()
      const beatsFromStart = (first!.time - 10) / (60 / 100)
      expect(beatsFromStart).toBeCloseTo((1 - phases[id]) * periods.get(id)!, 6)
    }
  })

  it('no longer starts all in step: nothing sounds at the start instant', () => {
    const { core, beat } = setup('inner')
    while (core.join());
    core.setStartDate('2024-03-20')
    core.markStarted()
    for (const t of beat().triggers) expect(t.time).toBeGreaterThan(10)
  })

  it('STOP keeps the start date; switching system and RESET return to starting in step', () => {
    const { core, beat } = setup('inner')
    core.setStartDate('2024-03-20')
    core.markStarted()
    beat()
    core.markStopped()
    expect(core.getSession().startDate).toBe('2024-03-20')
    core.setSystem('outer')
    expect(core.getSession()).toMatchObject({ startDate: null, phases: {} })
    core.setStartDate('2024-03-20')
    core.reset()
    expect(core.getSession().startDate).toBeNull()
  })

  it('null puts every body back in step', () => {
    const { core } = setup('inner')
    core.setStartDate('2024-03-20')
    expect(core.setStartDate(null)).toBe(true)
    expect(core.getSession().phases).toEqual({})
  })
})
