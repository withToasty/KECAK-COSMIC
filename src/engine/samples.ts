import type { Voice } from './types'

// Sample files are replaceable. Each voice takes an array so a round-robin /
// variation player can be added without changing callers.
const base = import.meta.env.BASE_URL

export const SAMPLES: Record<Voice, string[]> = {
  cak: [`${base}sounds/cak-01.wav`],
  pung: [`${base}sounds/pung-01.wav`],
}
