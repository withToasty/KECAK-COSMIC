import type { Performer } from '../domain/rhythm'
import {
  CAK_DOUBLE,
  CAK_LATE_DOUBLE,
  CAK_LONG,
  CAK_TRIPLE,
  PUNG,
} from './gestureLibrary'

const TEST_ENSEMBLE = {
  size: 1,
  timingSpreadMs: 0,
  gainSpread: 0,
  seed: 1,
} as const

export const gestureAuditionPerformers: readonly Performer[] = [
  {
    id: 'pung',
    pattern: { beats: [PUNG] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 1,
    ensemble: TEST_ENSEMBLE,
  },
  {
    id: 'cak-long',
    pattern: { beats: [CAK_LONG] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 0.8,
    ensemble: TEST_ENSEMBLE,
  },
  {
    id: 'cak-double',
    pattern: { beats: [CAK_DOUBLE] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 0.8,
    ensemble: TEST_ENSEMBLE,
  },
  {
    id: 'cak-triple',
    pattern: { beats: [CAK_TRIPLE] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 0.8,
    ensemble: TEST_ENSEMBLE,
  },
  {
    id: 'cak-late-double',
    pattern: { beats: [CAK_LATE_DOUBLE] },
    rotationBeats: 0,
    joined: true,
    muted: false,
    volume: 0.8,
    ensemble: TEST_ENSEMBLE,
  },
]
