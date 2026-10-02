import { useEffect, useSyncExternalStore } from 'react'
import type { CosmicSession } from '../cosmos/cosmicCore'
import { KecakEngine } from '../engine/audio'
import type { Session } from '../engine/types'

export const engine = new KecakEngine()

export function useMode() {
  return useSyncExternalStore(engine.subscribeMode, engine.getMode)
}

export function useCosmicSession(): CosmicSession {
  return useSyncExternalStore(engine.cosmic.subscribe, engine.cosmic.getSession)
}

export function useSession(): Session {
  return useSyncExternalStore(engine.core.subscribe, engine.core.getSession)
}

/** M0: if the page is hidden during playback, STOP (no catch-up playback). */
export function useStopWhenHidden(): void {
  useEffect(() => {
    const onChange = () => {
      if (document.hidden && engine.isPlaying()) engine.stop()
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
}
