import type { SampleId } from '../domain/rhythm'

const base = import.meta.env.BASE_URL
const files = (...names: string[]) => names.map((n) => `${base}sounds/${n}`)

/**
 * Real recorded voice is preferred for the two core cak families.
 * The source recording is the project owner's own "ケチャ音1.m4a" take.
 * Long and short cak remain separate samples: neither is time-stretched.
 */
export const SAMPLE_FILES: Partial<Record<SampleId, string[]>> = {
  'cak-short': files('recorded-cak-short-01.mp3'),
  'cak-long': files('recorded-cak-long-01.mp3'),
  pung: files('pung-01.wav'),
  sir: files('sir-01.wav'),
}
