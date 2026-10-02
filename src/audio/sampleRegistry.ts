import type { SampleId } from '../domain/rhythm'

// Sample families are separate: short "cak" attacks and the sustained "caaak"
// are different recordings, never one stretched into the other. Each family
// takes several takes for round-robin variation.
const base = import.meta.env.BASE_URL
const files = (...names: string[]) => names.map((n) => `${base}sounds/${n}`)

export const SAMPLE_FILES: Partial<Record<SampleId, string[]>> = {
  'cak-short': files('cak-short-01.wav', 'cak-short-02.wav', 'cak-short-03.wav'),
  'cak-long': files('cak-long-01.wav', 'cak-long-02.wav'),
  pung: files('pung-01.wav'),
}
