# Sounds

The core `cak-short` and `cak-long` families now use the project owner's
recorded voice. They are separate performances and are never created by
time-stretching one another. The original synthesized placeholders remain in
this directory only as development/fallback assets; they are no longer
registered for the two core cak families.

| File | Family | Author | License | Notes |
|---|---|---|---|---|
| `recorded-cak-short-01.mp3` | cak-short | Project owner | Same as the repository | Cut from `ケチャ音1.m4a`, recorded 2026-10-06 |
| `recorded-cak-long-01.mp3` | cak-long | Project owner | Same as the repository | Cut from `ケチャ音1.m4a`, recorded 2026-10-06 |
| `cak-short-01.wav` … `03` | cak-short | Generated (this repo) | Same as the repository | Legacy placeholder, not registered |
| `cak-long-01.wav`, `02` | cak-long | Generated (this repo) | Same as the repository | Legacy placeholder, not registered |
| `sir-01.wav` | sir | Generated (this repo) | Same as the repository | Placeholder |
| `pung-01.wav` | pung | Generated (this repo) | Same as the repository | Placeholder |

The source recording also contains double-cak, fast triple-cak, `ke`, and
final call gestures. Those are intentionally kept out of the current SampleId
mapping until the rhythm model assigns them explicit semantic roles.

## Playback trims (automatic)

Each sample is analysed once when it is loaded (`src/audio/sampleAnalysis.ts`):

- **Onset.** Playback starts at the first point where the sound exceeds 10% of its
  peak (minus 3 ms), so the audible start lands exactly on the scheduled time.
  Recordings usually begin with a little silence, and MP3 adds an encoder delay that
  browsers do not remove. Measured on the recorded files: about 37 ms for
  `recorded-cak-short-01.mp3` and about 104 ms for `recorded-cak-long-01.mp3`.
- **Level.** The audible part is trimmed towards -20 dBFS RMS (at most +/-12 dB), so a
  quiet recording and a loud placeholder end up at the same level.

New recordings need no manual trimming or level matching; add the file and list it in
`src/audio/sampleRegistry.ts`. Several takes per family are played in turn.

