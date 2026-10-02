import type { CueKind } from '../data/cuePhrase'
import type { Performer } from '../domain/rhythm'

export type { Performer, Role } from '../domain/rhythm'
export type { CueKind } from '../data/cuePhrase'

export type CuePhase = 'idle' | 'armed' | 'call' | 'response'
export type Dynamics = 'loud' | 'soft'

export type Session = {
  /** Global-beat BPM. */
  tempoBpm: number
  pendingTempoBpm: number | null
  globalBeat: number
  playing: boolean
  cue: CuePhase
  /** Which cue is armed / running (null when idle). */
  cueKind: CueKind | null
  dynamics: Dynamics
  presetSet: string
  performers: Performer[]
}

export const TEMPO_MIN = 60
export const TEMPO_MAX = 220
export const TEMPO_DEFAULT = 120

export const MAX_PERFORMERS = 12
export const MAX_BEATS = 8
export const MAX_EVENTS_PER_BEAT = 12
export const MAX_ENSEMBLE = 8
export const SOFT_GAIN = 0.45
