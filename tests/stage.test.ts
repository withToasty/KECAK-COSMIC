import { describe, expect, it } from 'vitest'
import { decodeArrangement, encodeArrangement } from '../src/data/arrangement'
import { findPreset, PRESET_SETS } from '../src/data/presetSets'
import { presetPattern } from '../src/data/kecakPresets'
import { BOARD_COLUMNS, STAGE_PRESETS } from '../src/data/stagePresets'
import { assertVoicePattern } from '../src/domain/rhythm'
import { EngineCore, type EventSink } from '../src/engine/core'
import { createSession } from '../src/engine/session'

const stage = PRESET_SETS.find((s) => s.id === 'stage')!

/** Board column (0-15) of every event, as the board's 4 beats x 4 columns. */
function columns(id: string): number[] {
  const p = presetPattern(STAGE_PRESETS.find((x) => x.id === id)!)
  return p.beats.flatMap((cell, beat) =>
    cell.map((e) => beat * 4 + e.offsetSubtick / 3),
  )
}

describe('Stage 4 (stage board reading)', () => {
  it('reproduces the columns read from the board photo', () => {
    expect(columns('stage-pnyacha')).toEqual([0, 2, 4, 6, 8, 10, 12])
    expect(columns('stage-lima')).toEqual([2, 5, 8, 11, 14])
    expect(columns('stage-nem')).toEqual([0, 3, 6, 9, 12, 14])
    expect(columns('stage-pnyanglot')).toEqual([1, 4, 7, 10, 13, 15])
    expect(columns('stage-tambur')).toEqual([0, 4, 8, 12])
  })

  it('every pattern is a valid 4-beat cycle on the integer subtick grid', () => {
    for (const p of STAGE_PRESETS) {
      const pattern = presetPattern(p)
      expect(() => assertVoicePattern(pattern)).not.toThrow()
      expect(pattern.beats).toHaveLength(4)
    }
  })

  it('the four rhythm patterns together fill all 16 columns (the board\'s combined row)', () => {
    const union = new Set(Object.values(BOARD_COLUMNS).flat())
    expect([...union].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i))
  })

  it('Penyanglot is Cak Nem shifted by one column (mod 16)', () => {
    const shifted = BOARD_COLUMNS.nem.map((c) => (c + 1) % 16).sort((a, b) => a - b)
    expect([...BOARD_COLUMNS.pnyanglot]).toEqual(shifted)
  })

  it('tambur: Sirrr on beat 1, Pung on beats 2-4', () => {
    const t = presetPattern(STAGE_PRESETS[0])
    expect(t.beats.map((cell) => cell[0].sampleId)).toEqual(['sir', 'pung', 'pung', 'pung'])
  })

  it('is recorded as a stage-board reading, not a scholarly source', () => {
    for (const p of STAGE_PRESETS) {
      expect(p.transcriptionStatus).toBe('stage-board')
      expect(p.sourceNote).toMatch(/not a scholarly source/)
    }
  })

  it('plays: beat 0 starts with the sirrr, the cak voices interlock, and the cycle repeats every 4 beats', () => {
    const sink: EventSink = { trigger: () => {}, setTempo: () => {} }
    const core = new EngineCore(sink)
    core.setPresetSet(stage)
    while (core.join());
    core.markStarted()
    let t = 0
    const beats = Array.from({ length: 8 }, () => {
      const b = core.onBeat(t)
      t += b.secondsPerBeat
      return b
    })
    expect(beats[0].events.find((e) => e.performerId === 'stage-tambur')?.sampleId).toBe('sir')
    const key = (i: number) => beats[i].events.map((e) => `${e.performerId}@${e.offsetSubtick}`).join()
    for (let i = 0; i < 4; i++) expect(key(i + 4)).toBe(key(i))
  })

  it('findPreset resolves voices of every set; share code round-trips the stage session', () => {
    expect(findPreset('stage-nem')?.shortLabel).toBe('CN')
    expect(findPreset('klempung')?.shortLabel).toBe('JK')
    const session = createSession(STAGE_PRESETS, 'stage')
    session.performers.forEach((p) => (p.joined = true))
    expect(decodeArrangement(encodeArrangement(session)).performers).toEqual(session.performers)
  })
})
