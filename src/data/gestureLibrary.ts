import type { BeatCell } from '../domain/rhythm'

export const REST: BeatCell = []

export const PUNG: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 3,
    sampleId: 'pung',
    accent: 1,
  },
]

export const CAK_LONG: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 12,
    sampleId: 'cak-long',
    accent: 1,
  },
]

export const CAK_SINGLE: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
]

export const CAK_DOUBLE: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
  {
    offsetSubtick: 6,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
]

export const CAK_TRIPLE: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
  {
    offsetSubtick: 4,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
  {
    offsetSubtick: 8,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
]

export const CAK_LATE_DOUBLE: BeatCell = [
  {
    offsetSubtick: 3,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
  {
    offsetSubtick: 9,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
]
