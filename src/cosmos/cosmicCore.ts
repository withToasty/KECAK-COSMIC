// Audio-library-independent core of COSMIC MODE. Same contract as the Kecak
// core: the audio layer calls onBeat() once per global beat from the audio
// clock; JOIN / MUTE / tempo take effect on the beat boundary.

import {
  COSMIC_SYSTEMS,
  findBody,
  findSystem,
  type CosmicBody,
  type SourceType,
  type SystemId,
} from './bodies'
import { eventOffsetsInBeat, periodsInBeats, pitchHz } from './compress'
import { clampTempo } from '../engine/session'

export type CosmicVoice = {
  id: string
  joined: boolean
  muted: boolean
  volume: number
}

export type CosmicSession = {
  systemId: SystemId
  /** Beats the fastest body of the system needs for one revolution. */
  fastestBeats: number
  tempoBpm: number
  pendingTempoBpm: number | null
  globalBeat: number
  playing: boolean
  voices: CosmicVoice[]
}

export type CosmicTrigger = {
  bodyId: string
  sourceType: SourceType
  hz: number
  time: number
  durationSeconds: number
  gain: number
  /** Another body sounds within a hair of this one. */
  conjunction: boolean
}

export interface CosmicSink {
  trigger(t: CosmicTrigger): void
  setTempo(bpm: number, time: number): void
}

export type CosmicBeat = {
  beat: number
  time: number
  secondsPerBeat: number
  triggers: CosmicTrigger[]
}

export const FASTEST_BEATS_MIN = 1
export const FASTEST_BEATS_MAX = 16
export const CONJUNCTION_WINDOW_BEATS = 0.08
const TYPE_GAIN: Record<SourceType, number> = { planet: 0.9, moon: 0.8, satellite: 0.7 }
const CONJUNCTION_BOOST = 1.15
const TEMPO_DEFAULT = 100
const TIMELINE_LIMIT = 8

export function createCosmicSession(systemId: SystemId = 'jupiter'): CosmicSession {
  const system = findSystem(systemId)
  const ordered = orderedBodies(systemId)
  return {
    systemId,
    fastestBeats: system.fastestBeats,
    tempoBpm: TEMPO_DEFAULT,
    pendingTempoBpm: null,
    globalBeat: 0,
    playing: false,
    voices: ordered.map((b, i) => ({ id: b.id, joined: i === 0, muted: false, volume: 1 })),
  }
}

/** Bodies of a system, fastest first (innermost orbit first). */
export function orderedBodies(systemId: SystemId): CosmicBody[] {
  return findSystem(systemId)
    .bodies.map((id) => findBody(id)!)
    .sort((a, b) => a.realPeriodSeconds - b.realPeriodSeconds)
}

type Edit = (s: CosmicSession) => CosmicSession

export class CosmicCore {
  private session = createCosmicSession()
  private snapshot = this.session
  private beat = 0
  private queue: Edit[] = []
  private pendingJoinIds = new Set<string>()
  private listeners = new Set<() => void>()
  private timeline: { beat: number; time: number; secondsPerBeat: number }[] = []
  private visual: { bodyId: string; time: number; conjunction: boolean }[] = []

  constructor(private sink: CosmicSink) {}

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getSession = (): CosmicSession => this.snapshot

  private commit(): void {
    this.snapshot = { ...this.session, globalBeat: this.beat }
    this.listeners.forEach((l) => l())
  }

  // --- derived values --------------------------------------------------------

  private bodies(): CosmicBody[] {
    return orderedBodies(this.session.systemId)
  }

  /** Period of every body of the current system in beats. */
  periods(): Map<string, number> {
    return periodsInBeats(this.bodies(), this.session.fastestBeats)
  }

  // --- lifecycle -------------------------------------------------------------

  markStarted(): void {
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.session = { ...this.session, playing: true }
    this.commit()
  }

  markStopped(): void {
    this.flushQueue()
    const pending = this.session.pendingTempoBpm
    this.session = {
      ...this.session,
      playing: false,
      tempoBpm: pending ?? this.session.tempoBpm,
      pendingTempoBpm: null,
    }
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  /** Back to a fresh session of `systemId` (default: the current system). */
  reset(systemId: SystemId = this.session.systemId): void {
    this.session = createCosmicSession(systemId)
    this.queue = []
    this.pendingJoinIds.clear()
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  // --- edits -----------------------------------------------------------------

  private edit(fn: Edit): void {
    if (!this.session.playing) {
      this.session = fn(this.session)
      this.commit()
    } else {
      this.queue.push(fn)
    }
  }

  private flushQueue(): boolean {
    if (this.queue.length === 0) return false
    for (const fn of this.queue) this.session = fn(this.session)
    this.queue = []
    this.pendingJoinIds.clear()
    return true
  }

  private mapVoice(id: string, fn: (v: CosmicVoice) => CosmicVoice): Edit {
    return (s) => ({ ...s, voices: s.voices.map((v) => (v.id === id ? fn(v) : v)) })
  }

  nextJoinable(): CosmicVoice | undefined {
    return this.session.voices.find((v) => !v.joined && !this.pendingJoinIds.has(v.id))
  }

  /** Bring a body in (any order), or the next-slowest one. */
  join(id?: string): boolean {
    const target = id ? this.session.voices.find((v) => v.id === id) : this.nextJoinable()
    if (!target || target.joined || this.pendingJoinIds.has(target.id)) return false
    this.pendingJoinIds.add(target.id)
    this.edit(this.mapVoice(target.id, (v) => ({ ...v, joined: true })))
    return true
  }

  leave(id: string): void {
    this.edit(this.mapVoice(id, (v) => (v.joined ? { ...v, joined: false, muted: false } : v)))
  }

  setMuted(id: string, muted: boolean): void {
    this.edit(this.mapVoice(id, (v) => (v.joined ? { ...v, muted } : v)))
  }

  setVolume(id: string, volume: number): void {
    const vol = Math.min(1, Math.max(0, volume))
    this.session = this.mapVoice(id, (v) => ({ ...v, volume: vol }))(this.session)
    this.commit()
  }

  setTempo(bpm: number): void {
    const next = clampTempo(bpm)
    this.session = this.session.playing
      ? { ...this.session, pendingTempoBpm: next }
      : { ...this.session, tempoBpm: next, pendingTempoBpm: null }
    this.commit()
  }

  /** Compression: stopped only, because every period (and phase) changes at once. */
  setFastestBeats(beats: number): boolean {
    if (this.session.playing) return false
    const v = Math.min(FASTEST_BEATS_MAX, Math.max(FASTEST_BEATS_MIN, Math.round(beats * 2) / 2))
    this.session = { ...this.session, fastestBeats: v }
    this.commit()
    return true
  }

  /** Switch system: a fresh session. Caller stops audio first. */
  setSystem(id: SystemId): void {
    if (!COSMIC_SYSTEMS.some((s) => s.id === id)) return
    this.reset(id)
  }

  // --- beat ------------------------------------------------------------------

  onBeat(beatTime: number): CosmicBeat {
    const beat = this.beat
    let changed = this.flushQueue()

    const pending = this.session.pendingTempoBpm
    if (pending !== null) {
      this.session = { ...this.session, tempoBpm: pending, pendingTempoBpm: null }
      this.sink.setTempo(pending, beatTime)
      changed = true
    }
    const secondsPerBeat = 60 / this.session.tempoBpm

    const bodies = this.bodies()
    const periods = periodsInBeats(bodies, this.session.fastestBeats)
    const allSeconds = bodies.map((b) => b.realPeriodSeconds)
    const voices = new Map(this.session.voices.map((v) => [v.id, v]))

    type Raw = { body: CosmicBody; offset: number }
    const raw: Raw[] = []
    for (const body of bodies) {
      const v = voices.get(body.id)!
      if (!v.joined || v.muted) continue
      for (const offset of eventOffsetsInBeat(periods.get(body.id)!, beat)) {
        raw.push({ body, offset })
      }
    }
    raw.sort((a, b) => a.offset - b.offset)

    // Conjunction: two different bodies sounding within a hair of each other.
    const near = (a: Raw, b: Raw) =>
      a.body.id !== b.body.id && Math.abs(a.offset - b.offset) <= CONJUNCTION_WINDOW_BEATS
    const triggers: CosmicTrigger[] = raw.map((r) => {
      const conjunction = raw.some((o) => o !== r && near(r, o))
      const period = periods.get(r.body.id)!
      const volume = voices.get(r.body.id)!.volume
      return {
        bodyId: r.body.id,
        sourceType: r.body.sourceType,
        hz: pitchHz(r.body.realPeriodSeconds, allSeconds),
        time: beatTime + r.offset * secondsPerBeat,
        durationSeconds: Math.min(1.4, Math.max(0.2, 0.18 + 0.08 * period)),
        gain: volume * TYPE_GAIN[r.body.sourceType] * (conjunction ? CONJUNCTION_BOOST : 1),
        conjunction,
      }
    })
    for (const t of triggers) {
      this.sink.trigger(t)
      this.visual.push({ bodyId: t.bodyId, time: t.time, conjunction: t.conjunction })
    }

    this.timeline.push({ beat, time: beatTime, secondsPerBeat })
    if (this.timeline.length > TIMELINE_LIMIT) this.timeline.shift()
    this.beat = beat + 1
    if (changed) this.commit()
    return { beat, time: beatTime, secondsPerBeat, triggers }
  }

  // --- visuals ---------------------------------------------------------------

  /** Fractional global-beat position at audio time `now` (0 when stopped). */
  positionAt(now: number): number {
    const tl = this.timeline
    if (!this.session.playing || tl.length === 0) return 0
    let i = -1
    for (let k = 0; k < tl.length; k++) {
      if (tl[k].time <= now) i = k
      else break
    }
    if (i < 0) return tl[0].beat
    const cur = tl[i]
    const next = tl[i + 1]
    const span = next ? next.time - cur.time : cur.secondsPerBeat
    return cur.beat + Math.min(1, Math.max(0, (now - cur.time) / span))
  }

  drainVisual(now: number): { bodyId: string; time: number; conjunction: boolean }[] {
    const due: typeof this.visual = []
    const rest: typeof this.visual = []
    for (const e of this.visual) (e.time <= now ? due : rest).push(e)
    this.visual = rest
    return due
  }
}
