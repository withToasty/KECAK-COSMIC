import * as Tone from 'tone'
import { EngineCore, type PulseEvent, type PulseSink } from './core'
import { SAMPLES } from './samples'
import {
  type Hit,
  type Performer,
  type Voice,
} from './types'

const MASTER_HEADROOM_DB = -12
const LIMITER_CEILING_DB = -1
const VOLUME_RAMP_S = 0.03

type VoiceBank = {
  players: Tone.Player[]
  next: number
}

/** Tone.js implementation of the sink: samples -> performer gain -> master. */
class ToneSink implements PulseSink {
  private master: Tone.Gain
  private limiter: Tone.Limiter
  private gains = new Map<string, Tone.Gain>()
  private banks = new Map<string, Record<Voice, VoiceBank>>()
  private buffers = new Map<string, Tone.ToneAudioBuffer>()
  private loading: Promise<void> | null = null

  constructor() {
    this.limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
    this.master = new Tone.Gain(Tone.dbToGain(MASTER_HEADROOM_DB)).connect(
      this.limiter,
    )
  }

  /** Load every sample once; safe to call repeatedly. */
  load(): Promise<void> {
    this.loading ??= (async () => {
      const urls = new Set(Object.values(SAMPLES).flat())
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

  private bankFor(p: Performer): VoiceBank {
    let perVoice = this.banks.get(p.id)
    if (!perVoice) {
      perVoice = { cak: { players: [], next: 0 }, pung: { players: [], next: 0 } }
      this.banks.set(p.id, perVoice)
    }
    const bank = perVoice[p.voice]
    if (bank.players.length === 0) {
      const gain = this.gainFor(p)
      bank.players = SAMPLES[p.voice].map((url) => {
        const buffer = this.buffers.get(url)
        if (!buffer) throw new Error(`sample not loaded: ${url}`)
        return new Tone.Player(buffer).connect(gain)
      })
    }
    return bank
  }

  private gainFor(p: Performer): Tone.Gain {
    let g = this.gains.get(p.id)
    if (!g) {
      g = new Tone.Gain(p.volume).connect(this.master)
      this.gains.set(p.id, g)
    }
    return g
  }

  setVolume(id: string, volume: number): void {
    this.gains.get(id)?.gain.rampTo(volume, VOLUME_RAMP_S)
  }

  play(performer: Performer, hit: Hit, time: number): void {
    const bank = this.bankFor(performer)
    const player = bank.players[bank.next]
    bank.next = (bank.next + 1) % bank.players.length
    // Performer volume is on the gain node; accent scales each hit.
    player.volume.setValueAtTime(Tone.gainToDb(hit.accent), time)
    player.start(time)
  }

  setTempo(bpm: number, time: number): void {
    Tone.getTransport().bpm.setValueAtTime(bpm, time)
  }

  silence(): void {
    for (const perVoice of this.banks.values()) {
      for (const bank of Object.values(perVoice)) {
        bank.players.forEach((pl) => pl.stop())
      }
    }
  }

  /** Reset gain nodes to a performer's current volume (used by RESET). */
  syncVolumes(performers: readonly Performer[]): void {
    for (const p of performers) this.gains.get(p.id)?.gain.rampTo(p.volume, VOLUME_RAMP_S)
  }
}

export class KecakEngine {
  private sink = new ToneSink()
  readonly core = new EngineCore(this.sink)
  private starting = false

  async start(): Promise<void> {
    const session = this.core.getSession()
    if (session.playing || this.starting) return
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
      // Scheduled at tick 0: pulse 0 is evaluated at the START time itself.
      transport.scheduleRepeat(
        (time) => {
          this.core.onPulse(time)
        },
        '16n',
        0,
      )
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
    this.sink.syncVolumes(this.core.getSession().performers)
  }

  setVolume(id: string, volume: number): void {
    this.core.setVolume(id, volume)
    this.sink.setVolume(id, volume)
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

  dueVisuals(): PulseEvent[] {
    return this.core.drainVisual(this.audioNow())
  }
}
