# KECAK-COSMIC — Beat Gesture Model

Version: v0.1
Status: M0.1 implementation baseline

## 1. Why this model exists

旧M0は `Hit.on = true / false` の離散グリッドだけで発声を表現していた。
この方式では「1拍伸ばす声」と「同じ1拍の中で2回・3回と短く刻む声」を区別できず、
ケチャの声の質感を表現しにくい。

M0.1では時間を次の3階層に分ける。

```
global beat
  ↓
beat内の発声位置
  ↓
個々の vocal event の長さ / 音節 / 強さ
```

## 2. Canonical time unit

### 2.1 Global beat

`globalBeat` がアプリ全体の大きな時間単位。
UI上の Tempo BPM は global beat のBPMを表す。

```
0 1 2 3 4 5 ... ∞
```

M0.1では 1 global beat を klempung / pung の基準拍として扱う。

### 2.2 Beat subdivision

1 beat = **12 subticks** とする。

理由:

- 2分割 → 0 / 6
- 3分割 → 0 / 4 / 8
- 4分割 → 0 / 3 / 6 / 9

をすべて整数で表せる。

```
subtick: 0 1 2 3 4 5 6 7 8 9 10 11
```

subtick は音楽上のデータ表現用であり、12倍速の JavaScript timer を回す意味ではない。
AudioContext / Tone.js の時刻へ変換して直接scheduleする。

## 3. Vocal event

```ts
export const SUBTICKS_PER_BEAT = 12 as const

export type SampleId =
  | 'cak-short'
  | 'cak-long'
  | 'pung'
  | 'sir'
  | 'yang'
  | 'nger'
  | 'ngur'

export type VocalEvent = {
  offsetSubtick: number
  durationSubticks: number
  sampleId: SampleId
  accent: number
}

export type BeatCell = readonly VocalEvent[]

export type VoicePattern = {
  beats: readonly BeatCell[]
}
```

Constraints:

- `offsetSubtick`: integer 0–11
- `durationSubticks`: integer >= 1
- `accent`: 0.0–1.0
- event は必要なら次beatへ sustain してよい
- sample の playbackRate を duration 合わせのために変更しない

## 4. Basic gestures

### Sustain / 1拍伸ばす

```ts
const CAK_LONG: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 12,
    sampleId: 'cak-long',
    accent: 1,
  },
]
```

### Short single

```ts
const CAK_SINGLE: BeatCell = [
  {
    offsetSubtick: 0,
    durationSubticks: 2,
    sampleId: 'cak-short',
    accent: 1,
  },
]
```

### Double

```ts
const CAK_DOUBLE: BeatCell = [
  { offsetSubtick: 0, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
  { offsetSubtick: 6, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
]
```

### Triple

```ts
const CAK_TRIPLE: BeatCell = [
  { offsetSubtick: 0, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
  { offsetSubtick: 4, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
  { offsetSubtick: 8, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
]
```

### Offset double

```ts
const CAK_LATE_DOUBLE: BeatCell = [
  { offsetSubtick: 3, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
  { offsetSubtick: 9, durationSubticks: 2, sampleId: 'cak-short', accent: 1 },
]
```

## 5. Pattern representation

Patternは hit の列ではなく beat の列。

```ts
const examplePattern: VoicePattern = {
  beats: [
    CAK_LONG,
    CAK_DOUBLE,
    [],
    CAK_TRIPLE,
  ],
}
```

周期位置:

```ts
const beatIndex =
  (globalBeat + performer.rotationBeats) %
  performer.pattern.beats.length
```

## 6. Audio scheduling

Tone.Transport の quarter-note 相当を1 global beatとして使う。

```ts
Tone.Transport.bpm.value = tempoBpm

Tone.Transport.scheduleRepeat((beatTime) => {
  scheduleBeat(globalBeat, beatTime)
}, '4n')
```

beat callback の中で:

```ts
const secondsPerBeat = 60 / tempoBpm

for (const event of beatCell) {
  const eventTime =
    beatTime +
    (event.offsetSubtick / SUBTICKS_PER_BEAT) *
      secondsPerBeat

  triggerVocalEvent(event, eventTime, secondsPerBeat)
}
```

同じ subtick に存在する複数声部は、同じ式から得た同一 `eventTime` へscheduleする。

### Long sample

`cak-long` は専用の肉声音源を使う。
短い `cak-short` を playbackRate で引き伸ばして代用しない。

`durationSubticks` は、長いsampleを必要な位置で切る / releaseするための値。
sample自体が短い場合に無理にtime-stretchしない。

## 7. Ensemble / group sound

画面上の1人は rhythmic voice group の代表者。

```ts
export type EnsembleProfile = {
  size: number
  timingSpreadMs: number
  gainSpread: number
  seed: number
}
```

例:

```ts
ensemble: {
  size: 8,
  timingSpreadMs: 16,
  gainSpread: 0.08,
  seed: 301,
}
```

同じeventを複数memberへ展開する。
ただし完全なランダム値を毎回生成しない。
seeded PRNG または固定member profileを使い、同一sessionでは再現可能にする。

テスト時は:

```
size = 1
timingSpreadMs = 0
gainSpread = 0
```

として決定論的に検証する。

## 8. Sample requirements

最低限:

```
public/sounds/cak-short-01.wav
public/sounds/cak-short-02.wav
public/sounds/cak-short-03.wav

public/sounds/cak-long-01.wav
public/sounds/cak-long-02.wav

public/sounds/pung-01.wav
```

後続で:

```
sir / yang / nger / ngur
```

を追加可能。

各sampleの出典・作者・ライセンスは `public/sounds/README.md` に記録する。

## 9. UI mapping

軌道の大きな区画 = beat。

beat内部のeventは区画内の小markとして表示する。

- short event = 点
- long event = arc
- 2発 / 3発 = 同じbeat区画内に複数mark
- current marker = beat内を連続移動

したがって円は、

```
cycle
  └ beat
      └ vocal events
```

を直接可視化する。

## 10. JOIN / MUTE boundary

M0.1では JOIN / MUTE の反映境界を **次の global beat boundary** とする。

理由:

- 1拍の途中からgroupが突然参加する不自然さを避ける
- scheduler実装を明確にする
- source transcription のbeat単位と揃える

Tempo変更も次の global beat boundary で反映する。

## 11. Migration from old 4-pulse model

旧モデル:

```
q0 q1 q2 q3
```

はM0.1で次へ写像できる。

```
q0 -> subtick 0
q1 -> subtick 3
q2 -> subtick 6
q3 -> subtick 9
```

これにより旧binary patternをlosslessに移行できる。

ただし移行後は 0/1 pattern を source of truth にしない。
BeatCell / VocalEvent を正とする。

## 12. Non-goals for this change

この変更だけでは「唯一の正しいケチャ」を定義しない。

M0.1の目的:

1. 長音と短音を区別できる
2. 1拍内の複数発声を表現できる
3. 同一声部を複数人の声として鳴らせる
4. 実演採譜をデータへ写せる
5. UIでその構造を見せられる

実際の採譜presetの精度調整は、このengine完成後にA/B試聴して行う。
