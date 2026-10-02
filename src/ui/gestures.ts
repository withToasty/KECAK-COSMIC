// Gesture palette for the beat editor. Offsets are subticks (12 per beat).

import type { BeatCell, Performer, SampleId, VocalEvent } from '../domain/rhythm'

/** Samples drawn as an arc and held, not edited on the subtick grid. */
export const isSustained = (sampleId: SampleId) => sampleId === 'cak-long' || sampleId === 'sir'

/** Sample a voice uses for short hits: the beat keeper sings pung, the rest cak. */
export const shortSampleFor = (p: Performer): SampleId =>
  p.role === 'beat-keeper' ? 'pung' : 'cak-short'

const shortEvent = (p: Performer, offsetSubtick: number): VocalEvent => ({
  offsetSubtick,
  durationSubticks: p.role === 'beat-keeper' ? 3 : 2,
  sampleId: shortSampleFor(p),
  accent: 1,
})

export type Gesture = {
  id: string
  label: string
  hint: string
  /** Long cak is a cak sample: not available to the beat keeper. */
  cakOnly?: boolean
  build: (p: Performer) => BeatCell
}

export const GESTURES: readonly Gesture[] = [
  { id: 'rest', label: '休', hint: 'rest', build: () => [] },
  { id: 'single', label: '•', hint: 'on the beat', build: (p) => [shortEvent(p, 0)] },
  { id: 'off', label: '·•', hint: 'off-beat', build: (p) => [shortEvent(p, 6)] },
  { id: 'double', label: '••', hint: 'double', build: (p) => [shortEvent(p, 0), shortEvent(p, 6)] },
  { id: 'late', label: '·••', hint: 'late double', build: (p) => [shortEvent(p, 3), shortEvent(p, 9)] },
  { id: 'triple', label: '•••', hint: 'triple', build: (p) => [shortEvent(p, 0), shortEvent(p, 4), shortEvent(p, 8)] },
  {
    id: 'long',
    label: '━',
    hint: 'sustained',
    cakOnly: true,
    build: () => [{ offsetSubtick: 0, durationSubticks: 12, sampleId: 'cak-long', accent: 1 }],
  },
]

/** Which gesture a beat currently is, if it matches one exactly. */
export function matchGesture(p: Performer, cell: BeatCell): string | null {
  const key = (c: BeatCell) =>
    JSON.stringify(c.map((e) => [e.offsetSubtick, e.durationSubticks, e.sampleId]))
  for (const g of GESTURES) {
    if (g.cakOnly && p.role === 'beat-keeper') continue
    if (key(g.build(p)) === key(cell)) return g.id
  }
  return null
}

/** Toggle a short event at `offset`; removes every event starting there. */
export function toggleEvent(p: Performer, cell: BeatCell, offset: number): BeatCell {
  const has = cell.some((e) => e.offsetSubtick === offset)
  if (has) return cell.filter((e) => e.offsetSubtick !== offset)
  return [...cell, shortEvent(p, offset)].sort((a, b) => a.offsetSubtick - b.offsetSubtick)
}
