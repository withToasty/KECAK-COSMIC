import type { Performer } from '../domain/rhythm'

export type { Performer, Role } from '../domain/rhythm'

export type CuePhase = 'idle' | 'armed' | 'call' | 'response'

export type Session = {
  /** Global-beat BPM. */
  tempoBpm: number
  pendingTempoBpm: number | null
  globalBeat: number
  playing: boolean
  cue: CuePhase
  performers: Performer[]
}

export const TEMPO_MIN = 60
export const TEMPO_MAX = 220
export const TEMPO_DEFAULT = 120
