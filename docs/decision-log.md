# Decision Log — M0 Kecak Baseline

Date: 2026-10-02  
Status: Accepted for M0 implementation

This document records the current design decisions that should be treated as the implementation baseline for M0.

## Locked decisions

- Time is represented as one infinite global pulse, not bars or measures.
- One klempung beat is represented by four internal pulses.
- Each performer owns a repeating pattern rather than a single periodic trigger.
- The circular UI is a functional sequencer: nodes are time positions, and the moving marker is the current position.
- Phase is not exposed as a numeric control in M0.
- M0 begins with one performer and adds performers one by one without resetting the global pulse.
- The first eight roles are based on documented Kecak interlocking structures and are implemented as a source-based abstraction rather than a claim of one canonical eight-part Kecak.
- The initial eight roles are:
  1. Juru Klempung
  2. Cak Besik — Polos
  3. Cak Besik — Sangsih
  4. Cak Telu — Polos
  5. Cak Telu — Sanglot
  6. Cak Telu — Sangsih
  7. Cak Lima — Polos
  8. Cak Lima — Sangsih
- M0 prioritizes audible interlocking and timing stability over visual ornament.
- COSMIC MODE should reuse the same visual grammar: rhythm ring -> orbital ring.
- Tempo BPM represents the klempung beat. Because one klempung beat is four internal pulses, the scheduler runs internal pulses at 4x the displayed BPM.
- The M0 eight-part preset is intentionally fully periodic every 16 internal pulses. Long-form non-repeating relationships are deferred to COSMIC MODE.
- One visible performer represents one rhythmic voice/group internally, not necessarily one literal human. M0 uses groupSize = 1; future versions may expand a voice to multiple singers.
- Audio clock is the source of truth; React state and animation follow it.
- A newly joined voice enters at the current global-pulse position on the next scheduled pulse; joining never resets or waits for a fresh pattern cycle.
- Same-pulse voices must be scheduled at the exact same AudioContext time.
- Human voice samples should be replaceable and the player architecture should allow future round-robin variation.
- Kecak preset patterns must live in dedicated source data, with source notes, so transcriptions can be revised without changing engine logic.

## Source of truth

Implementation should follow:

- [Specification](./specification.md)
- [Kecak Rhythm Model](./kecak-rhythm-model.md)
- [Concept](./concept.md)

If these documents conflict, the order above is the precedence for M0 implementation details.
