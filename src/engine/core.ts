// Audio-library-independent engine core. The Tone.js layer (audio.ts) only
// supplies an EventSink and calls onBeat() once per global beat from the audio
// clock; every timing rule lives here so it is unit-testable.

import {
  collectBeatEvents,
  type ScheduledVocalEvent,
} from '../audio/beatScheduler'
import { buildEnsemble, type EnsembleMember } from '../audio/ensemble'
import { CUE_BEATS, CUE_CALL, CUE_RESPONSE } from '../data/cuePhrase'
import type { Performer } from '../domain/rhythm'
import type { PresetSet } from '../data/presetSets'
import { clampTempo, createSession, joinedCount } from './session'
import type { CuePhase, Session } from './types'

/** One sample trigger (one ensemble member of one vocal event). */
export type MemberTrigger = {
  event: ScheduledVocalEvent
  memberIndex: number
  /** Audio time, including the member's timing offset. */
  time: number
  gain: number
}

export interface EventSink {
  /** Called for every member trigger of a beat. */
  trigger(t: MemberTrigger): void
  setTempo(bpm: number, time: number): void
}

export type BeatEvent = {
  beat: number
  time: number
  secondsPerBeat: number
  events: ScheduledVocalEvent[]
}

type Command =
  | { type: 'join' }
  | { type: 'mute'; id: string; muted: boolean }

const TIMELINE_LIMIT = 8

export class EngineCore {
  private session: Session = createSession()
  private presetSet: PresetSet | null = null
  private beat = 0
  private queue: Command[] = []
  private pendingJoins = 0
  private cueArmed = false
  private cueStart: number | null = null
  private timeline: { beat: number; time: number; secondsPerBeat: number }[] = []
  private visual: ScheduledVocalEvent[] = []
  private members = new Map<string, EnsembleMember[]>()
  private listeners = new Set<() => void>()
  private snapshot: Session = this.session

  constructor(private sink: EventSink) {}

  // --- store ---------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSession = (): Session => this.snapshot

  private commit(): void {
    this.snapshot = { ...this.session, globalBeat: this.beat }
    this.listeners.forEach((l) => l())
  }

  // --- transport lifecycle -------------------------------------------------

  markStarted(): void {
    this.beat = 0
    this.clearCue()
    this.timeline = []
    this.visual = []
    this.session = { ...this.session, playing: true }
    this.commit()
  }

  /** STOP: back to beat 0, keep joined / muted / volume / tempo. */
  markStopped(): void {
    this.clearCue()
    this.applyQueue()
    const pending = this.session.pendingTempoBpm
    this.session = {
      ...this.session,
      playing: false,
      cue: 'idle',
      tempoBpm: pending ?? this.session.tempoBpm,
      pendingTempoBpm: null,
    }
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  /** RESET: restore the complete initial session. Caller stops audio first. */
  reset(): void {
    this.session = this.presetSet
      ? createSession(this.presetSet.presets, this.presetSet.id)
      : createSession()
    this.members.clear()
    this.queue = []
    this.pendingJoins = 0
    this.clearCue()
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  /** Switch arrangement: a full reset into the chosen preset set. */
  setPresetSet(set: PresetSet): void {
    this.presetSet = set
    this.reset()
  }

  private clearCue(): void {
    this.cueArmed = false
    this.cueStart = null
  }

  // --- commands ------------------------------------------------------------

  /** Next voice that can be joined (strictly sequential), if any. */
  nextJoinable(): Performer | undefined {
    return this.session.performers[joinedCount(this.session) + this.pendingJoins]
  }

  join(): boolean {
    if (!this.nextJoinable()) return false
    if (!this.session.playing) {
      this.applyJoin()
      this.commit()
    } else {
      this.queue.push({ type: 'join' })
      this.pendingJoins++
    }
    return true
  }

  setMuted(id: string, muted: boolean): void {
    if (!this.session.playing) {
      this.applyMute(id, muted)
      this.commit()
    } else {
      this.queue.push({ type: 'mute', id, muted })
    }
  }

  /** Volume applies immediately (the audio layer ramps the gain). */
  setVolume(id: string, volume: number): void {
    const v = Math.min(1, Math.max(0, volume))
    this.session = {
      ...this.session,
      performers: this.session.performers.map((p) =>
        p.id === id ? { ...p, volume: v } : p,
      ),
    }
    this.commit()
  }

  setTempo(bpm: number): void {
    const next = clampTempo(bpm)
    if (!this.session.playing) {
      this.session = { ...this.session, tempoBpm: next, pendingTempoBpm: null }
    } else {
      // Latest request wins; applied at the next global-beat boundary.
      this.session = { ...this.session, pendingTempoBpm: next }
    }
    this.commit()
  }

  /** Arm a cue (starts at the next beat boundary); toggles while armed. */
  toggleCue(): void {
    if (!this.session.playing) return
    if (this.cueStart !== null) return // a cue is already running
    this.cueArmed = !this.cueArmed
    this.session = { ...this.session, cue: this.cueArmed ? 'armed' : 'idle' }
    this.commit()
  }

  private applyJoin(): void {
    const target = this.session.performers.find((p) => !p.joined)
    if (!target) return
    this.session = {
      ...this.session,
      performers: this.session.performers.map((p) =>
        p.id === target.id ? { ...p, joined: true } : p,
      ),
    }
  }

  private applyMute(id: string, muted: boolean): void {
    this.session = {
      ...this.session,
      performers: this.session.performers.map((p) =>
        p.id === id && p.joined ? { ...p, muted } : p,
      ),
    }
  }

  private applyQueue(): boolean {
    if (this.queue.length === 0) return false
    for (const cmd of this.queue) {
      if (cmd.type === 'join') this.applyJoin()
      else this.applyMute(cmd.id, cmd.muted)
    }
    this.queue = []
    this.pendingJoins = 0
    return true
  }

  // --- beat ----------------------------------------------------------------

  /**
   * Called from the audio clock once per global beat. The first call after
   * markStarted() is beat 0 and sounds at the transport start time.
   * JOIN / MUTE / tempo requests take effect here, on the beat boundary.
   */
  onBeat(beatTime: number): BeatEvent {
    const beat = this.beat
    let changed = this.applyQueue()

    const pending = this.session.pendingTempoBpm
    if (pending !== null) {
      this.session = { ...this.session, tempoBpm: pending, pendingTempoBpm: null }
      this.sink.setTempo(pending, beatTime)
      changed = true
    }
    const tempoBpm = this.session.tempoBpm
    const secondsPerBeat = 60 / tempoBpm

    if (this.cueStart !== null && beat - this.cueStart >= CUE_BEATS) {
      this.cueStart = null
    }
    if (this.cueArmed && this.cueStart === null) {
      this.cueArmed = false
      this.cueStart = beat
    }
    let phase: CuePhase = this.cueArmed ? 'armed' : 'idle'
    let performers: readonly Performer[] = this.session.performers
    let globalBeat = beat
    if (this.cueStart !== null) {
      const rel = beat - this.cueStart
      phase = rel < CUE_CALL.length ? 'call' : 'response'
      performers = cueVoices(this.session.performers, rel)
      globalBeat = 0
    }
    if (phase !== this.session.cue) {
      this.session = { ...this.session, cue: phase }
      changed = true
    }

    const events = collectBeatEvents({
      globalBeat,
      beatTime,
      tempoBpm,
      performers,
    })
    const byId = new Map(this.session.performers.map((p) => [p.id, p]))
    for (const event of events) {
      const profile = byId.get(event.performerId)!.ensemble
      for (const m of this.membersFor(event.performerId, profile)) {
        this.sink.trigger({
          event,
          memberIndex: m.memberIndex,
          time: event.audioTime + m.timeOffsetSeconds,
          gain: event.gain * m.gainMultiplier,
        })
      }
    }

    this.timeline.push({ beat, time: beatTime, secondsPerBeat })
    if (this.timeline.length > TIMELINE_LIMIT) this.timeline.shift()
    this.visual.push(...events)

    this.beat = beat + 1
    if (changed) this.commit()
    return { beat, time: beatTime, secondsPerBeat, events }
  }

  private membersFor(id: string, profile: Performer['ensemble']): EnsembleMember[] {
    let m = this.members.get(id)
    if (!m) {
      m = buildEnsemble(profile)
      this.members.set(id, m)
    }
    return m
  }

  // --- visuals (audio-clock driven, read by requestAnimationFrame) ---------

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
    const frac = Math.min(1, Math.max(0, (now - cur.time) / span))
    return cur.beat + frac
  }

  /** Vocal events whose audio time has arrived. */
  drainVisual(now: number): ScheduledVocalEvent[] {
    const due: ScheduledVocalEvent[] = []
    const rest: ScheduledVocalEvent[] = []
    for (const e of this.visual) (e.audioTime <= now ? due : rest).push(e)
    this.visual = rest
    return due
  }
}

/**
 * Synthetic one-beat performers for a cue beat: the call is voiced by the beat
 * keeper only; the response by every joined, unmuted voice with its own sample.
 */
function cueVoices(performers: readonly Performer[], rel: number): Performer[] {
  if (rel < CUE_CALL.length) {
    return performers
      .filter((p) => p.role === 'beat-keeper')
      .map((p) => ({ ...p, pattern: { beats: [CUE_CALL[rel]] }, rotationBeats: 0 }))
  }
  const cell = CUE_RESPONSE[rel - CUE_CALL.length]
  return performers.map((p) => {
    const sampleId = p.role === 'beat-keeper' ? ('pung' as const) : ('cak-short' as const)
    return {
      ...p,
      pattern: { beats: [cell.map((e) => ({ ...e, sampleId }))] },
      rotationBeats: 0,
    }
  })
}
