# M0.1 Implementation Plan — Beat Gestures

## Goal

旧 `Hit.on` scheduler を、
「beat内に複数の vocal event を持てるscheduler」へ置き換える。

## Recommended order

### Step 1 — Domain types

Create:

```
src/domain/rhythm.ts
```

Implement:

- `SUBTICKS_PER_BEAT = 12`
- `SampleId`
- `VocalEvent`
- `BeatCell`
- `VoicePattern`
- `EnsembleProfile`

Validation functionも置く。

Acceptance:

- offset 0–11のみ許可
- duration >= 1
- accent 0–1
- pattern beats が1以上

### Step 2 — Migration helper

Create:

```
src/domain/migrateLegacyPattern.ts
```

旧 0/1 pattern を4個ずつ1beatへまとめる。

Mapping:

```
0 -> subtick 0
1 -> subtick 3
2 -> subtick 6
3 -> subtick 9
```

これで現在のpresetを壊さずengineだけ先に入れ替えられる。

### Step 3 — Sample registry

Create:

```
src/audio/sampleRegistry.ts
```

最低限:

- cak-short
- cak-long
- pung

短音と長音は別sample familyにする。

### Step 4 — Beat scheduler

Create:

```
src/audio/beatScheduler.ts
```

Transport callbackは1beatに1回。

```ts
scheduleRepeat((beatTime) => {
  scheduleBeat(globalBeat, beatTime)
}, '4n')
```

beat内部のVocalEventをAudioContext timeへ展開する。

React timer / setInterval でsubtickを刻まない。

### Step 5 — Exact same-time scheduling

まず humanization なしで実装する。

同じ subtick:

```
eventTime =
  beatTime +
  offsetSubtick / 12 * secondsPerBeat
```

全voiceが同じ `eventTime` を使うことをtestする。

### Step 6 — Long articulation

`cak-long` 専用sampleを再生する。

禁止:

- cak-shortの極端な playbackRate 変更
- CSS/React側のtimerでstop

Audio側でstart / duration / stopをscheduleする。

### Step 7 — Ensemble expansion

1 visible performerを複数voice memberへ展開する。

最初:

```
size = 6
timingSpreadMs = 12
gainSpread = 0.05
```

程度から試聴。

seed付きで再現可能にする。

### Step 8 — Preset migration

現在の8パートをlegacy helperでBeatCellへ変換。

この段階では「音楽内容」は変えない。

目的:

**scheduler変更によるregressionと、音楽内容変更を分離する。**

### Step 9 — Gesture audition preset

次に試聴用presetを作る。

最低限同時に:

- 1拍long cak
- double cak
- triple cak
- offset double
- pung

を重ねる。

ここで初めて「チャーー」と「チャッ・チャッ」の差を耳で確認する。

### Step 10 — Source transcription preset

実演 / 採譜資料をA/Bしながら、
各BeatCellをsource-based dataへ置き換える。

engine logicには手を入れない。

### Step 11 — Orbit UI

旧:

```
1 node = 1 internal pulse
```

新:

```
1 large sector = 1 beat
sector内 mark = vocal event
```

longはarc、shortはpointで表示。

### Step 12 — Tests

First tests:

1. beat 0 immediate
2. double onset
3. triple onset
4. same-subtick same audio time
5. long vs short sample ID
6. legacy migration equivalence
7. JOIN beat boundary
8. MUTE beat boundary
9. tempo beat boundary
10. deterministic ensemble seed

Fixture:
[docs/m0-beat-event-fixture.md](./m0-beat-event-fixture.md)

## Recommended PR split

### PR 1 — engine only

- domain types
- migration helper
- beat scheduler
- fixture tests

No UI redesign. No rhythm rewrite.

### PR 2 — audio character

- short / long sample registry
- round robin
- ensemble layer

### PR 3 — Kecak preset

- source transcription
- A/B tuning
- actual default voice group sizes

### PR 4 — orbit UI

- beat sectors
- intra-beat marks
- sustain arcs
- visual playback cursor

この順にすると「schedulerバグ」「音源の問題」「採譜の問題」「UIの問題」を切り分けられる。
