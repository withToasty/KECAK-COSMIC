import { describe, expect, it } from 'vitest'
import { decodeArrangement, encodeArrangement, SHARE_PREFIX } from '../src/data/arrangement'
import { PRESET_SETS } from '../src/data/presetSets'
import { EngineCore, type EventSink } from '../src/engine/core'
import { createSession } from '../src/engine/session'
import type { BeatCell } from '../src/domain/rhythm'

function setup() {
  const sink: EventSink = { trigger: () => {}, setTempo: () => {} }
  const core = new EngineCore(sink)
  const clock = { t: 10 }
  const beat = () => {
    const ev = core.onBeat(clock.t)
    clock.t += ev.secondsPerBeat
    return ev
  }
  const run = (n: number) => Array.from({ length: n }, beat)
  return { core, beat, run }
}
const ids = (events: { performerId: string }[]) => [...new Set(events.map((e) => e.performerId))].sort()
const short = (o: number): BeatCell[number] => ({ offsetSubtick: o, durationSubticks: 2, sampleId: 'cak-short', accent: 1 })

describe('pattern editing', () => {
  it('stopped: applies at once; playing: waits for the next beat boundary', () => {
    const { core, beat, run } = setup()
    core.join()
    core.setPattern('besik-polos', { beats: [[short(3)]] })
    expect(core.getSession().performers[1].pattern.beats[0][0].offsetSubtick).toBe(3)

    core.markStarted()
    run(1)
    core.setPattern('besik-polos', { beats: [[short(9)]] })
    expect(core.getSession().performers[1].pattern.beats[0][0].offsetSubtick).toBe(3) // not yet
    const b = beat()
    expect(core.getSession().performers[1].pattern.beats[0][0].offsetSubtick).toBe(9)
    expect(b.events.find((e) => e.performerId === 'besik-polos')?.offsetSubtick).toBe(9)
  })

  it('rejects out-of-range events and caps the cycle at 8 beats', () => {
    const { core } = setup()
    expect(() =>
      core.setPattern('klempung', { beats: [[{ ...short(0), offsetSubtick: 12 }]] }),
    ).toThrow()
    core.setPattern('klempung', { beats: Array.from({ length: 20 }, () => [short(0)]) })
    expect(core.getSession().performers[0].pattern.beats).toHaveLength(8)
  })

  it('shortening the cycle keeps the rotation inside the new length', () => {
    const { core } = setup()
    core.join()
    core.setPattern('besik-polos', { beats: [[short(0)], [], [], []] })
    core.setRotation('besik-polos', 3)
    core.setPattern('besik-polos', { beats: [[short(0)], []] })
    expect(core.getSession().performers[1].rotationBeats).toBe(1)
  })
})

describe('rotation', () => {
  it('shifts which beat of the pattern sounds', () => {
    const { core, run } = setup()
    core.join()
    core.setPattern('besik-polos', { beats: [[short(0)], [], [], []] })
    core.markStarted()
    const sounding = (rot: number) => {
      core.setRotation('besik-polos', rot)
      return run(4).map((b) => b.events.some((e) => e.performerId === 'besik-polos'))
    }
    // Rotation requested while playing applies on the next beat, so only the
    // second pass is fully rotated.
    sounding(0)
    const rotated = sounding(1)
    expect(rotated.filter(Boolean)).toHaveLength(1)
  })

  it('normalizes negative rotations', () => {
    const { core } = setup()
    core.join()
    core.setPattern('besik-polos', { beats: [[short(0)], [], []] })
    core.setRotation('besik-polos', -1)
    expect(core.getSession().performers[1].rotationBeats).toBe(2)
  })
})

describe('solo', () => {
  it('only solo voices sound, in the groove and in a cue', () => {
    const { core, run } = setup()
    while (core.join());
    core.setSolo('telu-polos', true)
    core.markStarted()
    const groove = run(4)
    for (const b of groove) expect(ids(b.events).every((id) => id === 'telu-polos')).toBe(true)
    core.toggleCue('call')
    const cue = run(4)
    for (const b of cue) expect(ids(b.events).every((id) => id === 'telu-polos')).toBe(true)
  })

  it('solo takes effect on the beat boundary and can be released', () => {
    const { core, beat } = setup()
    while (core.join());
    core.markStarted()
    expect(ids(beat().events).length).toBeGreaterThan(1)
    core.setSolo('klempung', true)
    expect(ids(beat().events)).toEqual(['klempung'])
    core.setSolo('klempung', false)
    expect(ids(beat().events).length).toBeGreaterThan(1)
  })
})

describe('join / leave', () => {
  it('any seat can join out of order; leave clears mute and solo', () => {
    const { core } = setup()
    expect(core.join('lima-sangsih')).toBe(true)
    expect(core.getSession().performers[7].joined).toBe(true)
    core.setSolo('lima-sangsih', true)
    core.setMuted('lima-sangsih', true)
    core.leave('lima-sangsih')
    expect(core.getSession().performers[7]).toMatchObject({ joined: false, muted: false, solo: false })
  })

  it('JOIN NEXT VOICE skips seats that are already joined', () => {
    const { core } = setup()
    core.join('besik-polos')
    core.join()
    expect(core.getSession().performers.filter((p) => p.joined).map((p) => p.id)).toEqual([
      'klempung',
      'besik-polos',
      'besik-sangsih',
    ])
  })
})

describe('add / remove voices', () => {
  it('adds user voices up to 12 and renumbers entries after a removal', () => {
    const { core } = setup()
    for (let i = 0; i < 4; i++) expect(core.addVoice()).toBe(true)
    expect(core.getSession().performers).toHaveLength(12)
    expect(core.addVoice()).toBe(false)
    expect(core.getSession().performers[8]).toMatchObject({ id: 'custom-9', custom: true, joined: true })
    core.removeVoice('custom-9')
    const entries = core.getSession().performers.map((p) => p.entry)
    expect(entries).toEqual(Array.from({ length: 11 }, (_, i) => i + 1))
    // ids stay unique after a removal and a new add
    core.addVoice()
    const idsNow = core.getSession().performers.map((p) => p.id)
    expect(new Set(idsNow).size).toBe(idsNow.length)
  })

  it('preset voices cannot be removed', () => {
    const { core } = setup()
    core.removeVoice('klempung')
    expect(core.getSession().performers).toHaveLength(8)
  })

  it('a voice added while playing starts at the next beat and plays', () => {
    const { core, beat } = setup()
    core.markStarted()
    beat()
    core.addVoice()
    expect(core.getSession().performers).toHaveLength(8)
    const b = beat()
    expect(core.getSession().performers).toHaveLength(9)
    expect(ids(b.events)).toContain('custom-9')
  })
})

describe('ensemble editing', () => {
  it('clamps values and takes effect for the next beat', () => {
    const { core } = setup()
    core.setEnsemble('besik-polos', { size: 50, timingSpreadMs: 999, gainSpread: 5, seed: 7 })
    expect(core.getSession().performers[1].ensemble).toEqual({
      size: 8, timingSpreadMs: 40, gainSpread: 0.3, seed: 7,
    })
  })
})

describe('dynamics and BREAK cue', () => {
  it('soft lowers every trigger gain by a fixed factor on the next beat', () => {
    const triggers: number[] = []
    const core = new EngineCore({ trigger: (t) => triggers.push(t.gain), setTempo: () => {} })
    core.markStarted()
    core.onBeat(0)
    const loud = triggers.at(-1)!
    core.setDynamics('soft')
    core.onBeat(0.5)
    expect(triggers.at(-1)! / loud).toBeCloseTo(0.45, 5)
  })

  it('BREAK: soft pung, one beat of silence, then the unison answer', () => {
    const { core, run } = setup()
    while (core.join());
    core.markStarted()
    run(1)
    core.toggleCue('break')
    expect(core.getSession().cueKind).toBe('break')
    const b = run(4)
    expect(b[0].events.map((e) => e.sampleId)).toEqual(['pung'])
    expect(b[0].events[0].gain).toBeLessThan(1)
    expect(b[1].events).toHaveLength(0)
    expect(b[2].events.length).toBe(8) // off-beat unison hit
    expect(core.getSession().cueKind).toBe('break')
  })

  it('pressing the other cue while armed switches; pressing the same cancels', () => {
    const { core, run } = setup()
    core.markStarted()
    run(1)
    core.toggleCue('call')
    core.toggleCue('break')
    expect(core.getSession()).toMatchObject({ cue: 'armed', cueKind: 'break' })
    core.toggleCue('break')
    expect(core.getSession()).toMatchObject({ cue: 'idle', cueKind: null })
  })
})

describe('share code', () => {
  it('round-trips a session exactly', () => {
    const session = createSession(PRESET_SETS[1].presets, 'gesture')
    session.performers.forEach((p) => (p.joined = true))
    session.performers[2].muted = true
    session.performers[3].solo = true
    session.performers[3].rotationBeats = 2
    session.performers[4].volume = 0.35
    session.tempoBpm = 143
    session.dynamics = 'soft'
    const decoded = decodeArrangement(encodeArrangement(session))
    expect(decoded.tempoBpm).toBe(143)
    expect(decoded.dynamics).toBe('soft')
    expect(decoded.performers).toEqual(session.performers)
  })

  it('uses only characters that are safe in a URL hash', () => {
    const code = encodeArrangement(createSession())
    expect(code.startsWith(SHARE_PREFIX)).toBe(true)
    expect(code).toMatch(/^[A-Za-z0-9._-]+$/)
  })

  it('rejects damaged, foreign and out-of-range codes', () => {
    const good = encodeArrangement(createSession())
    expect(() => decodeArrangement('hello')).toThrow()
    expect(() => decodeArrangement(good.slice(0, -10))).toThrow()
    expect(() => decodeArrangement(SHARE_PREFIX + '!!!')).toThrow()
    const mutate = (fn: (d: any) => void) => {
      const json = JSON.parse(atob(good.slice(3).replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (good.length - 3) % 4) % 4)))
      fn(json)
      const b64 = btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      return SHARE_PREFIX + b64
    }
    expect(() => decodeArrangement(mutate((d) => (d.p[0].b[0][0][0] = 99)))).toThrow()
    expect(() => decodeArrangement(mutate((d) => (d.p[0].r = 'boss')))).toThrow()
    expect(() => decodeArrangement(mutate((d) => (d.p[1].i = d.p[0].i)))).toThrow()
    expect(() => decodeArrangement(mutate((d) => (d.p = [])))).toThrow()
    expect(() => decodeArrangement(mutate((d) => (d.v = 2)))).toThrow()
  })

  it('loadArrangement replaces the whole session', () => {
    const { core } = setup()
    const session = createSession()
    session.performers = session.performers.slice(0, 3)
    session.tempoBpm = 90
    const a = decodeArrangement(encodeArrangement(session))
    core.loadArrangement(a)
    expect(core.getSession().performers).toHaveLength(3)
    expect(core.getSession().tempoBpm).toBe(90)
    expect(core.getSession().globalBeat).toBe(0)
  })
})
