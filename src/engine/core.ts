// Audio-library-independent engine core. The Tone.js layer (audio.ts) only
// supplies an EventSink and calls onBeat() once per global beat from the audio
// clock; every timing rule lives here so it is unit-testable.

import {
  collectBeatEvents,
  type ScheduledVocalEvent,
} from '../audio/beatScheduler'
import { buildEnsemble, type EnsembleMember } from '../audio/ensemble'
import { CUES, CUE_BEATS, CUE_CALL_BEATS, type CueDef } from '../data/cuePhrase'
import type { PresetSet } from '../data/presetSets'
import {
  assertVoicePattern,
  type EnsembleProfile,
  type Performer,
  type VoicePattern,
} from '../domain/rhythm'
import {
  audiblePerformers,
  clampEnsemble,
  clampPattern,
  clampTempo,
  createCustomPerformer,
  createSession,
  normalizeRotation,
} from './session'
import {
  MAX_EVENTS_PER_BEAT,
  MAX_PERFORMERS,
  SOFT_GAIN,
  type CueKind,
  type CuePhase,
  type Dynamics,
  type Session,
} from './types'

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

/** A session edit: applied at once when stopped, on the next beat boundary when playing. */
type Edit = (s: Session) => Session

const TIMELINE_LIMIT = 8

export class EngineCore {
  private session: Session = createSession()
  private presetSet: PresetSet | null = null
  private beat = 0
  private queue: Edit[] = []
  private pendingJoinIds = new Set<string>()
  private cueArmed: CueKind | null = null
  private cueStart: number | null = null
  private cueRunning: CueKind | null = null
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
    this.flushQueue()
    const pending = this.session.pendingTempoBpm
    this.session = {
      ...this.session,
      playing: false,
      cue: 'idle',
      cueKind: null,
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
    this.pendingJoinIds.clear()
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

  /** Replace the whole arrangement (saved preset / share code). Caller stops audio first. */
  loadArrangement(a: {
    tempoBpm: number
    dynamics: Dynamics
    performers: Performer[]
    presetSet?: string
  }): void {
    this.session = {
      ...createSession([], a.presetSet ?? 'custom'),
      tempoBpm: clampTempo(a.tempoBpm),
      dynamics: a.dynamics,
      performers: a.performers.map((p, i) => ({ ...p, entry: i + 1 })),
    }
    this.members.clear()
    this.queue = []
    this.pendingJoinIds.clear()
    this.clearCue()
    this.beat = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  private clearCue(): void {
    this.cueArmed = null
    this.cueStart = null
    this.cueRunning = null
  }

  // --- edits (immediate when stopped, beat boundary when playing) ------------

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

  private mapPerformer(id: string, fn: (p: Performer) => Performer): Edit {
    return (s) => ({
      ...s,
      performers: s.performers.map((p) => (p.id === id ? fn(p) : p)),
    })
  }

  /** Next voice that the `JOIN NEXT VOICE` button would bring in. */
  nextJoinable(): Performer | undefined {
    return this.session.performers.find(
      (p) => !p.joined && !this.pendingJoinIds.has(p.id),
    )
  }

  /** Join a specific voice, or the next one in seat order. */
  join(id?: string): boolean {
    const target = id
      ? this.session.performers.find((p) => p.id === id)
      : this.nextJoinable()
    if (!target || target.joined || this.pendingJoinIds.has(target.id)) return false
    this.pendingJoinIds.add(target.id)
    this.edit(this.mapPerformer(target.id, (p) => ({ ...p, joined: true })))
    return true
  }

  leave(id: string): void {
    this.edit(
      this.mapPerformer(id, (p) =>
        p.joined ? { ...p, joined: false, muted: false, solo: false } : p,
      ),
    )
  }

  setMuted(id: string, muted: boolean): void {
    this.edit(this.mapPerformer(id, (p) => (p.joined ? { ...p, muted } : p)))
  }

  setSolo(id: string, solo: boolean): void {
    this.edit(this.mapPerformer(id, (p) => (p.joined ? { ...p, solo } : p)))
  }

  /** Volume applies immediately (the next trigger uses it). */
  setVolume(id: string, volume: number): void {
    const v = Math.min(1, Math.max(0, volume))
    this.session = this.mapPerformer(id, (p) => ({ ...p, volume: v }))(this.session)
    this.commit()
  }

  setPattern(id: string, pattern: VoicePattern): void {
    const next = clampPattern(pattern)
    assertVoicePattern(next)
    for (const cell of next.beats) {
      if (cell.length > MAX_EVENTS_PER_BEAT) throw new Error('too many events in a beat')
    }
    this.edit(
      this.mapPerformer(id, (p) => ({
        ...p,
        pattern: next,
        rotationBeats: normalizeRotation(p.rotationBeats, next.beats.length),
      })),
    )
  }

  setRotation(id: string, rotationBeats: number): void {
    this.edit(
      this.mapPerformer(id, (p) => ({
        ...p,
        rotationBeats: normalizeRotation(rotationBeats, p.pattern.beats.length),
      })),
    )
  }

  setEnsemble(id: string, ensemble: EnsembleProfile): void {
    const next = clampEnsemble(ensemble)
    this.edit(this.mapPerformer(id, (p) => ({ ...p, ensemble: next })))
  }

  /** Add a user-made voice (a single short cak on the beat). */
  addVoice(): boolean {
    if (this.session.performers.length >= MAX_PERFORMERS) return false
    this.edit((s) => {
      if (s.performers.length >= MAX_PERFORMERS) return s
      const ids = s.performers.map((p) => p.id)
      const voice = createCustomPerformer(s.performers.length + 1, ids)
      return { ...s, performers: [...s.performers, voice] }
    })
    return true
  }

  /** Remove a user-made voice. Preset voices can only leave or mute. */
  removeVoice(id: string): void {
    this.edit((s) => {
      const target = s.performers.find((p) => p.id === id)
      if (!target?.custom) return s
      return {
        ...s,
        performers: s.performers
          .filter((p) => p.id !== id)
          .map((p, i) => ({ ...p, entry: i + 1 })),
      }
    })
  }

  setDynamics(dynamics: Dynamics): void {
    this.edit((s) => ({ ...s, dynamics }))
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

  /**
   * Arm a cue (starts at the next beat boundary). Pressing the armed cue again
   * cancels it; pressing the other cue while armed switches to it.
   */
  toggleCue(kind: CueKind = 'call'): void {
    if (!this.session.playing) return
    if (this.cueStart !== null) return // a cue is already running
    this.cueArmed = this.cueArmed === kind ? null : kind
    this.session = {
      ...this.session,
      cue: this.cueArmed ? 'armed' : 'idle',
      cueKind: this.cueArmed,
    }
    this.commit()
  }

  // --- beat ----------------------------------------------------------------

  /**
   * Called from the audio clock once per global beat. The first call after
   * markStarted() is beat 0 and sounds at the transport start time.
   * Every edit / tempo request takes effect here, on the beat boundary.
   */
  onBeat(beatTime: number): BeatEvent {
    const beat = this.beat
    let changed = this.flushQueue()

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
      this.cueRunning = null
    }
    if (this.cueArmed && this.cueStart === null) {
      this.cueRunning = this.cueArmed
      this.cueArmed = null
      this.cueStart = beat
    }
    let phase: CuePhase = this.cueArmed ? 'armed' : 'idle'
    const kind = this.cueRunning ?? this.cueArmed
    const audible = audiblePerformers(this.session.performers)
    let performers: readonly Performer[] = audible
    let globalBeat = beat
    if (this.cueStart !== null && this.cueRunning) {
      const rel = beat - this.cueStart
      phase = rel < CUE_CALL_BEATS ? 'call' : 'response'
      performers = cueVoices(audible, rel, CUES[this.cueRunning])
      globalBeat = 0
    }
    if (phase !== this.session.cue || kind !== this.session.cueKind) {
      this.session = { ...this.session, cue: phase, cueKind: kind }
      changed = true
    }

    const events = collectBeatEvents({
      globalBeat,
      beatTime,
      tempoBpm,
      performers,
    })
    const level = this.session.dynamics === 'soft' ? SOFT_GAIN : 1
    const byId = new Map(this.session.performers.map((p) => [p.id, p]))
    for (const event of events) {
      const profile = byId.get(event.performerId)!.ensemble
      for (const m of this.membersFor(event.performerId, profile)) {
        this.sink.trigger({
          event,
          memberIndex: m.memberIndex,
          time: event.audioTime + m.timeOffsetSeconds,
          gain: event.gain * m.gainMultiplier * level,
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

  private membersFor(id: string, profile: EnsembleProfile): EnsembleMember[] {
    const key = `${id}|${profile.size}|${profile.timingSpreadMs}|${profile.gainSpread}|${profile.seed}`
    let m = this.members.get(key)
    if (!m) {
      m = buildEnsemble(profile)
      this.members.set(key, m)
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
 * keeper only; the response by every audible voice with its own sample.
 */
function cueVoices(
  audible: readonly Performer[],
  rel: number,
  cue: CueDef,
): Performer[] {
  if (rel < CUE_CALL_BEATS) {
    return audible
      .filter((p) => p.role === 'beat-keeper')
      .map((p) => ({ ...p, pattern: { beats: [cue.call[rel]] }, rotationBeats: 0 }))
  }
  const cell = cue.response[rel - CUE_CALL_BEATS]
  return audible.map((p) => {
    const sampleId = p.role === 'beat-keeper' ? ('pung' as const) : ('cak-short' as const)
    return {
      ...p,
      pattern: { beats: [cell.map((e) => ({ ...e, sampleId }))] },
      rotationBeats: 0,
    }
  })
}
