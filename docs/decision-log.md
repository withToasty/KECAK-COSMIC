# Decision Log — M0 Kecak Baseline

Date: 2026-10-02  
Status: Accepted for M0 implementation

This document records the current design decisions that should be treated as the implementation baseline for M0.

## Locked decisions

- Time is represented as one infinite global pulse, not bars or measures.
- One global beat is represented by 12 data subticks so 2-way, 3-way, and 4-way intra-beat placement can share one integer grid.
- Each performer owns a repeating sequence of BeatCell objects; each BeatCell may contain zero, one, or multiple VocalEvents.
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
- Tempo BPM represents the global beat. Tone.Transport runs one beat callback per quarter-note equivalent; subtick events are scheduled directly as AudioContext times inside that beat.
- The legacy eight-part preset maps losslessly to 1 / 2 / 4 beat cycles and therefore repeats every 4 global beats; future source transcriptions may use other cycle lengths.
- One visible performer represents one rhythmic voice/group internally. M0.1 supports EnsembleProfile so a visible performer can expand into multiple slightly different vocal members; deterministic tests disable the spread.
- Audio clock is the source of truth; React state and animation follow it.
- A newly joined voice enters at the current global-beat position on the next beat boundary; joining never resets or waits for a fresh pattern cycle.
- Same-beat, same-subtick events must share the exact same AudioContext time before optional ensemble humanization.
- Human voice samples should distinguish short and sustained articulations from M0.1; the player architecture should allow round-robin / seeded variation.
- Kecak preset patterns must live in dedicated source data as BeatCell / VocalEvent structures, with source notes, so transcriptions can be revised without changing engine logic.
- One beat contains 12 data subticks: halves map to 0/6, thirds to 0/4/8, quarters to 0/3/6/9.
- Subticks are not driven by JavaScript timers; a beat callback expands events directly to audio times.
- `cak-short` and `cak-long` are separate sample families. Short samples must not be stretched aggressively to fake sustained voice.
- The old four-pulse grid migrates losslessly by q0→0, q1→3, q2→6, q3→9.
- Orbit UI semantics change from one node per old pulse to one beat sector containing intra-beat event marks.
- All rhythmic orbits share one center. Entry 1 is the innermost orbit and Entry 8 the outermost; node 0 is at 12 o'clock and motion is clockwise.
- Performer state uses joined / muted only. Pattern content is represented by BeatCell / VocalEvent, so participation and sound events remain separate concepts.
- START evaluates beat 0 immediately, so offsetSubtick=0 events sound at transport start.
- STOP returns time to beat 0 but preserves joined, muted, volume, and tempo state.
- RESET restores the complete initial session: tempo 120, only Juru Klempung joined, all voices unmuted, preset volumes, rotation 0.
- M0 has no pause/resume. Reload is equivalent to RESET.
- JOIN is strictly sequential in M0; joined voices cannot leave, only mute.
- While playing, JOIN and MUTE state changes take effect on the next global-beat boundary.
- While playing, tempo changes take effect on the next global-beat boundary; the latest pending tempo wins.
- Tone.js is the M0 scheduler; SVG is the M0 orbit renderer. Canvas/WebGL are intentionally excluded from M0.
- If the page becomes hidden during playback, M0 automatically stops and returns to pulse 0 while preserving the current joined/muted/volume/tempo state.
- The audio master chain includes headroom and a safety limiter from M0.
- Public-repo audio assets must have explicit provenance and reuse rights; unknown-origin samples are not committed.
- Beat-internal scheduler behavior is frozen in m0-beat-event-fixture.md; the old pulse 0–15 fixture remains only as a legacy migration-equivalence fixture.
- All eight orbit outlines are visible from startup; unjoined voices hide their nodes and moving markers until joined.
- Voice-to-orbit mapping is conveyed structurally with labels, not by color alone.
- Derived values such as joinedCount are computed from performer state rather than stored separately.

## Source of truth

Implementation should follow:

- [Specification](./specification.md)
- [Beat Gesture Model](./beat-gesture-model.md)
- [Kecak Rhythm Model](./kecak-rhythm-model.md)
- [Concept](./concept.md)

If these documents conflict, the order above is the precedence for M0 implementation details.

## Cue (M0.1)

- A manual CUE button adds a call-and-response section on top of the infinite beat: arm now, start at the next global-beat boundary (max one beat wait), call by Juru Klempung (2 beats), then a unison response by all joined unmuted voices (2 beats) that enters on the off-beat. See [Cue Model](./cue-model.md).
- Cue never resets or pauses the global beat. Auto-arranged songs are deferred.

## Implementation notes (M0.1 engine)

- Engine follows the beat-gesture model: one Transport callback per global beat (`4n`), events expanded to audio times inside it. JOIN / MUTE / tempo take effect at the next beat boundary.
- The eight presets are the legacy 4-grid strings migrated to BeatCell / VocalEvent (short cak = `cak-short`, 2 subticks; pung = 3 subticks). Musical content is unchanged; only the engine moved. Long (`cak-long`), double, triple and offset gestures are available in the engine and in the audition preset, but are not yet used by the Kecak preset.
- Ensemble: Juru Klempung is a single voice; each cak part expands into 4 members with up to 14 ms of trailing timing spread and 8% gain spread, seeded per performer. Member 0 stays exactly on the grid.
- Placeholder samples: 3 `cak-short` takes, 2 `cak-long` takes, 1 `pung`, all generated in this repository.
- Two selectable arrangements share the same seats, roles and ensembles: `Legacy` (migrated single hits) and `Gesture` (arrangement draft with sustained `cak-long` on Besik Polos / Cak Lima Polos at beat 0, and a triple / late double / offset triple fill on the last beat of each Cak Telu part, all on a 4-beat cycle). Gesture is an arrangement for A/B listening, not a source transcription. Switching resets the session.
- Placeholder samples start at full level on the first sample (no fade-in) so sustained cak sounds the instant it is triggered. The cue call layers a sustained cak over the pung so the otherwise near-silent call is audible on phone speakers. All players are created before START to avoid first-hit latency.

## M1 — Instrument

See [M1 Instrument](./m1-instrument.md).

- The time model is unchanged (global beat, 12 subticks, BeatCell). M1 only adds ways to edit, share and save it.
- Every edit made while playing (pattern, rotation, cycle length, solo, mute, join / leave, add / remove voice, dynamics, ensemble) takes effect on the next global-beat boundary; stopped edits are immediate. Volume applies to the next trigger.
- M0's strictly sequential JOIN is relaxed: any seat can join in any order and joined voices can leave. `JOIN NEXT VOICE` still brings voices in seat order.
- Solo overrides: when any joined voice is solo, only solo voices sound, including in cues.
- User-made voices (max 12 voices in total) can be removed; preset voices can only leave or mute. Seats and orbits re-space to the voice count.
- A share code is `k1.` + base64url(JSON); decoding validates type, range and count and rejects anything else. Saved presets live in localStorage and the app works without it.
- Cak Nem / Pitu / Ocel / Lesung, Panyelah and Juru Gending are not added: they need transcription sources. Users can build such voices themselves with the editor.
