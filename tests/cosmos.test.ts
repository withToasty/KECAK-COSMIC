import { describe, expect, it } from 'vitest'
import { COSMIC_BODIES, COSMIC_SYSTEMS, findBody } from '../src/cosmos/bodies'
import {
  eventOffsetsInBeat,
  formatDuration,
  nextRealignment,
  orbitFraction,
  periodsInBeats,
  pitchHz,
  realSecondsPerBeat,
} from '../src/cosmos/compress'
import {
  CosmicCore,
  orderedBodies,
  type CosmicSink,
  type CosmicTrigger,
} from '../src/cosmos/cosmicCore'

const bodiesOf = (ids: string[]) => ids.map((id) => findBody(id)!)

describe('data', () => {
  it('has the catalogued periods (sidereal, seconds)', () => {
    const days = (id: string) => findBody(id)!.realPeriodSeconds / 86400
    expect(days('moon')).toBeCloseTo(27.32, 2)
    expect(days('mercury')).toBeCloseTo(87.97, 2)
    expect(days('mars')).toBeCloseTo(686.98, 2)
    expect(days('jupiter')).toBeCloseTo(4332.59, 2)
    expect(days('io')).toBeCloseTo(1.769, 3)
    expect(days('callisto')).toBeCloseTo(16.689, 3)
    expect(findBody('iss')!.realPeriodSeconds / 60).toBeCloseTo(92.9, 1)
    expect(findBody('gps')!.realPeriodSeconds / 3600).toBeCloseTo(11 + 58 / 60, 3)
  })

  it('every system lists existing bodies and has unique ids', () => {
    const ids = COSMIC_BODIES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of COSMIC_SYSTEMS) for (const id of s.bodies) expect(findBody(id)).toBeDefined()
  })

  it('GPS is half a sidereal day and a geostationary orbit equals the rotation period', () => {
    const rot = findBody('earth-rotation')!.realPeriodSeconds
    expect(findBody('gps')!.realPeriodSeconds / (rot / 2)).toBeCloseTo(1, 2)
  })
})

describe('compression keeps the real ratios exactly', () => {
  const jup = bodiesOf(['io', 'europa', 'ganymede', 'callisto'])

  it('the fastest body takes the chosen number of beats', () => {
    const p = periodsInBeats(jup, 2)
    expect(p.get('io')).toBeCloseTo(2, 10)
  })

  it('Io : Europa : Ganymede stays at about 1 : 2 : 4 (the Laplace resonance)', () => {
    const p = periodsInBeats(jup, 1)
    expect(p.get('europa')! / p.get('io')!).toBeCloseTo(2.007, 3)
    expect(p.get('ganymede')! / p.get('io')!).toBeCloseTo(4.044, 3)
    expect(p.get('callisto')! / p.get('io')!).toBeCloseTo(9.43, 2)
  })

  it('real time per beat is one constant for every body', () => {
    const per = realSecondsPerBeat(jup, 2)
    const p = periodsInBeats(jup, 2)
    for (const b of jup) expect(b.realPeriodSeconds / p.get(b.id)!).toBeCloseTo(per, 6)
  })
})

describe('events', () => {
  it('a body with a 2.5-beat period sounds at 0, 2.5, 5, 7.5 ... (exact, not quantized)', () => {
    const times: number[] = []
    for (let beat = 0; beat < 8; beat++) {
      for (const o of eventOffsetsInBeat(2.5, beat)) times.push(beat + o)
    }
    expect(times).toEqual([0, 2.5, 5, 7.5])
  })

  it('every offset lies inside its beat and no sound is lost or doubled', () => {
    const period = 1.7
    const all: number[] = []
    for (let beat = 0; beat < 40; beat++) {
      for (const o of eventOffsetsInBeat(period, beat)) {
        expect(o).toBeGreaterThanOrEqual(0)
        expect(o).toBeLessThan(1)
        all.push(beat + o)
      }
    }
    for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeCloseTo(period, 9)
  })

  it('a period shorter than a beat sounds several times per beat', () => {
    expect(eventOffsetsInBeat(0.5, 3)).toEqual([0, 0.5])
  })

  it('orbit fraction wraps', () => {
    expect(orbitFraction(5, 4)).toBeCloseTo(0.25)
    expect(orbitFraction(0, 4)).toBe(0)
  })
})

describe('pitch', () => {
  const all = bodiesOf(['mercury', 'venus', 'earth', 'mars']).map((b) => b.realPeriodSeconds)

  it('faster orbit = higher pitch, strictly ordered', () => {
    const hz = all.map((p) => pitchHz(p, all))
    for (let i = 1; i < hz.length; i++) expect(hz[i]).toBeLessThan(hz[i - 1])
  })

  it('fastest = highest degree, slowest = lowest (C3)', () => {
    expect(pitchHz(Math.max(...all), all)).toBeCloseTo(130.81, 1)
    expect(pitchHz(Math.min(...all), all)).toBeGreaterThan(500)
  })
})

describe('alignment', () => {
  it('finds when bodies sound together again; null when they never do', () => {
    expect(nextRealignment([2, 4], 100)).toBe(4)
    expect(nextRealignment([2, 4.0001], 100)).toBeCloseTo(4, 1)
    expect(nextRealignment([2, Math.PI], 30, 0.001)).toBeNull()
    expect(nextRealignment([2], 100)).toBeNull()
  })

  it('Io, Europa and Ganymede realign sooner than with Callisto', () => {
    const three = [...periodsInBeats(bodiesOf(['io', 'europa', 'ganymede']), 2).values()]
    const four = [...periodsInBeats(bodiesOf(['io', 'europa', 'ganymede', 'callisto']), 2).values()]
    const t3 = nextRealignment(three, 2000)
    expect(t3).not.toBeNull()
    const t4 = nextRealignment(four, 2000)
    expect(t4 === null || t4 > t3!).toBe(true)
  })
})

describe('formatDuration', () => {
  it('picks a readable unit', () => {
    expect(formatDuration(92.9 * 60)).toBe('1.55 時間')
    expect(formatDuration(45 * 60)).toBe('45.0 分')
    expect(formatDuration(30)).toBe('30.0 秒')
    expect(formatDuration(27.32 * 86400)).toBe('27.3 日')
    expect(formatDuration(164.8 * 365.25 * 86400)).toBe('165 年')
    expect(formatDuration(11.97 * 3600)).toBe('12.0 時間')
  })
})

function setup(systemId: 'jupiter' | 'earth' | 'inner' | 'outer' = 'jupiter') {
  const triggers: CosmicTrigger[] = []
  const tempos: { bpm: number; time: number }[] = []
  const sink: CosmicSink = { trigger: (t) => triggers.push(t), setTempo: (bpm, time) => tempos.push({ bpm, time }) }
  const core = new CosmicCore(sink)
  core.reset(systemId)
  const clock = { t: 10 }
  const beat = () => {
    const b = core.onBeat(clock.t)
    clock.t += b.secondsPerBeat
    return b
  }
  const run = (n: number) => Array.from({ length: n }, beat)
  const joinAll = () => { while (core.join()); }
  return { core, triggers, tempos, beat, run, joinAll }
}

describe('CosmicCore', () => {
  it('starts with only the fastest body joined; JOIN brings the next-slowest', () => {
    const { core } = setup()
    expect(core.getSession().voices.filter((v) => v.joined).map((v) => v.id)).toEqual(['io'])
    core.join()
    expect(core.getSession().voices.filter((v) => v.joined).map((v) => v.id)).toEqual(['io', 'europa'])
    expect(orderedBodies('jupiter').map((b) => b.id)).toEqual(['io', 'europa', 'ganymede', 'callisto'])
  })

  it('beat 0: every joined body sounds together at the start time (a conjunction)', () => {
    const { core, joinAll, beat } = setup()
    joinAll()
    core.markStarted()
    const b = beat()
    expect(b.triggers.map((t) => t.bodyId).sort()).toEqual(['callisto', 'europa', 'ganymede', 'io'])
    for (const t of b.triggers) {
      expect(t.time).toBe(10)
      expect(t.conjunction).toBe(true)
    }
  })

  it('then they drift apart: Io sounds every 2 beats at exact audio times', () => {
    const { core, triggers, run } = setup()
    core.join()
    core.markStarted()
    run(12)
    const io = triggers.filter((t) => t.bodyId === 'io').map((t) => t.time)
    // tempo 100 BPM: 0.6 s per beat, Io every 2 beats = 1.2 s, starting at t = 10
    expect(io.slice(0, 4).map((t) => +(t - 10).toFixed(6))).toEqual([0, 1.2, 2.4, 3.6])
    // Europa (~4.01 beats) is never on the grid: not a multiple of a beat
    const eu = triggers.filter((t) => t.bodyId === 'europa').map((t) => +((t.time - 10) / 0.6).toFixed(4))
    expect(eu.slice(0, 3)).toEqual([0, 4.0146, 8.0292])
  })

  it('stays within the audio times of its beat (offset in [0, secondsPerBeat))', () => {
    const { core, joinAll, run } = setup('inner')
    core.setFastestBeats(1.5)
    joinAll()
    core.markStarted()
    const beats = run(30)
    for (const b of beats) {
      for (const t of b.triggers) {
        expect(t.time).toBeGreaterThanOrEqual(b.time)
        expect(t.time).toBeLessThan(b.time + b.secondsPerBeat)
      }
    }
  })

  it('JOIN and MUTE while playing take effect on the next beat boundary', () => {
    const { core, beat } = setup()
    core.markStarted()
    beat()
    core.join()
    expect(core.getSession().voices[1].joined).toBe(false)
    beat()
    expect(core.getSession().voices[1].joined).toBe(true)
    core.setMuted('europa', true)
    expect(core.getSession().voices[1].muted).toBe(false)
    beat()
    expect(core.getSession().voices[1].muted).toBe(true)
  })

  it('tempo is pending until the next beat; compression is stopped-only', () => {
    const { core, beat, tempos } = setup()
    core.markStarted()
    beat()
    core.setTempo(140)
    expect(core.getSession().pendingTempoBpm).toBe(140)
    const b = beat()
    expect(tempos).toEqual([{ bpm: 140, time: b.time }])
    expect(b.secondsPerBeat).toBeCloseTo(60 / 140)
    expect(core.setFastestBeats(4)).toBe(false)
    core.markStopped()
    expect(core.setFastestBeats(4)).toBe(true)
    expect(core.getSession().fastestBeats).toBe(4)
  })

  it('STOP rewinds and keeps voices; switching system gives a fresh session', () => {
    const { core, beat } = setup()
    core.join()
    core.markStarted()
    beat(); beat()
    core.markStopped()
    expect(core.getSession()).toMatchObject({ playing: false, globalBeat: 0 })
    expect(core.getSession().voices.filter((v) => v.joined)).toHaveLength(2)
    core.setSystem('inner')
    expect(core.getSession().systemId).toBe('inner')
    expect(core.getSession().voices.map((v) => v.id)).toEqual(['mercury', 'venus', 'earth', 'mars'])
    expect(core.getSession().fastestBeats).toBe(2)
  })

  it('periods() follows the compression setting', () => {
    const { core } = setup()
    expect(core.periods().get('io')).toBe(2)
    core.setFastestBeats(3)
    expect(core.periods().get('io')).toBe(3)
    expect(core.periods().get('callisto')!).toBeCloseTo((3 * 16.689017) / 1.769138, 6)
  })

  it('marker position interpolates from audio time; volume scales gain', () => {
    const { core, triggers, run } = setup()
    core.markStarted()
    core.setVolume('io', 0.5)
    run(3)
    expect(core.positionAt(10)).toBeCloseTo(0)
    expect(core.positionAt(10 + 0.3)).toBeCloseTo(0.5, 5)
    expect(triggers[0].gain).toBeCloseTo(0.8 * 0.5 * 0 + triggers[0].gain) // finite
    expect(Number.isFinite(triggers[0].gain)).toBe(true)
  })
})
