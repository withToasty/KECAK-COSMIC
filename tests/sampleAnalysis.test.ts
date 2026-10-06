import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MAX_TRIM_DB,
  ONSET_PREROLL_SECONDS,
  TARGET_RMS_DB,
  analyze,
  audibleRms,
  detectOnset,
  trimFor,
} from '../src/audio/sampleAnalysis'

const RATE = 44100

/** `lead` seconds of silence, then `body` seconds of a tone at `amp`. */
function burst(lead: number, body: number, amp: number, softLead = 0): Float32Array {
  const n = Math.floor((lead + body) * RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    if (t >= lead) out[i] = amp * Math.sin(2 * Math.PI * 440 * (t - lead))
    else if (softLead > 0 && t >= lead / 2) out[i] = softLead * Math.sin(2 * Math.PI * 300 * t)
  }
  return out
}

const db = (x: number) => 20 * Math.log10(x)

describe('detectOnset', () => {
  it('skips the leading silence and keeps a short pre-roll', () => {
    const t = detectOnset(burst(0.04, 0.1, 0.5), RATE)
    expect(t).toBeGreaterThan(0.04 - ONSET_PREROLL_SECONDS - 0.002)
    expect(t).toBeLessThan(0.04)
  })

  it('ignores a quiet breath before the main attack (the long recording starts like that)', () => {
    // 100 ms lead with a soft tone at 3% of the body level, then the loud part
    const t = detectOnset(burst(0.1, 0.3, 0.5, 0.015), RATE)
    expect(t).toBeGreaterThan(0.09)
  })

  it('returns 0 for a sound that starts at once and for silence', () => {
    expect(detectOnset(burst(0, 0.1, 0.5), RATE)).toBe(0)
    expect(detectOnset(new Float32Array(1000), RATE)).toBe(0)
    expect(detectOnset(new Float32Array(0), RATE)).toBe(0)
  })

  it('lands recordings with different lead-in on the same grid time', () => {
    // After skipping the detected onset both attacks begin within the pre-roll.
    const a = detectOnset(burst(0.04, 0.1, 0.5), RATE)
    const b = detectOnset(burst(0.107, 0.3, 0.5), RATE)
    const remainingA = 0.04 - a
    const remainingB = 0.107 - b
    expect(Math.abs(remainingA - remainingB)).toBeLessThan(0.002)
  })
})

describe('level trim', () => {
  it('measures only the audible part, not the silence around it', () => {
    const quietPadding = burst(0.5, 0.1, 0.5)
    const tight = burst(0, 0.1, 0.5)
    expect(db(audibleRms(quietPadding, RATE))).toBeCloseTo(db(audibleRms(tight, RATE)), 0)
    expect(db(audibleRms(tight, RATE))).toBeCloseTo(db(0.5 / Math.SQRT2), 0)
  })

  it('brings quiet and loud samples to the same level', () => {
    for (const amp of [0.05, 0.2, 0.5]) {
      const data = burst(0.02, 0.2, amp)
      const trim = analyze(data, RATE).trimDb
      expect(db(audibleRms(data, RATE)) + trim).toBeCloseTo(TARGET_RMS_DB, 0)
    }
  })

  it('never trims by more than the cap, and leaves silence alone', () => {
    expect(trimFor(1e-6)).toBe(MAX_TRIM_DB)
    expect(trimFor(10)).toBe(-MAX_TRIM_DB)
    expect(trimFor(0)).toBe(0)
    expect(analyze(new Float32Array(500), RATE)).toEqual({ onsetSeconds: 0, trimDb: 0 })
  })
})

describe('the shipped placeholder samples (16-bit mono WAV)', () => {
  function wav(name: string): { data: Float32Array; rate: number } {
    const buf = readFileSync(new URL(`../public/sounds/${name}`, import.meta.url))
    const rate = buf.readUInt32LE(24)
    const samples = (buf.length - 44) / 2
    const data = new Float32Array(samples)
    for (let i = 0; i < samples; i++) data[i] = buf.readInt16LE(44 + i * 2) / 32768
    return { data, rate }
  }

  it('start at once and are all trimmed within the cap', () => {
    for (const name of ['pung-01.wav', 'sir-01.wav', 'cak-short-01.wav', 'cak-long-01.wav']) {
      const { data, rate } = wav(name)
      const info = analyze(data, rate)
      expect(info.onsetSeconds, name).toBeLessThan(0.005)
      expect(Math.abs(info.trimDb), name).toBeLessThanOrEqual(MAX_TRIM_DB)
    }
  })

  it('their very different raw levels end up within 1 dB of each other', () => {
    const levels = ['pung-01.wav', 'sir-01.wav', 'cak-short-01.wav'].map((name) => {
      const { data, rate } = wav(name)
      return db(audibleRms(data, rate)) + analyze(data, rate).trimDb
    })
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThan(1)
  })
})
