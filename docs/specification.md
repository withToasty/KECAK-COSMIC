# KECAK-COSMIC — Specification

Version: v0.4  
Status: M0.1 beat-gesture implementation baseline

この文書は M0 の実装仕様を定義する。  
思想・背景は [concept.md](./concept.md)、ケチャのリズム設計は [kecak-rhythm-model.md](./kecak-rhythm-model.md)、確定事項は [decision-log.md](./decision-log.md) を参照。

---

## 1. プロダクト概要

KECAK-COSMIC は、複数の反復パターンが1本の共通 pulse の上で回り続け、互いに噛み合うことで音楽を作る Web アプリ。

M0では、実際のケチャの interlocking / kotekan をもとにした8つの声部を、一人ずつ参加させる。

将来の COSMIC MODE では、同じ「中心・軌道・周期・現在位置」というUI文法を、月・惑星・人工衛星の軌道周期へ接続する。

---

## 2. 時間モデル

### 2.1 Global Beat

M0.1では時間の大きな単位を `globalBeat` とする。

```
0 1 2 3 4 5 6 ... ∞
```

UI上では小節番号を主役にしない。Tempo BPM はこの global beat の速度を表す。

### 2.2 Beat subdivision

1 global beat = **12 subticks**。

```
0 1 2 3 4 5 6 7 8 9 10 11
```

12分割は、2分割・3分割・4分割を整数位置で同時に表現するためのデータ解像度。

- 2分割: 0 / 6
- 3分割: 0 / 4 / 8
- 4分割: 0 / 3 / 6 / 9

subtickごとにJavaScript timerを回してはいけない。
1beatのAudioContext callbackから、beat内部のevent時刻を直接scheduleする。

### 2.3 Tempo

UI名は `Tempo`。

Tempo = 120 BPM のとき:

```
1 beat = 500 ms
1 subtick = 41.666... ms
```

初期値:

```
120 BPM
```

範囲:

```
60–220 BPM
```

詳細は [beat-gesture-model.md](./beat-gesture-model.md) を正とする。
---

## 3. M0.1の8声部

最初の8声部の役割は現行M0を維持し、まずscheduler移行と音楽内容変更を分離する。

| Entry | Part | Role | Voice | Cycle length |
|---:|---|---|---|---:|
| 1 | Juru Klempung | beat keeper | pung | 1 beat |
| 2 | Cak Besik — Polos | polos | cak | 1 beat |
| 3 | Cak Besik — Sangsih | sangsih | cak | 1 beat |
| 4 | Cak Telu — Polos | polos | cak | 2 beats |
| 5 | Cak Telu — Sanglot | sanglot | cak | 2 beats |
| 6 | Cak Telu — Sangsih | sangsih | cak | 2 beats |
| 7 | Cak Lima — Polos | polos | cak | 4 beats |
| 8 | Cak Lima — Sangsih | sangsih | cak | 4 beats |

旧4-pulse gridは migration helper で次へ写像する。

```
q0 -> subtick 0
q1 -> subtick 3
q2 -> subtick 6
q3 -> subtick 9
```

移行後の source of truth は0/1配列ではなく `BeatCell / VocalEvent`。

その後、実演・採譜に合わせて sustained cak、double、triple、offset pattern、旋律声部へ差し替える。
engine logic と transcription data は分離する。
---

## 4. Performer の意味

画面上では各声部を代表する人物を1人表示する。

内部的な Performer は **1人の個人ではなく1つの声部グループ**。

M0.1 engine は最初から `EnsembleProfile` を持てる形にする。

```ts
type EnsembleProfile = {
  size: number
  timingSpreadMs: number
  gainSpread: number
  seed: number
}
```

schedulerの決定論テストでは size=1 / spread=0。
試聴では複数人へ展開し、同一eventを完全同時のコピーではなく小さなtiming / gain差を持つ肉声群として鳴らせるようにする。
---

## 5. 初回体験

8つの席は最初から円の外周に存在する。

開始時:

- Entry 1 の Juru Klempung のみ `joined = true`
- Entry 2〜8 は `joined = false`
- 未参加者は暗いシルエット
- globalBeat = 0
- playing = false

参加順は固定:

```
1. Juru Klempung
2. Besik Polos
3. Besik Sangsih
4. Telu Polos
5. Telu Sanglot
6. Telu Sangsih
7. Lima Polos
8. Lima Sangsih
```

M0では順番を飛ばして参加させない。

次に参加可能な人物だけを操作可能にする。

中央の `JOIN NEXT VOICE` と「次の人物をタップ」は同じ command を呼ぶ。

一度 joined になった声部は M0 では離脱しない。無音にしたい場合は Mute を使う。

---

## 6. 中央同心軌道UI

### 6.1 基本構造

全声部の周期は **同じ中心を共有する**。

各声部に1本ずつ専用の同心軌道を割り当てる。

```
Entry 1 = 最内周
Entry 2
Entry 3
...
Entry 8 = 最外周
```

8人の代表者は軌道群のさらに外側に45°間隔で円形に座る。

各人物の角度位置に、その人物が担当する軌道の短いラベルを置く。人物と軌道の対応を色だけに依存させない。

小さな円を各人物の周囲に8個作る方式は採用しない。

### 6.2 軌道 beat sector

各軌道の大きな区画数は `pattern.beats.length` と一致。

- 1 beat cycle → 1 sector
- 2 beat cycle → 2 sectors
- 4 beat cycle → 4 sectors

各sector内部に、そのbeatで発声する VocalEvent を配置する。

- short event = point
- sustained event = arc
- 1beat内の複数event = 同一sector内に複数mark
- current marker = beat内部を連続移動

旧 `○ / ●` の1bit node表現はM0.1ではsource of truthにしない。

### 6.3 向き

すべての軌道で:

- node 0 = 12時方向
- 進行方向 = 時計回り
- rotation = 0 が初期状態

### 6.4 marker animation

音のscheduleは beat callback と AudioContext time を基準にする。

表示上の current marker は `requestAnimationFrame` でbeat内部を連続的に補間する。

**音声クロックが主、アニメーションは追従。**

VocalEvent の start 時刻を通過した瞬間に、そのevent mark・人物・軌道を短く反応させる。

### 6.5 未参加声部

未参加の人物は暗いシルエット。

**8本の orbit outline 自体は開始時からすべて薄く表示する。**

未参加声部では:

- node は非表示
- moving marker は非表示
- orbit label は低コントラスト

JOINした瞬間から、その声部の node / marker / label を有効表示する。

---

## 7. Transport

M0では `START` / `STOP` / `RESET` の3操作を持つ。

### 7.1 START

停止状態で START を押すと:

1. ユーザー操作内で AudioContext / Tone.js を unlock
2. globalBeat = 0 から開始
3. **beat 0 をSTART時刻として即時評価**
4. beat 0 内の offsetSubtick=0 のeventはSTART時刻に発声
5. beat内の後続eventは同じbeat callback timeからAudioContext時刻へ展開
6. 以降 globalBeat を進める

最初の PUNG は1beat待たずSTARTと同時に鳴る。

### 7.2 STOP

STOP:

- audio transport を停止
- globalBeat = 0
- marker を node 0 に戻す
- joined 状態を維持
- muted 状態を維持
- volume を維持
- tempo を維持

STOP は「演奏を止めて頭出しする」操作。

### 7.3 RESET

RESET:

- transport を停止
- globalBeat = 0
- tempoBpm = 120
- Entry 1 のみ joined
- Entry 2〜8 は unjoined
- 全声部 muted = false
- volume を preset default へ戻す
- rotation = 0
- marker = node 0

RESET は初回体験へ完全に戻す操作。

### 7.4 Reload

M0では状態保存をしない。

ページ reload は RESET と同等。

PAUSE は M0 では実装しない。

---

## 8. JOIN / MUTE / VOLUME / TEMPO

### 8.1 JOIN

停止中:

- 次の声部を即座に joined にする

再生中:

- JOIN要求後の **次の global beat boundary** から joined を有効にする
- globalBeat はリセットしない
- patternの先頭を待たない

有効化時:

```ts
beatIndex =
  (globalBeat + performer.rotationBeats) %
  performer.pattern.beats.length
```

現在の世界のbeat位置へそのまま入る。

### 8.2 MUTE

`joined = true` の声部だけMute可能。

停止中は即時反映。

再生中は **次の global beat boundary** から反映。

`muted = true` でも orbit marker は動き続ける。

### 8.3 Volume

範囲:

```
0.0–1.0
```

初期値は preset ごとに定義可能。M0では原則 1.0。

再生中の変更は短い gain ramp を使いクリックノイズを避ける。

### 8.4 Tempo変更

停止中:

- 即時反映

再生中:

- UI変更を pending tempo として保持
- **次の global beat boundary** から適用
- 連続操作された場合は最新の pending tempo のみ採用

beat内部ではtempoを変えない。
同一beatに属するeventは同じsecondsPerBeatでscheduleする。

---

## 9. 発音判定とbeat内schedule

```ts
const beatIndex =
  (globalBeat + performer.rotationBeats) %
  performer.pattern.beats.length

const beatCell =
  performer.pattern.beats[beatIndex]

if (performer.joined && !performer.muted) {
  for (const event of beatCell) {
    scheduleVocalEvent(event)
  }
}
```

event start:

```ts
const eventTime =
  beatTime +
  (event.offsetSubtick / 12) *
    secondsPerBeat
```

同じbeat・同じoffsetSubtickのeventは、humanization前には完全に同一のaudio timeを持つ。

M0.1では `rotationBeats = 0`。
---

## 10. VocalEvent モデル

```ts
type VocalEvent = {
  offsetSubtick: number
  durationSubticks: number
  sampleId: SampleId
  accent: number
}

type BeatCell = readonly VocalEvent[]

type VoicePattern = {
  beats: readonly BeatCell[]
}
```

表現可能な例:

- 1拍伸ばす `cak-long`
- 短い単発 `cak-short`
- 1拍内のdouble
- 1拍内のtriple
- off-beat / late double
- pung
- 後続の sir / yang / nger / ngur

`durationSubticks` を合わせるためにshort sampleのplaybackRateを極端に変えない。
長音は長音用の肉声sampleを使う。

詳細は [beat-gesture-model.md](./beat-gesture-model.md)。
---

## 11. Audio Engine

### 11.1 固定技術

M0:

- Vite
- React
- TypeScript
- Tone.js
- SVG
- CSS

Canvas / WebGL はM0では使わない。

### 11.2 時間の正

**Tone.js / Web Audio の audio clock が唯一の時間の正。**

React state、DOM animation、`setInterval` は発音タイミングの基準にしない。

```
Tone.Transport / audio clock
        ↓
global beat callback
        ↓
all performer BeatCell evaluate
        ↓
VocalEvent -> exact audio time
        ↓
optional ensemble expansion
        ↓
sample scheduling
        ↓
visual event emitted
        ↓
React / requestAnimationFrame follows
```

### 11.3 Tone.js mapping

global beat を quarter-note 相当として扱う。

```ts
Tone.Transport.bpm.value = tempoBpm

Tone.Transport.scheduleRepeat((beatTime) => {
  scheduleBeat(globalBeat, beatTime)
}, '4n')
```

subtickごとのTransport callbackは作らない。
beat callbackから `offsetSubtick / 12` をAudioContext時刻へ変換する。

### 11.4 Same-subtick scheduling

同一beat・同一offsetSubtickで複数声部が発声する場合、
humanization前の全eventを **同一audio time** にscheduleする。

for-loopの実行時刻差を音声時刻へ反映させない。

### 11.5 Background / hidden tab

M0では、再生中にページが hidden になったら自動的に STOP と同じ状態へ移行する。

- joined / muted / volume / tempo は維持
- globalBeat = 0
- 復帰後はユーザーが START し直す

バックグラウンド中の時間を追跡して catch-up 再生しない。

---

## 12. Audio Samples

M0.1で最低限必要なsample family:

- `cak-short`
- `cak-long`
- `pung`

推奨初期ファイル:

```
public/sounds/cak-short-01.wav
public/sounds/cak-short-02.wav
public/sounds/cak-short-03.wav
public/sounds/cak-long-01.wav
public/sounds/cak-long-02.wav
public/sounds/pung-01.wav
```

将来:

- `sir`
- `yang`
- `nger`
- `ngur`

### 12.1 Sample player

sample familyは複数take対応にする。
shortとlongは別family。

round-robin / seeded variationへ拡張可能にする。

Tone.PlayerはAudioContext timeでstartし、必要な場合はduration / stopもaudio側でscheduleする。

### 12.2 Rights

Public repository に含める音源は以下のいずれかだけ:

- 自作録音
- 明示的に再利用可能なライセンス
- 自前生成した placeholder

ネット上から出所不明の音源をコピーしない。

音源を同梱する場合は `public/sounds/README.md` に出典・作者・ライセンスを記録する。

### 12.3 Master chain

同時発声・ensemble化によるclippingを避ける。

```
voice players
   ↓
member / performer gains
   ↓
master gain (headroom)
   ↓
limiter
   ↓
destination
```

master headroom と safety limiter はM0.1から持つ。
---

## 13. Preset Data

ケチャ由来patternをcomponent / schedulerへ直書きしない。

```
src/data/kecakPresets.ts
```

各presetには最低限:

- id
- displayName
- role
- pattern: VoicePattern
- ensemble
- defaultVolume
- sourceNote
- transcriptionStatus

を持たせる。

旧0/1 patternは migration helper の入力にだけ残してよい。
新規transcriptionのsource of truthにはしない。
---

## 14. Data Model

```ts
type SampleId =
  | 'cak-short'
  | 'cak-long'
  | 'pung'
  | 'sir'
  | 'yang'
  | 'nger'
  | 'ngur'

type VocalEvent = {
  offsetSubtick: number
  durationSubticks: number
  sampleId: SampleId
  accent: number
}

type BeatCell = readonly VocalEvent[]

type VoicePattern = {
  beats: readonly BeatCell[]
}

type EnsembleProfile = {
  size: number
  timingSpreadMs: number
  gainSpread: number
  seed: number
}

type Performer = {
  id: string
  entry: number
  name: string
  role: Role
  pattern: VoicePattern
  rotationBeats: number
  joined: boolean
  muted: boolean
  volume: number
  ensemble: EnsembleProfile
}

type Session = {
  tempoBpm: number
  pendingTempoBpm: number | null
  globalBeat: number
  playing: boolean
  performers: Performer[]
}
```

Performer参加状態、pattern event、ensemble expansionは別概念として保持する。
---

## 15. Visual Feedback

発声時:

- 対応するevent markを短く強調
- performer avatarを軽くpulse
- 担当orbitを短く強調

同じsubtickで複数声部が発声した場合:

- 該当する全声部を同時反応
- 中央も軽くpulse

long event:

- start時に反応
- sustain中はarcを保持
- releaseで通常表示へ戻す

interlockingの「隙間を別の声が埋める」関係をbeat内部で見えるようにする。
---

## 16. Mobile

スマートフォン縦画面も対象。

条件:

- 8つの同心軌道と人物の対応を判別できる
- tap target を十分確保
- 16-node ring は通常表示で簡略化してよい
- performer detail を開いたときに対象orbitを拡大表示
- detail panel が transport を完全に隠さない

---

## 17. M0.1の反復性

現行8声部をlegacy mappingで移行した場合、周期は 1 / 2 / 4 beats。

したがって完全presetは **4 global beats** ごとに同じbeat配置へ戻る。
各beat内部では12 subtickのevent位置を持つ。

source transcriptionへ差し替えた後は、そのpresetのbeat数の最小公倍数を周期とする。

長周期・異周期による長時間の関係変化はCOSMIC MODEで扱う。
---

## 18. Test Fixture

M0.1のengine仕様を自動テスト可能にする。

正解表:
[m0-beat-event-fixture.md](./m0-beat-event-fixture.md)

旧 [m0-pulse-fixture.md](./m0-pulse-fixture.md) はmigration equivalence確認用のlegacy fixture。

最低限テストする:

- beat 0 immediate
- double onset
- triple onset
- same-subtick same audio time
- long / short sample ID separation
- legacy 4-grid migration
- STOP → START
- JOIN beat boundary
- MUTE beat boundary
- tempo beat boundary
- ensemble seed determinism
---

## 19. M0.1 完了条件

以下が成立すればbeat-gesture engine移行完了。

- audio clock基準のglobal beatが安定して流れる
- START時にbeat 0 / offset 0が即時発声する
- 1beat内部に複数eventをscheduleできる
- 2分割 / 3分割 / 4分割eventを正しく置ける
- cak-short / cak-long / pungを別sample familyとして鳴らせる
- long sampleをshort sampleの極端なtime-stretchで代用しない
- 同一subtick eventが同一AudioContext timeを共有する
- legacy 0/1 presetを音価を変えず移行できる
- JOIN / MUTE / tempoがbeat boundaryで反映される
- ensemble layerをsize=1にすれば決定論テストできる
- ensemble layerを複数人にすれば微小timing / gain差を付けられる
- orbit UIがbeat sectorとbeat内eventを表現できる
- fixture testが通る
- スマートフォンで操作できる
---

## 20. M1 — 楽器化

実装済みの範囲は [m1-instrument.md](./m1-instrument.md) を参照。出典が必要な声部(Cak Nem など)は未実装。

M0後の候補:

- pattern node の直接 ON / OFF
- ring drag による rotation / phase
- performer / voice-group 追加削除
- Solo
- preset 保存
- URL共有
- pattern length 変更
- round-robin voice
- EnsembleProfile size / timing spread / gain spread editing
- Cak Nem
- Cak Pitu / Ocel
- Cak Lesung
- Panyelah
- Juru Gending
- dynamics cue
- transition cue

---

## 21. M2 — COSMIC MODE

KECAK LOOP の同心軌道 time model を宇宙へ接続する。

```ts
type CosmicPerformer = {
  id: string
  name: string
  sourceType: 'planet' | 'moon' | 'satellite'
  realPeriodSeconds: number
  compressedPeriodPulses: number
  voice: Voice
}
```

変換:

```
real orbital period
        ↓
time compression rule
        ↓
human-scale period
        ↓
shared-center orbit
        ↓
sound event
```

KECAK LOOP:

```
voice group + rhythm orbit
```

COSMIC MODE:

```
celestial body + orbital period
```

UI文法を共通化する。

---

## 22. M0ではやらないこと

- ログイン
- DB
- SNS
- AI作曲
- 3D
- VR
- realtime satellite tracking
- external astronomy API
- DAW機能
- 自由な pattern editor
- 正確な天体軌道シミュレーション
- pause / resume
- background playback
- persistence

---

## 23. 開発順序

1. Vite + React + TypeScript + Tone.js
2. Audio unlock
3. global beat scheduler + 12-subtick event expansion
4. PUNG 1声のみで pulse 0 / timing test
5. shared-center SVG orbit 1本
6. marker continuous animation
7. preset data layer
8. 8声部の scheduler test
9. 8本の同心軌道
10. JOIN NEXT VOICE
11. MUTE / Volume
12. START / STOP / RESET
13. Tempo boundary update
14. visual event / sustain feedback
15. performer detail
16. hidden-tab behavior
17. mobile
18. fixture tests
19. M0 test play

デザイン装飾より先に、音と時間モデルを完成させる。
