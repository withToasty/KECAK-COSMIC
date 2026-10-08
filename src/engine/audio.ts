import * as Tone from 'tone'
import { analyze, type SampleInfo } from '../audio/sampleAnalysis'
import { SAMPLE_FILES } from '../audio/sampleRegistry'
import type { Performer, SampleId } from '../domain/rhythm'
import {
  EngineCore,
  type EventSink,
  type MemberTrigger,
} from './core'
import type { ScheduledVocalEvent } from '../audio/beatScheduler'
import type { PresetSet } from '../data/presetSets'
import { CosmicCore, type CosmicSink, type CosmicTrigger } from '../cosmos/cosmicCore'
import type { SystemId } from '../cosmos/bodies'

const MASTER_HEADROOM_DB = -12
const LIMITER_CEILING_DB = -1
const LONG_FADE_OUT_S = 0.05

type Bank = { players: { player: Tone.Player; url: string }[]; next: number }

/** Tone.js sink: sample families (round-robin takes) -> master -> limiter. */
class ToneSink implements EventSink {
  private master: Tone.Gain
  private limiter: Tone.Limiter
  private banks = new Map<string, Bank>()
  private buffers = new Map<string, Tone.ToneAudioBuffer>()
  /** Where each sample's audible part starts and how much to trim it. */
  private info = new Map<string, SampleInfo>()
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
          const buffer = await Tone.ToneAudioBuffer.fromUrl(url)
          this.buffers.set(url, buffer)
          const audio = buffer.get()
          this.info.set(
            url,
            audio ? analyze(audio.getChannelData(0), audio.sampleRate) : { onsetSeconds: 0, trimDb: 0 },
          )
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
          const pan = Math.max(-0.8, Math.min(0.8, ((member * 0.61803398875 + performerId.length * 0.137) % 1) * 1.6 - 0.8))
          const spatial = new Tone.Panner(pan).connect(this.master)
          const player = new Tone.Player(buffer).connect(spatial)
          // Stable, subtle timbre differences between virtual singers.
          player.playbackRate = 0.965 + ((member * 0.371 + performerId.length * 0.117) % 1) * 0.07
          player.fadeOut = sampleId === 'cak-long' ? LONG_FADE_OUT_S : 0
          return { player, url }
        }),
        next: start,
      }
      this.banks.set(key, bank)
    }
    return bank
  }

  /** Create every player the performers (and the cue) can use, ahead of time. */
  warm(performers: readonly Performer[]): void {
    if (this.buffers.size === 0) return // not loaded yet; START warms after loading
    for (const p of performers) {
      // Cue answers use pung (beat keeper) / cak-short (others); the beat keeper
      // also voices the cue call.
      const ids = new Set<SampleId>(
        p.role === 'beat-keeper' ? ['pung', 'cak-short', 'cak-long'] : ['cak-short'],
      )
      for (const beat of p.pattern.beats) for (const e of beat) ids.add(e.sampleId)
      for (let m = 0; m < Math.max(1, p.ensemble.size); m++) {
        for (const id of ids) this.bank(p.id, m, id)
      }
    }
  }

  trigger({ event, memberIndex, time, gain }: MemberTrigger): void {
    const bank = this.bank(event.performerId, memberIndex, event.sampleId)
    if (!bank) return
    const { player, url } = bank.players[bank.next % bank.players.length]
    bank.next++
    const info = this.info.get(url) ?? { onsetSeconds: 0, trimDb: 0 }
    // `gain` already contains performer volume x accent x member share; the trim
    // evens out the level of different recordings.
    player.volume.setValueAtTime(Tone.gainToDb(gain) + info.trimDb, time)
    // Begin at the audible part, so the sound lands on the grid time itself.
    player.start(time, info.onsetSeconds)
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
    for (const bank of this.banks.values()) bank.players.forEach(({ player }) => player.stop())
  }
}

/**
 * COSMIC MODE voices: synthesized, one voice family per kind of body. The pitch
 * comes from the rank of the period (see src/cosmos/compress.ts), so no sample
 * is stretched and the sound is a function of the data only.
 */
class CosmicToneSink implements CosmicSink {
  private limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination()
  private master = new Tone.Gain(Tone.dbToGain(MASTER_HEADROOM_DB + 4)).connect(this.limiter)
  private planet = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2.01,
    modulationIndex: 6,
    envelope: { attack: 0.004, decay: 0.5, sustain: 0.1, release: 1.2 },
    modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.5 },
  }).connect(this.master)
  private moon = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.25, sustain: 0.25, release: 0.9 },
  }).connect(this.master)
  private satellite = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.002, decay: 0.14, sustain: 0, release: 0.12 },
  }).connect(this.master)

  trigger(t: CosmicTrigger): void {
    const synth =
      t.sourceType === 'planet' ? this.planet : t.sourceType === 'moon' ? this.moon : this.satellite
    synth.triggerAttackRelease(t.hz, t.durationSeconds, t.time, Math.min(1, t.gain))
  }

  setTempo(bpm: number, time: number): void {
    Tone.getTransport().bpm.setValueAtTime(bpm, time)
  }

  silence(): void {
    this.planet.releaseAll()
    this.moon.releaseAll()
    this.satellite.releaseAll()
  }
}

export type EngineMode = 'kecak' | 'cosmic'

export class KecakEngine {
  private sink = new ToneSink()
  readonly core = new EngineCore(this.sink)
  private cosmicSink = new CosmicToneSink()
  readonly cosmic = new CosmicCore(this.cosmicSink)
  private starting = false
  private mode: EngineMode = 'kecak'
  private modeListeners = new Set<() => void>()

  getMode = (): EngineMode => this.mode
  subscribeMode = (l: () => void): (() => void) => {
    this.modeListeners.add(l)
    return () => this.modeListeners.delete(l)
  }

  /** Switch between KECAK LOOP and COSMIC MODE (stops playback). */
  setMode(mode: EngineMode): void {
    if (mode === this.mode) return
    this.stop()
    this.mode = mode
    this.modeListeners.forEach((l) => l())
  }

  isPlaying(): boolean {
    return this.mode === 'kecak'
      ? this.core.getSession().playing
      : this.cosmic.getSession().playing
  }

  constructor() {
    // Edits can add voices or ensemble members: create their players right away
    // so the first hit is not delayed by lazy creation.
    this.core.subscribe(() => this.sink.warm(this.core.getSession().performers))
  }

  async start(): Promise<void> {
    if (this.isPlaying() || this.starting) return
    this.starting = true
    try {
      // Must run inside the user gesture that triggered START.
      await Tone.start()
      const mode = this.mode
      if (mode === 'kecak') {
        await this.sink.load()
        this.sink.warm(this.core.getSession().performers)
      }
      if (this.isPlaying() || this.mode !== mode) return

      const transport = Tone.getTransport()
      transport.cancel()
      if (mode === 'kecak') {
        transport.bpm.value = this.core.getSession().tempoBpm
        this.core.markStarted()
        // One callback per global beat (quarter-note equivalent). Events inside
        // the beat are expanded to audio times directly: no subtick timer.
        transport.scheduleRepeat((time) => this.core.onBeat(time), '4n', 0)
      } else {
        transport.bpm.value = this.cosmic.getSession().tempoBpm
        this.cosmic.markStarted()
        transport.scheduleRepeat((time) => this.cosmic.onBeat(time), '4n', 0)
      }
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
    this.cosmicSink.silence()
    this.core.markStopped()
    this.cosmic.markStopped()
  }

  reset(): void {
    this.stop()
    this.core.reset()
  }

  /** COSMIC MODE: switch system (stops playback, fresh session). */
  setCosmicSystem(id: SystemId): void {
    this.stop()
    this.cosmic.setSystem(id)
  }

  resetCosmic(): void {
    this.stop()
    this.cosmic.reset()
  }

  /** Switch arrangement (stops playback and returns to the initial session). */
  setPresetSet(set: PresetSet): void {
    this.stop()
    this.core.setPresetSet(set)
  }

  /** Replace the whole arrangement (saved preset / share code). */
  loadArrangement(a: Parameters<EngineCore['loadArrangement']>[0]): void {
    this.stop()
    this.core.loadArrangement(a)
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
    return this.mode === 'kecak'
      ? this.core.positionAt(this.audioNow())
      : this.cosmic.positionAt(this.audioNow())
  }

  cosmicVisuals() {
    return this.cosmic.drainVisual(this.audioNow())
  }

  dueVisuals(): ScheduledVocalEvent[] {
    return this.core.drainVisual(this.audioNow())
  }
}
