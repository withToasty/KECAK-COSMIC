import { describe, expect, it } from 'vitest'
import { EngineCore, type PulseSink } from '../src/engine/core'
import { createSession, hitsAtPulse } from '../src/engine/session'
import type { Performer } from '../src/engine/types'

// Expected hits for the full 8-voice preset: docs/m0-pulse-fixture.md
const FIXTURE: string[][] = [
  ['JK', 'BP', 'TL', 'LP'],
  ['TS'],
  ['BS', 'TP', 'LS'],
  ['TL'],
  ['JK', 'BP', 'TS', 'LP'],
  ['TP', 'TL'],
  ['BS', 'TS', 'LS'],
  ['TP'],
  ['JK', 'BP', 'TL', 'LP'],
  ['TS'],
  ['BS', 'TP', 'LS'],
  ['TL'],
  ['JK', 'BP', 'TS', 'LP'],
  ['TP', 'TL', 'LS'],
  ['BS', 'TS', 'LP'],
  ['TP', 'LS'],
]

const CODE: Record<string, string> = {
  klempung: 'JK',
  'besik-polos': 'BP',
  'besik-sangsih': 'BS',
  'telu-polos': 'TP',
  'telu-sanglot': 'TL',
  'telu-sangsih': 'TS',
  'lima-polos': 'LP',
  'lima-sangsih': 'LS',
}

type Played = { id: string; time: number }

function setup() {
  const played: Played[] = []
  const tempos: { bpm: number; time: number }[] = []
  const sink: PulseSink = {
    play: (p: Performer, _hit, time) => played.push({ id: p.id, time }),
    setTempo: (bpm, time) => tempos.push({ bpm, time }),
  }
  const core = new EngineCore(sink)
  const clock = { t: 100 }
  /** Fire one pulse, 125 ms after the previous one. */
  const pulse = () => {
    const before = played.length
    const ev = core.onPulse(clock.t)
    clock.t += 0.125
    return { ev, played: played.slice(before) }
  }
  const joinAll = () => {
    while (core.join());
  }
  return { core, played, tempos, pulse, joinAll }
}

describe('fixture (8 voices)', () => {
  it('matches the pulse 0-15 table', () => {
    const s = createSession()
    s.performers.forEach((p) => (p.joined = true))
    for (let t = 0; t < 16; t++) {
      const ids = hitsAtPulse(s.performers, t).map((h) => CODE[h.performer.kecakPart])
      expect(ids.sort()).toEqual([...FIXTURE[t]].sort())
    }
  })

  it('repeats completely every 16 pulses', () => {
    const s = createSession()
    s.performers.forEach((p) => (p.joined = true))
    const key = (t: number) =>
      hitsAtPulse(s.performers, t).map((h) => h.performer.id).join()
    for (let t = 0; t < 64; t++) expect(key(t + 16)).toBe(key(t))
  })
})

describe('START', () => {
  it('sounds JK at pulse 0 immediately (no silent pulse)', () => {
    const { core, pulse } = setup()
    // The audio layer calls markStarted() before the first transport callback.
    core.markStarted()
    const first = pulse()
    expect(first.ev.pulse).toBe(0)
    expect(first.played.map((x) => x.id)).toEqual(['klempung'])
  })
})

describe('STOP / RESET', () => {
  it('STOP keeps joined / muted / volume / tempo and rewinds to pulse 0', () => {
    const { core, pulse } = setup()
    core.join()
    core.join()
    core.setMuted('besik-polos', true)
    core.setVolume('besik-polos', 0.4)
    core.setTempo(150)
    core.markStarted()
    for (let i = 0; i < 6; i++) pulse()
    core.markStopped()

    const s = core.getSession()
    expect(s.playing).toBe(false)
    expect(s.globalPulse).toBe(0)
    expect(s.performers.filter((p) => p.joined).length).toBe(3)
    expect(s.performers.find((p) => p.id === 'besik-polos')).toMatchObject({
      muted: true,
      volume: 0.4,
    })
    expect(s.tempoBpm).toBe(150)

    core.markStarted()
    expect(pulse().ev.pulse).toBe(0)
  })

  it('RESET restores the initial session', () => {
    const { core } = setup()
    core.join()
    core.setMuted('klempung', true)
    core.setTempo(200)
    core.setVolume('klempung', 0.2)
    core.reset()
    const s = core.getSession()
    expect(s.tempoBpm).toBe(120)
    expect(s.pendingTempoBpm).toBeNull()
    expect(s.performers.filter((p) => p.joined).map((p) => p.id)).toEqual(['klempung'])
    expect(s.performers.every((p) => !p.muted && p.volume === 1 && p.rotation === 0)).toBe(true)
  })
})

describe('JOIN', () => {
  it('is strictly sequential and stops after 8', () => {
    const { core } = setup()
    for (let i = 0; i < 7; i++) expect(core.join()).toBe(true)
    expect(core.join()).toBe(false)
    expect(core.getSession().performers.map((p) => p.joined)).toEqual(Array(8).fill(true))
  })

  it('while playing: takes effect at the next pulse at the current global position', () => {
    const { core, pulse } = setup()
    core.markStarted()
    for (let i = 0; i < 3; i++) pulse() // pulses 0,1,2 done; next is pulse 3
    expect(core.join()).toBe(true) // besik-polos (1000)
    expect(core.getSession().performers[1].joined).toBe(false) // not yet
    const p3 = pulse()
    expect(p3.ev.pulse).toBe(3)
    expect(core.getSession().performers[1].joined).toBe(true)
    // pattern 1000 at position 3 % 4 = 3 is a rest: it does not restart at index 0
    expect(p3.played).toEqual([])
    const p4 = pulse()
    expect(p4.played.map((x) => x.id).sort()).toEqual(['besik-polos', 'klempung'])
  })

  it('does not allow queuing more joins than seats', () => {
    const { core } = setup()
    core.markStarted()
    for (let i = 0; i < 7; i++) expect(core.join()).toBe(true)
    expect(core.join()).toBe(false)
  })
})

describe('MUTE', () => {
  it('while playing: takes effect on the next pulse, marker data unaffected', () => {
    const { core, pulse } = setup()
    core.markStarted()
    expect(pulse().played.map((x) => x.id)).toEqual(['klempung'])
    core.setMuted('klempung', true)
    pulse()
    pulse()
    pulse()
    expect(pulse().played).toEqual([]) // pulse 4 would have been JK
    core.setMuted('klempung', false)
    expect(pulse().ev.pulse).toBe(5)
    const p = [pulse(), pulse(), pulse()]
    expect(p[2].ev.pulse).toBe(8)
    expect(p[2].played.map((x) => x.id)).toEqual(['klempung'])
  })

  it('cannot mute an unjoined voice', () => {
    const { core } = setup()
    core.setMuted('telu-polos', true)
    expect(core.getSession().performers[3].muted).toBe(false)
  })
})

describe('Tempo', () => {
  it('stopped: applies immediately and clamps to 60-220', () => {
    const { core } = setup()
    core.setTempo(500)
    expect(core.getSession().tempoBpm).toBe(220)
    core.setTempo(10)
    expect(core.getSession().tempoBpm).toBe(60)
  })

  it('playing: pending until the next klempung-beat boundary, latest wins', () => {
    const { core, pulse, tempos } = setup()
    core.markStarted()
    pulse() // pulse 0
    pulse() // pulse 1
    core.setTempo(140)
    core.setTempo(160)
    expect(core.getSession().pendingTempoBpm).toBe(160)
    pulse() // 2
    pulse() // 3
    expect(tempos).toEqual([])
    expect(core.getSession().tempoBpm).toBe(120)
    const p4 = pulse() // pulse 4: boundary
    expect(p4.ev.pulse).toBe(4)
    expect(tempos).toEqual([{ bpm: 160, time: p4.ev.time }])
    expect(core.getSession().tempoBpm).toBe(160)
    expect(core.getSession().pendingTempoBpm).toBeNull()
  })
})

describe('Same-pulse scheduling', () => {
  it('schedules every voice of a pulse at the identical audio time', () => {
    const { core, pulse, joinAll } = setup()
    joinAll()
    core.markStarted()
    for (let t = 0; t < 16; t++) {
      const { ev, played } = pulse()
      expect(played).toHaveLength(FIXTURE[t].length)
      for (const hit of played) expect(hit.time).toBe(ev.time)
    }
  })
})

describe('visual clock', () => {
  it('interpolates the marker between pulses from the audio time', () => {
    const { core, pulse } = setup()
    core.markStarted()
    pulse() // t=100
    pulse() // t=100.125
    expect(core.positionAt(100)).toBeCloseTo(0)
    expect(core.positionAt(100.0625)).toBeCloseTo(0.5)
    expect(core.positionAt(100.125)).toBeCloseTo(1)
    // not-yet-scheduled pulse: advance by the current pulse length, clamped at 1 pulse
    expect(core.positionAt(100.1875)).toBeCloseTo(1.5)
    expect(core.positionAt(101)).toBeCloseTo(2)
  })

  it('releases visual events only when their audio time has arrived', () => {
    const { core, pulse } = setup()
    core.markStarted()
    pulse()
    pulse()
    expect(core.drainVisual(99).length).toBe(0)
    expect(core.drainVisual(100.01).map((e) => e.pulse)).toEqual([0])
    expect(core.drainVisual(100.2).map((e) => e.pulse)).toEqual([1])
  })

  it('reports position 0 when stopped', () => {
    const { core } = setup()
    expect(core.positionAt(123)).toBe(0)
  })
})

describe('CUE (docs/cue-model.md)', () => {
  const ids = (r: { played: { id: string }[] }) => r.played.map((x) => x.id).sort()

  /** Run pulses until `n` pulses have fired; returns per-pulse results. */
  function run(pulse: ReturnType<typeof setup>['pulse'], n: number) {
    return Array.from({ length: n }, () => pulse())
  }

  it('only works while playing', () => {
    const { core } = setup()
    core.toggleCue()
    expect(core.getSession().cue).toBe('idle')
  })

  it('arms immediately but starts at the next 16-pulse boundary', () => {
    const { core, pulse, joinAll } = setup()
    joinAll()
    core.markStarted()
    run(pulse, 5) // pulses 0..4 done
    core.toggleCue()
    expect(core.getSession().cue).toBe('armed')
    // pulses 5..15 are the normal groove (fixture rows)
    for (let t = 5; t < 16; t++) {
      const r = pulse()
      expect(r.ev.pulse).toBe(t)
      expect(r.played).toHaveLength(FIXTURE[t].length)
    }
    expect(core.getSession().cue).toBe('armed')
  })

  it('call: only Juru Klempung; response: all joined voices in unison; then groove returns', () => {
    const { core, pulse, joinAll } = setup()
    joinAll()
    core.markStarted()
    run(pulse, 4)
    core.toggleCue()
    run(pulse, 12) // up to pulse 15
    const cue = run(pulse, 16) // pulses 16..31
    // call 10101000 -> JK at rel 0, 2, 4
    cue.slice(0, 8).forEach((r, rel) => {
      expect(ids(r)).toEqual('10101000'[rel] === '1' ? ['klempung'] : [])
    })
    expect(core.getSession().cue).toBe('response')
    // response 10101011 -> all 8 voices at rel 8, 10, 12, 14, 15
    cue.slice(8).forEach((r, i) => {
      expect(ids(r)).toHaveLength('10101011'[i] === '1' ? 8 : 0)
    })
    // pulse 32 onwards: the groove returns (fixture row 0)
    const back = pulse()
    expect(back.ev.pulse).toBe(32)
    expect(back.played).toHaveLength(FIXTURE[0].length)
    expect(core.getSession().cue).toBe('idle')
  })

  it('schedules the unison response at one identical audio time', () => {
    const { core, pulse, joinAll } = setup()
    joinAll()
    core.markStarted()
    core.toggleCue()
    const cue = run(pulse, 16)
    for (const r of cue.slice(8)) for (const h of r.played) expect(h.time).toBe(r.ev.time)
  })

  it('muted voices stay silent during a cue', () => {
    const { core, pulse, joinAll } = setup()
    joinAll()
    core.setMuted('lima-sangsih', true)
    core.markStarted()
    run(pulse, 1) // pulse 0 done
    core.toggleCue()
    run(pulse, 15)
    const cue = run(pulse, 16)
    expect(cue[8].played.map((x) => x.id)).not.toContain('lima-sangsih')
    expect(cue[8].played).toHaveLength(7)
  })

  it('can be cancelled while armed and is cleared by STOP', () => {
    const { core, pulse } = setup()
    core.markStarted()
    run(pulse, 3)
    core.toggleCue()
    core.toggleCue()
    expect(core.getSession().cue).toBe('idle')
    core.toggleCue()
    core.markStopped()
    expect(core.getSession().cue).toBe('idle')
    core.markStarted()
    run(pulse, 17)
    expect(core.getSession().cue).toBe('idle')
  })

  it('never resets the global pulse', () => {
    const { core, pulse } = setup()
    core.markStarted()
    core.toggleCue()
    const all = run(pulse, 40)
    expect(all.map((r) => r.ev.pulse)).toEqual(Array.from({ length: 40 }, (_, i) => i))
  })
})
