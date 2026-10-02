import * as Tone from 'tone'
import { SAMPLE_FILES } from '../audio/sampleRegistry'
import type { SampleId } from '../domain/rhythm'
import {
  EngineCore,
  type EventSink,
  type MemberTrigger,
} from './core'
import type { ScheduledVocalEvent } from '../audio/beatScheduler'
import type { PresetSet } from '../data/presetSets'

const MASTER_HEADROOM_DB = -12
const LIMITER_CEILING_DB = -1
const LONG_FADE_OUT_S = 0.05

type Bank = { players: Tone.Player[]; next: number }

/** Tone.js sink: sample families (round-robin takes) -> master -> limiter. */
class ToneSink implements EventSink {
  private master: Tone.Gain
  private limiter: Tone.Limiter
  private banks = new Map<string, Bank>()
  private buffers = new Map<string, Tone.ToneAudioBuffer>()
  private loading: Promise<void> | null = null
  private warned = new Set<SampleId>()

  constructor() {
    this.limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
    this.master = new Tone.Gain(Tone.dbToGain(MASTER_HEADROOM_DB)).connect(
      this.limiter,
    )
  }

  /** Load every sample once; safe to call repeatedly. */
  load(): Promise<void> {
    this.loading ??= (async () => {
      const urls = new Set(Object.values(SAMPLE_FILES).flat())
      await Promise.all(
        [...urls].map(async (url) => {
          this.buffers.set(url, await Tone.ToneAudioBuffer.fromUrl(url))
        }),
      )
    })().catch((err) => {
      this.loading = null
      throw err
    })
    return this.loading
  }

  private bank(performerId: string, member: number, sampleId: SampleId): Bank | null {
    const urls = SAMPLE_FILES[sampleId]
    if (!urls || urls.length === 0) {
      if (!this.warned.has(sampleId)) {
        this.warned.add(sampleId)
        console.warn(`no samples registered for ${sampleId}`)
      }
      return null
    }
    const key = `${performerId}|${member}|${sampleId}`
    let bank = this.banks.get(key)
    if (!bank) {
      // Stagger the first take per member so a group does not share one take.
      const start = member % urls.length
      bank = {
        players: urls.map((url) => {
          const buffer = this.buffers.get(url)
          if (!buffer) throw new Error(`sample not loaded: ${url}`)
          const player = new Tone.Player(buffer).connect(this.master)
          player.fadeOut = sampleId === 'cak-long' ? LONG_FADE_OUT_S : 0
          return player
        }),
        next: start,
      }
      this.banks.set(key, bank)
    }
    return bank
  }

  trigger({ event, memberIndex, time, gain }: MemberTrigger): void {
    const bank = this.bank(event.performerId, memberIndex, event.sampleId)
    if (!bank) return
    const player = bank.players[bank.next % bank.players.length]
    bank.next++
    // `gain` already contains performer volume x accent x member share.
    player.volume.setValueAtTime(Tone.gainToDb(gain), time)
    player.start(time)
    // Sustained voice: cut / release at the event duration on the audio clock.
    // Short samples play out naturally and are never time-stretched.
    if (event.sampleId === 'cak-long') {
      player.stop(time + event.durationSeconds)
    }
  }

  setTempo(bpm: number, time: number): void {
    Tone.getTransport().bpm.setValueAtTime(bpm, time)
  }

  silence(): void {
    for (const bank of this.banks.values()) bank.players.forEach((p) => p.stop())
  }
}

export class KecakEngine {
  private sink = new ToneSink()
  readonly core = new EngineCore(this.sink)
  private starting = false

  async start(): Promise<void> {
    if (this.core.getSession().playing || this.starting) return
    this.starting = true
    try {
      // Must run inside the user gesture that triggered START.
      await Tone.start()
      await this.sink.load()
      if (this.core.getSession().playing) return

      const transport = Tone.getTransport()
      transport.cancel()
      transport.bpm.value = this.core.getSession().tempoBpm
      this.core.markStarted()
      // One callback per global beat (quarter-note equivalent). Events inside
      // the beat are expanded to audio times directly: no subtick timer.
      transport.scheduleRepeat((time) => this.core.onBeat(time), '4n', 0)
      transport.start('+0.05')
    } finally {
      this.starting = false
    }
  }

  stop(): void {
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    this.sink.silence()
    this.core.markStopped()
  }

  reset(): void {
    this.stop()
    this.core.reset()
  }

  /** Switch arrangement (stops playback and returns to the initial session). */
  setPresetSet(set: PresetSet): void {
    this.stop()
    this.core.setPresetSet(set)
  }

  setVolume(id: string, volume: number): void {
    this.core.setVolume(id, volume)
  }

  /** Audio time the listener is hearing right now. */
  audioNow(): number {
    const ctx = Tone.getContext().rawContext
    const latency = (ctx as AudioContext).outputLatency ?? 0
    return ctx.currentTime - latency
  }

  position(): number {
    return this.core.positionAt(this.audioNow())
  }

  dueVisuals(): ScheduledVocalEvent[] {
    return this.core.drainVisual(this.audioNow())
  }
}
