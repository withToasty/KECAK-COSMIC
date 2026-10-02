# M0 Pulse Fixture

Status: Required test fixture for M0  
Assumptions:

- all 8 voices are `joined = true`
- all 8 voices are `muted = false`
- all `rotation = 0`
- node 0 = 12 o'clock
- motion = clockwise
- pulse 0 is evaluated immediately on START
- pattern definitions follow [kecak-rhythm-model.md](./kecak-rhythm-model.md)

## Abbreviations

| Code | Part |
|---|---|
| JK | Juru Klempung |
| BP | Cak Besik — Polos |
| BS | Cak Besik — Sangsih |
| TP | Cak Telu — Polos |
| TL | Cak Telu — Sanglot |
| TS | Cak Telu — Sangsih |
| LP | Cak Lima — Polos |
| LS | Cak Lima — Sangsih |

## Pattern sources

```
JK  1000
BP  1000
BS  0010
TP  00100101
TL  10010100
TS  01001010
LP  1000100010001010
LS  0010001000100101
```

## Expected hits: pulse 0–15

| Pulse | Voices that must sound | Hit count |
|---:|---|---:|
| 0 | JK, BP, TL, LP | 4 |
| 1 | TS | 1 |
| 2 | BS, TP, LS | 3 |
| 3 | TL | 1 |
| 4 | JK, BP, TS, LP | 4 |
| 5 | TP, TL | 2 |
| 6 | BS, TS, LS | 3 |
| 7 | TP | 1 |
| 8 | JK, BP, TL, LP | 4 |
| 9 | TS | 1 |
| 10 | BS, TP, LS | 3 |
| 11 | TL | 1 |
| 12 | JK, BP, TS, LP | 4 |
| 13 | TP, TL, LS | 3 |
| 14 | BS, TS, LP | 3 |
| 15 | TP, LS | 2 |

Pulse 16 must equal pulse 0.

## Required behavioral tests

### START

Given the default session:

- only JK joined
- globalPulse = 0
- stopped

When START is pressed, JK must sound immediately at pulse 0.

There must not be one silent internal pulse before the first PUNG.

### STOP → START

Given multiple voices already joined:

1. STOP
2. verify globalPulse = 0
3. verify joined / muted / volume / tempo unchanged
4. START

The next sound must again be the pulse-0 hit set for the currently joined and unmuted voices.

### RESET

RESET must restore:

```
tempoBpm = 120
globalPulse = 0
playing = false
joined = [JK only]
muted = false for every voice
rotation = 0 for every voice
```

### JOIN while playing

A JOIN request must not reset globalPulse.

The new voice becomes effective on the next internal-pulse boundary and evaluates its pattern at:

```ts
globalPulse % pattern.length
```

It must not begin from pattern index 0 unless the current global pulse actually maps to index 0.

### MUTE while playing

Mute/unmute becomes effective on the next internal-pulse boundary.

A muted voice continues moving visually around its orbit.

### Tempo change while playing

A tempo change requested during a klempung beat is pending until the next boundary where:

```ts
globalPulse % 4 === 0
```

Only the latest pending value is applied.

### Same-pulse scheduling

For any row with multiple hits, all voices in that row must be scheduled using the exact same audio time value.

Especially test pulse 0, 4, 8, and 12, each of which contains four simultaneous hits.

## Acceptance rule

If implementation output disagrees with this fixture, treat it as an implementation bug unless the underlying Kecak pattern source has intentionally been revised in a separate documented decision.
