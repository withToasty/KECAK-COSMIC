// Audio-library-independent engine core. The Tone.js layer (audio.ts) only
// supplies a PulseSink and drives onPulse() from the audio clock, which keeps
// all timing rules unit-testable.

import {
  CUE_LENGTH,
  clampTempo,
  createSession,
  cueHitsAt,
  hitsAtPulse,
  joinedCount,
} from './session'
import { CUE_CALL } from '../data/cuePhrase'
import {
  PULSES_PER_BEAT,
  type CuePhase,
  type Hit,
  type Performer,
  type Session,
} from './types'

export type VisualHit = { id: string; position: number }

export type PulseEvent = {
  pulse: number
  /** Audio-clock time the pulse sounds at. */
  time: number
  hits: VisualHit[]
}

export interface PulseSink {
  /** Every call for one pulse receives the identical `time`. */
  play(performer: Performer, hit: Hit, time: number): void
  setTempo(bpm: number, time: number): void
}

type Command =
  | { type: 'join' }
  | { type: 'mute'; id: string; muted: boolean }

const TIMELINE_LIMIT = 16

export class EngineCore {
  private session: Session = createSession()
  private pulse = 0
  private queue: Command[] = []
  private pendingJoins = 0
  private cueArmed = false
  private cueStart: number | null = null
  private timeline: { pulse: number; time: number }[] = []
  private visual: PulseEvent[] = []
  private listeners = new Set<() => void>()
  private snapshot: Session = this.session

  constructor(private sink: PulseSink) {}

  // --- store ---------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSession = (): Session => this.snapshot

  /** Latest pulse index, read without triggering React updates. */
  getPulse(): number {
    return this.pulse
  }

  private commit(): void {
    this.snapshot = { ...this.session, globalPulse: this.pulse }
    this.listeners.forEach((l) => l())
  }

  // --- transport lifecycle -------------------------------------------------

  markStarted(): void {
    this.pulse = 0
    this.clearCue()
    this.timeline = []
    this.visual = []
    this.session = { ...this.session, playing: true }
    this.commit()
  }

  /** STOP: return to pulse 0, keep joined / muted / volume / tempo. */
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
    this.pulse = 0
    this.timeline = []
    this.visual = []
    this.commit()
  }

  /** RESET: restore the complete initial session. Caller stops audio first. */
  reset(): void {
    this.session = createSession()
    this.queue = []
    this.pendingJoins = 0
    this.clearCue()
    this.pulse = 0
    this.timeline = []
    this.visual = []
    this.commit()
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
      // Latest request wins; applied at the next klempung-beat boundary.
      this.session = { ...this.session, pendingTempoBpm: next }
    }
    this.commit()
  }

  /** Arm a cue (starts at the next 16-pulse boundary); toggles while armed. */
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

  // --- pulse ---------------------------------------------------------------

  /**
   * Called from the audio clock once per internal pulse. The first call after
   * markStarted() is pulse 0 and sounds at the transport start time.
   */
  onPulse(time: number): PulseEvent {
    const pulse = this.pulse
    let changed = this.applyQueue()

    const pending = this.session.pendingTempoBpm
    if (pending !== null && pulse % PULSES_PER_BEAT === 0) {
      this.session = {
        ...this.session,
        tempoBpm: pending,
        pendingTempoBpm: null,
      }
      this.sink.setTempo(pending, time)
      changed = true
    }

    if (this.cueStart !== null && pulse - this.cueStart >= CUE_LENGTH) {
      this.cueStart = null
    }
    if (this.cueArmed && this.cueStart === null && pulse % CUE_LENGTH === 0) {
      this.cueArmed = false
      this.cueStart = pulse
    }
    let phase: CuePhase = this.cueArmed ? 'armed' : 'idle'
    let hits
    if (this.cueStart !== null) {
      const rel = pulse - this.cueStart
      phase = rel < CUE_CALL.length ? 'call' : 'response'
      hits = cueHitsAt(this.session.performers, rel, pulse)
    } else {
      hits = hitsAtPulse(this.session.performers, pulse)
    }
    if (phase !== this.session.cue) {
      this.session = { ...this.session, cue: phase }
      changed = true
    }
    for (const { performer, hit } of hits) {
      this.sink.play(performer, hit, time)
    }

    const event: PulseEvent = {
      pulse,
      time,
      hits: hits.map((h) => ({ id: h.performer.id, position: h.position })),
    }
    this.timeline.push({ pulse, time })
    if (this.timeline.length > TIMELINE_LIMIT) this.timeline.shift()
    this.visual.push(event)

    this.pulse = pulse + 1
    if (changed) this.commit()
    return event
  }

  // --- visuals (audio-clock driven, read by requestAnimationFrame) ---------

  /** Fractional pulse position at audio time `now` (0 when stopped). */
  positionAt(now: number): number {
    const tl = this.timeline
    if (!this.session.playing || tl.length === 0) return 0
    let i = -1
    for (let k = 0; k < tl.length; k++) {
      if (tl[k].time <= now) i = k
      else break
    }
    if (i < 0) return tl[0].pulse
    const cur = tl[i]
    const next = tl[i + 1]
    const span = next
      ? next.time - cur.time
      : 60 / (this.session.tempoBpm * PULSES_PER_BEAT)
    const frac = Math.min(1, Math.max(0, (now - cur.time) / span))
    return cur.pulse + frac
  }

  /** Pulse events whose audio time has arrived. */
  drainVisual(now: number): PulseEvent[] {
    const due: PulseEvent[] = []
    while (this.visual.length > 0 && this.visual[0].time <= now) {
      due.push(this.visual.shift()!)
    }
    return due
  }
}
