import { describe, expect, it } from 'vitest'
import { collectBeatEvents } from '../src/audio/beatScheduler'
import { buildEnsemble } from '../src/audio/ensemble'
import { CUE_CALL, CUE_RESPONSE } from '../src/data/cuePhrase'
import { gestureAuditionPerformers } from '../src/data/gestureAuditionPreset'
import { presetPattern } from '../src/data/kecakPresets'
import { PRESET_SETS } from '../src/data/presetSets'
import { assertVoicePattern } from '../src/domain/rhythm'
import { EngineCore, type EventSink, type MemberTrigger } from '../src/engine/core'
import { createSession } from '../src/engine/session'

// Legacy pulse fixture (docs/m0-pulse-fixture.md): old q-grid, 4 per beat.
const LEGACY_FIXTURE: string[][] = [
  ['JK', 'BP', 'TL', 'LP'], ['TS'], ['BS', 'TP', 'LS'], ['TL'],
  ['JK', 'BP', 'TS', 'LP'], ['TP', 'TL'], ['BS', 'TS', 'LS'], ['TP'],
  ['JK', 'BP', 'TL', 'LP'], ['TS'], ['BS', 'TP', 'LS'], ['TL'],
  ['JK', 'BP', 'TS', 'LP'], ['TP', 'TL', 'LS'], ['BS', 'TS', 'LP'], ['TP', 'LS'],
]
const CODE: Record<string, string> = {
  klempung: 'JK', 'besik-polos': 'BP', 'besik-sangsih': 'BS', 'telu-polos': 'TP',
  'telu-sanglot': 'TL', 'telu-sangsih': 'TS', 'lima-polos': 'LP', 'lima-sangsih': 'LS',
}
const ids = (events: { performerId: string }[]) => events.map((e) => e.performerId).sort()

function setup() {
  const triggers: MemberTrigger[] = []
  const tempos: { bpm: number; time: number }[] = []
  const sink: EventSink = {
    trigger: (t) => triggers.push(t),
    setTempo: (bpm, time) => tempos.push({ bpm, time }),
  }
  const core = new EngineCore(sink)
  const clock = { t: 100 }
  /** Fire one beat (the audio layer does this from the Transport). */
  const beat = () => {
    const ev = core.onBeat(clock.t)
    clock.t += ev.secondsPerBeat
    return ev
  }
  const run = (n: number) => Array.from({ length: n }, beat)
  const joinAll = () => { while (core.join()); }
  return { core, triggers, tempos, beat, run, joinAll }
}

describe('legacy migration equivalence', () => {
  const all = createSession()
  all.performers.forEach((p) => (p.joined = true))

  it('matches the old pulse 0-15 table (q -> subtick 0/3/6/9)', () => {
    for (let t = 0; t < 16; t++) {
      const beat = Math.floor(t / 4)
      const subtick = (t % 4) * 3
      const events = collectBeatEvents({
        globalBeat: beat, beatTime: 0, tempoBpm: 120, performers: all.performers,
      }).filter((e) => e.offsetSubtick === subtick)
      expect(ids(events).map((id) => CODE[id]).sort()).toEqual([...LEGACY_FIXTURE[t]].sort())
    }
  })

  it('repeats every 4 global beats', () => {
    const key = (b: number) =>
      collectBeatEvents({ globalBeat: b, beatTime: 0, tempoBpm: 120, performers: all.performers })
        .map((e) => `${e.performerId}@${e.offsetSubtick}`).join()
    for (let b = 0; b < 16; b++) expect(key(b + 4)).toBe(key(b))
  })
})

describe('START', () => {
  it('sounds JK pung at beat 0, subtick 0, exactly at the start time', () => {
    const { core, beat } = setup()
    core.markStarted()
    const first = beat()
    expect(first.beat).toBe(0)
    expect(first.events).toHaveLength(1)
    expect(first.events[0]).toMatchObject({
      performerId: 'klempung', sampleId: 'pung', offsetSubtick: 0, audioTime: 100,
    })
  })
})

describe('STOP / RESET', () => {
  it('STOP keeps joined / muted / volume / tempo and rewinds to beat 0', () => {
    const { core, beat } = setup()
    core.join(); core.join()
    core.setMuted('besik-polos', true)
    core.setVolume('besik-polos', 0.4)
    core.setTempo(150)
    core.markStarted()
    for (let i = 0; i < 3; i++) beat()
    core.markStopped()
    const s = core.getSession()
    expect(s).toMatchObject({ playing: false, globalBeat: 0, tempoBpm: 150 })
    expect(s.performers.filter((p) => p.joined)).toHaveLength(3)
    expect(s.performers.find((p) => p.id === 'besik-polos')).toMatchObject({ muted: true, volume: 0.4 })
    core.markStarted()
    expect(beat().beat).toBe(0)
  })

  it('RESET restores the initial session', () => {
    const { core } = setup()
    core.join(); core.setMuted('klempung', true); core.setTempo(200); core.setVolume('klempung', 0.2)
    core.reset()
    const s = core.getSession()
    expect(s.tempoBpm).toBe(120)
    expect(s.pendingTempoBpm).toBeNull()
    expect(s.performers.filter((p) => p.joined).map((p) => p.id)).toEqual(['klempung'])
    expect(s.performers.every((p) => !p.muted && p.volume === 1 && p.rotationBeats === 0)).toBe(true)
  })
})

describe('JOIN', () => {
  it('is strictly sequential and stops after 8', () => {
    const { core } = setup()
    for (let i = 0; i < 7; i++) expect(core.join()).toBe(true)
    expect(core.join()).toBe(false)
  })

  it('while playing: effective on the next beat boundary, at the current global beat position', () => {
    const { core, beat } = setup()
    core.markStarted()
    core.join(); core.join(); core.join() // besik-polos, besik-sangsih, telu-polos (queued)
    expect(core.getSession().performers[3].joined).toBe(false)
    const b0 = beat() // beat 0: boundary, the three joins take effect now
    expect(b0.beat).toBe(0)
    expect(core.getSession().performers[3].joined).toBe(true)
  })

  it('a voice joining mid-song enters at globalBeat % cycle, not at its first beat', () => {
    const { core, beat, run } = setup()
    core.markStarted()
    run(3) // beats 0,1,2 done; next is beat 3
    for (let i = 0; i < 3; i++) core.join() // besik-polos, besik-sangsih, telu-polos
    const b3 = beat()
    expect(b3.beat).toBe(3)
    const telu = b3.events.find((e) => e.performerId === 'telu-polos')
    // telu-polos has a 2-beat cycle: beat 3 -> index 1 (not index 0)
    expect(telu?.beatIndex).toBe(1)
  })

  it('cannot queue more joins than seats', () => {
    const { core } = setup()
    core.markStarted()
    for (let i = 0; i < 7; i++) expect(core.join()).toBe(true)
    expect(core.join()).toBe(false)
  })
})

describe('MUTE', () => {
  it('while playing: effective on the next beat boundary', () => {
    const { core, beat } = setup()
    core.markStarted()
    expect(ids(beat().events)).toEqual(['klempung'])
    core.setMuted('klempung', true)
    expect(core.getSession().performers[0].muted).toBe(false) // not yet
    expect(beat().events).toEqual([])
    core.setMuted('klempung', false)
    expect(ids(beat().events)).toEqual(['klempung'])
  })

  it('cannot mute an unjoined voice', () => {
    const { core } = setup()
    core.setMuted('telu-polos', true)
    expect(core.getSession().performers[3].muted).toBe(false)
  })
})

describe('Tempo', () => {
  it('stopped: applies immediately, clamped to 60-220', () => {
    const { core } = setup()
    core.setTempo(500); expect(core.getSession().tempoBpm).toBe(220)
    core.setTempo(10); expect(core.getSession().tempoBpm).toBe(60)
  })

  it('playing: pending until the next beat boundary, latest wins, whole beat uses one tempo', () => {
    const { core, beat, tempos } = setup()
    core.markStarted()
    beat()
    core.setTempo(140); core.setTempo(60)
    expect(core.getSession().pendingTempoBpm).toBe(60)
    expect(tempos).toEqual([])
    const b1 = beat() // boundary
    expect(tempos).toEqual([{ bpm: 60, time: b1.time }])
    expect(b1.secondsPerBeat).toBe(1) // 60 BPM
    expect(core.getSession()).toMatchObject({ tempoBpm: 60, pendingTempoBpm: null })
  })
})

describe('same-time scheduling and ensemble', () => {
  it('voices on the same subtick share one base audio time', () => {
    const { core, joinAll, beat } = setup()
    joinAll()
    core.markStarted()
    const ev = beat() // beat 0 has several voices at subtick 0
    const at0 = ev.events.filter((e) => e.offsetSubtick === 0)
    expect(at0.length).toBeGreaterThan(1)
    for (const e of at0) expect(e.audioTime).toBe(100)
  })

  it('ensemble members stay within the configured spread and member 0 is on the grid', () => {
    const { core, joinAll, triggers, beat } = setup()
    joinAll()
    core.markStarted()
    beat()
    for (const t of triggers) {
      const profile = core.getSession().performers.find((p) => p.id === t.event.performerId)!.ensemble
      const delta = t.time - t.event.audioTime
      expect(delta).toBeGreaterThanOrEqual(0)
      expect(delta).toBeLessThanOrEqual(profile.timingSpreadMs / 1000 + 1e-9)
      if (t.memberIndex === 0) expect(delta).toBe(0)
    }
    // cak groups expand into several members; the beat keeper stays one voice
    const members = (id: string) => triggers.filter((t) => t.event.performerId === id && t.event.eventIndex === 0)
    expect(members('klempung')).toHaveLength(1)
    expect(members('besik-polos').length).toBeGreaterThan(1)
  })

  it('is deterministic for a seed, and size=1 / spread=0 is exact', () => {
    const p = { size: 4, timingSpreadMs: 14, gainSpread: 0.08, seed: 201 }
    expect(buildEnsemble(p)).toEqual(buildEnsemble(p))
    expect(buildEnsemble({ ...p, seed: 202 })).not.toEqual(buildEnsemble(p))
    expect(buildEnsemble({ size: 1, timingSpreadMs: 0, gainSpread: 0, seed: 1 })).toEqual([
      { memberIndex: 0, timeOffsetSeconds: 0, gainMultiplier: 1 },
    ])
  })
})

describe('long vs short samples', () => {
  it('keeps cak-long and cak-short as distinct sample ids', () => {
    const events = collectBeatEvents({
      globalBeat: 0, beatTime: 0, tempoBpm: 120, performers: gestureAuditionPerformers,
    })
    const bySample = (id: string) => events.filter((e) => e.sampleId === id)
    expect(bySample('cak-long')).toHaveLength(1)
    expect(bySample('cak-short').length).toBeGreaterThan(1)
    expect(bySample('cak-long')[0].durationSeconds).toBe(0.5)
  })
})

describe('CUE (docs/cue-model.md)', () => {
  it('only works while playing', () => {
    const { core } = setup()
    core.toggleCue()
    expect(core.getSession().cue).toBe('idle')
  })

  it('arms immediately and starts on the next beat boundary', () => {
    const { core, beat, run } = setup()
    core.markStarted()
    run(2)
    core.toggleCue()
    expect(core.getSession().cue).toBe('armed')
    const b = beat() // beat 2: the call begins
    expect(b.beat).toBe(2)
    expect(core.getSession().cue).toBe('call')
    expect(ids(b.events)).toEqual(['klempung', 'klempung', 'klempung'])
    // the call is audible on a phone speaker: a sustained cak sits on top of the pung
    expect(b.events.map((e) => e.sampleId)).toContain('cak-long')
  })

  it('call: JK only; response: every joined voice in unison on the off-beat; then groove returns', () => {
    const { core, joinAll, beat, run } = setup()
    joinAll()
    core.markStarted()
    run(1)
    core.toggleCue()
    const cue = run(4) // beats 1..4
    // call (2 beats): beat-keeper only, offsets from CUE_CALL
    cue.slice(0, 2).forEach((ev, i) => {
      expect(ids(ev.events).every((id) => id === 'klempung')).toBe(true)
      expect(ev.events.map((e) => e.offsetSubtick)).toEqual(CUE_CALL[i].map((e) => e.offsetSubtick))
    })
    expect(core.getSession().cue).toBe('response')
    // response (2 beats): all 8 voices at each offset, first hit on subtick 6 (the off-beat)
    cue.slice(2).forEach((ev, i) => {
      for (const e of CUE_RESPONSE[i]) {
        expect(ev.events.filter((x) => x.offsetSubtick === e.offsetSubtick)).toHaveLength(8)
      }
    })
    expect(Math.min(...cue[2].events.map((e) => e.offsetSubtick))).toBe(6)
    // beat 5: back to the normal groove (beat 5 % cycle)
    const back = beat()
    expect(back.beat).toBe(5)
    expect(core.getSession().cue).toBe('idle')
    expect(back.events.some((e) => e.sampleId === 'cak-short')).toBe(true)
    expect(back.events.length).toBeGreaterThan(8) // groove, not the 8-voice unison
  })

  it('response schedules all voices on identical base times; muted voices stay silent', () => {
    const { core, joinAll, run } = setup()
    joinAll()
    core.setMuted('lima-sangsih', true)
    core.markStarted()
    core.toggleCue()
    const cue = run(4)
    const resp = cue[2].events
    expect(resp.map((e) => e.performerId)).not.toContain('lima-sangsih')
    expect(resp).toHaveLength(7)
    for (const e of resp) expect(e.audioTime).toBe(resp[0].audioTime)
  })

  it('can be cancelled while armed, is cleared by STOP, never resets the beat counter', () => {
    const { core, beat, run } = setup()
    core.markStarted()
    run(2)
    core.toggleCue(); core.toggleCue()
    expect(core.getSession().cue).toBe('idle')
    core.toggleCue()
    core.markStopped()
    expect(core.getSession().cue).toBe('idle')
    core.markStarted()
    core.toggleCue()
    const beats = [beat(), ...run(7)].map((e) => e.beat)
    expect(beats).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})

describe('visual clock', () => {
  it('interpolates the marker between beats from the audio time', () => {
    const { core, run } = setup()
    core.markStarted()
    run(2) // beat 0 at t=100, beat 1 at t=100.5
    expect(core.positionAt(100)).toBeCloseTo(0)
    expect(core.positionAt(100.25)).toBeCloseTo(0.5)
    expect(core.positionAt(100.5)).toBeCloseTo(1)
    expect(core.positionAt(101)).toBeCloseTo(2)
  })

  it('releases visual events only when their audio time has arrived', () => {
    const { core, joinAll, run } = setup()
    joinAll()
    core.markStarted()
    run(1)
    expect(core.drainVisual(99)).toHaveLength(0)
    const first = core.drainVisual(100.01)
    expect(first.every((e) => e.audioTime <= 100.01)).toBe(true)
    // later events in the same beat (subtick 6 = +0.25 s) are still held back
    expect(core.drainVisual(100.01)).toHaveLength(0)
    expect(core.drainVisual(100.3).some((e) => e.offsetSubtick === 6)).toBe(true)
  })

  it('reports position 0 when stopped', () => {
    expect(setup().core.positionAt(123)).toBe(0)
  })
})

describe('preset sets (legacy / gesture)', () => {
  const gesture = PRESET_SETS.find((s) => s.id === 'gesture')!
  const legacy = PRESET_SETS.find((s) => s.id === 'legacy')!

  it('every pattern in both sets is valid', () => {
    for (const set of PRESET_SETS) {
      for (const p of set.presets) {
        expect(() => assertVoicePattern(presetPattern(p)), `${set.id}/${p.id}`).not.toThrow()
      }
    }
  })

  it('legacy uses only single short hits; gesture adds long, double and triple', () => {
    const events = (set: typeof gesture) =>
      set.presets.flatMap((p) => presetPattern(p).beats.flatMap((cell) => cell))
    expect(events(legacy).some((e) => e.sampleId === 'cak-long')).toBe(false)
    const cells = gesture.presets.flatMap((p) => presetPattern(p).beats)
    expect(events(gesture).some((e) => e.sampleId === 'cak-long')).toBe(true)
    expect(cells.some((c) => c.length === 2)).toBe(true) // double
    expect(cells.some((c) => c.length === 3)).toBe(true) // triple
  })

  it('keeps the same seats, roles and ensembles in both sets', () => {
    expect(gesture.presets.map((p) => [p.id, p.entry, p.role, p.ensemble])).toEqual(
      legacy.presets.map((p) => [p.id, p.entry, p.role, p.ensemble]),
    )
  })

  it('switching sets resets the session into the chosen arrangement', () => {
    const { core, joinAll } = setup()
    joinAll()
    core.setTempo(180)
    core.setPresetSet(gesture)
    const s = core.getSession()
    expect(s.presetSet).toBe('gesture')
    expect(s.tempoBpm).toBe(120)
    expect(s.performers.filter((p) => p.joined).map((p) => p.id)).toEqual(['klempung'])
    expect(s.performers[1].pattern.beats[0][0].sampleId).toBe('cak-long')
    core.setPresetSet(legacy)
    expect(core.getSession().performers[1].pattern.beats[0][0].sampleId).toBe('cak-short')
  })

  it('the gesture arrangement plays a sustained cak on the downbeat and a fill at the cycle end', () => {
    const { core, joinAll, run } = setup()
    core.setPresetSet(gesture)
    joinAll()
    core.markStarted()
    const beats = run(4)
    expect(beats[0].events.filter((e) => e.sampleId === 'cak-long').length).toBeGreaterThanOrEqual(1)
    expect(beats[1].events.some((e) => e.sampleId === 'cak-long')).toBe(false)
    const tripleFill = beats[3].events.filter((e) => e.performerId === 'telu-polos')
    expect(tripleFill.map((e) => e.offsetSubtick)).toEqual([0, 4, 8])
  })
})
