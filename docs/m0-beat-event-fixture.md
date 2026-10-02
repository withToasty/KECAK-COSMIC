# M0.1 Beat Event Fixture

Status: Required engine fixture

このfixtureは「ケチャ採譜の正しさ」ではなく、
beat内event schedulerが正しく動くことを固定する。

## Constants

```
SUBTICKS_PER_BEAT = 12
tempo = 120 BPM
secondsPerBeat = 0.5 sec
secondsPerSubtick = 0.0416666667 sec
```

## Fixture voices

### A — long

```
beat 0:
  cak-long offset=0 duration=12
```

Expected start:

```
0.000 sec
```

### B — double

```
beat 0:
  cak-short offset=0 duration=2
  cak-short offset=6 duration=2
```

Expected starts:

```
0.000 sec
0.250 sec
```

### C — triple

```
beat 0:
  cak-short offset=0 duration=2
  cak-short offset=4 duration=2
  cak-short offset=8 duration=2
```

Expected starts:

```
0.000000 sec
0.166667 sec
0.333333 sec
```

### D — late double

```
beat 0:
  cak-short offset=3 duration=2
  cak-short offset=9 duration=2
```

Expected starts:

```
0.125 sec
0.375 sec
```

## Required tests

- START evaluates beat 0 immediately.
- Multiple events inside one beat are all scheduled from the same beat callback time.
- Same-subtick events from different voices receive exactly the same audio time before humanization.
- Long and short sample IDs remain distinct.
- playbackRate is not changed to fit event duration.
- JOIN takes effect on next beat boundary.
- MUTE takes effect on next beat boundary.
- Tempo changes take effect on next beat boundary.
- STOP resets globalBeat to 0.
- RESET restores initial joined / muted / tempo state.
- With ensemble humanization disabled, fixture output is deterministic.
- With ensemble enabled, each member offset remains within configured timingSpreadMs.
- Seeded ensemble output repeats identically for the same seed.

## Migration fixture

Old quarter-grid indices map as:

| old q | new subtick |
|---:|---:|
| 0 | 0 |
| 1 | 3 |
| 2 | 6 |
| 3 | 9 |

A migrated old binary pattern must produce the same event onset sequence as before.
