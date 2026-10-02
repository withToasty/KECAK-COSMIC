export type Voice = 'cak' | 'pung'

export type Role = 'beat-keeper' | 'polos' | 'sangsih' | 'sanglot'

export type KecakPart =
  | 'klempung'
  | 'besik-polos'
  | 'besik-sangsih'
  | 'telu-polos'
  | 'telu-sanglot'
  | 'telu-sangsih'
  | 'lima-polos'
  | 'lima-sangsih'

export type Hit = {
  on: boolean
  /** 0.0–1.0, velocity / gain multiplier. M0 presets use 1.0. */
  accent: number
}

export type Performer = {
  id: string
  entry: number
  name: string
  kecakPart: KecakPart
  role: Role
  voice: Voice
  pattern: readonly Hit[]
  rotation: number
  joined: boolean
  muted: boolean
  volume: number
  /** A performer is a voice group, not necessarily one person. M0: always 1. */
  groupSize: number
}

export type CuePhase = 'idle' | 'armed' | 'call' | 'response'

export type Session = {
  /** Klempung-beat BPM. Internal pulses run at 4x this rate. */
  tempoBpm: number
  pendingTempoBpm: number | null
  globalPulse: number
  playing: boolean
  cue: CuePhase
  performers: Performer[]
}

export const PULSES_PER_BEAT = 4
export const TEMPO_MIN = 60
export const TEMPO_MAX = 220
export const TEMPO_DEFAULT = 120
