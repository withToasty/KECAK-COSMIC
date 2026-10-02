# KECAK-COSMIC — Specification

Version: v0.3  
Status: M0 implementation baseline

この文書は M0 の実装仕様を定義する。  
思想・背景は [concept.md](./concept.md)、ケチャのリズム設計は [kecak-rhythm-model.md](./kecak-rhythm-model.md)、確定事項は [decision-log.md](./decision-log.md) を参照。

---

## 1. プロダクト概要

KECAK-COSMIC は、複数の反復パターンが1本の共通 pulse の上で回り続け、互いに噛み合うことで音楽を作る Web アプリ。

M0では、実際のケチャの interlocking / kotekan をもとにした8つの声部を、一人ずつ参加させる。

将来の COSMIC MODE では、同じ「中心・軌道・周期・現在位置」というUI文法を、月・惑星・人工衛星の軌道周期へ接続する。

---

## 2. 時間モデル

### 2.1 Global Pulse

小節で区切らない。

```
0 1 2 3 4 5 6 7 8 9 10 ... ∞
```

START から STOP まで1本の pulse が進み続ける。

UI上では 4/4、1小節目、2小節目、といった小節概念をM0では使わない。

### 2.2 Internal Resolution

M0では、

```
1 klempung beat = 4 internal pulses
```

とする。

internal pulse が全声部共通の最小時間グリッド。

### 2.3 Tempo

UI名は `Tempo`。

BPM は **klempung beat の速度** を表す。internal pulse の速度ではない。

Tempo = 120 BPM のとき:

```
klempung beat = 120 / min
internal pulse = 480 / min
internal pulse interval = 125 ms
```

初期値:

```
120 BPM
```

範囲:

```
60–220 BPM
```

---

## 3. M0の8声部

M0 preset:

| Entry | Part | Role | Voice | Pattern length |
|---:|---|---|---|---:|
| 1 | Juru Klempung | beat keeper | pung | 4 |
| 2 | Cak Besik — Polos | polos | cak | 4 |
| 3 | Cak Besik — Sangsih | sangsih | cak | 4 |
| 4 | Cak Telu — Polos | polos | cak | 8 |
| 5 | Cak Telu — Sanglot | sanglot | cak | 8 |
| 6 | Cak Telu — Sangsih | sangsih | cak | 8 |
| 7 | Cak Lima — Polos | polos | cak | 16 |
| 8 | Cak Lima — Sangsih | sangsih | cak | 16 |

pattern 配列は [kecak-rhythm-model.md](./kecak-rhythm-model.md) を正とする。

これは「伝統的ケチャには固定8パートがある」という意味ではない。M0用の source-based abstraction とする。

---

## 4. Performer の意味

画面上では各声部を代表する人物を1人表示する。

ただし内部的な Performer は **1人の個人ではなく1つの声部グループ**。

M0:

```
groupSize = 1
```

将来は同じ声部に複数人を持たせ、音圧・微小な揺らぎ・複数テイクへ拡張できるようにする。

---

## 5. 初回体験

8つの席は最初から円の外周に存在する。

開始時:

- Entry 1 の Juru Klempung のみ `joined = true`
- Entry 2〜8 は `joined = false`
- 未参加者は暗いシルエット
- globalPulse = 0
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

### 6.2 軌道 node

各軌道の node 数は `pattern.length` と一致。

- 4 pulse → 4 nodes
- 8 pulse → 8 nodes
- 16 pulse → 16 nodes

表記:

- rest node = ○
- hit node = ●
- current marker = 現在位置

### 6.3 向き

すべての軌道で:

- node 0 = 12時方向
- 進行方向 = 時計回り
- rotation = 0 が初期状態

### 6.4 marker animation

音の判定自体は discrete な internal pulse で行う。

表示上の current marker は、node間を `requestAnimationFrame` で連続的に補間して移動させる。

**音声クロックが主、アニメーションは追従。**

current marker が hit node の時刻を通過した瞬間に発声し、人物と軌道も短く反応する。

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
2. globalPulse = 0 から開始
3. **pulse 0 をSTART時刻として即時評価**
4. pulse 0 で `joined = true` かつ `muted = false` かつ pattern の hit node が ON の声部は、その開始時刻に発声
5. 以降 internal pulse を進める

つまり最初の PUNG は「1 pulse待ってから」ではなく、STARTと同時に鳴る。

START中は START ボタンを無効化する。

### 7.2 STOP

STOP:

- audio transport を停止
- globalPulse = 0
- marker を node 0 に戻す
- joined 状態を維持
- muted 状態を維持
- volume を維持
- tempo を維持

STOP は「演奏を止めて頭出しする」操作。

### 7.3 RESET

RESET:

- transport を停止
- globalPulse = 0
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

- JOIN要求後の **次の internal pulse boundary** から joined を有効にする
- globalPulse はリセットしない
- pattern の先頭を待たない

有効化時:

```ts
position =
  globalPulse % pattern.length
```

現在の世界の位置へそのまま入る。

### 8.2 MUTE

`joined = true` の声部だけ Mute 可能。

停止中は即時反映。

再生中は次の internal pulse boundary から反映。

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
- **次の klempung beat boundary** から適用

つまり globalPulse が次に `% 4 === 0` になる境界で切り替える。

連続操作された場合は最新の pending tempo のみ採用。

---

## 9. 発音判定

```ts
const position =
  (globalPulse + performer.rotation) %
  performer.pattern.length

const hit =
  performer.pattern[position]

const shouldPlay =
  performer.joined &&
  !performer.muted &&
  hit.on
```

M0では全 performer の `rotation = 0`。

Phase を数値入力するUIは出さない。

将来は orbit ring を回転させる操作で rotation を変更する。

---

## 10. Hit モデル

M0から将来の強弱に対応できる形にする。

```ts
type Hit = {
  on: boolean
  accent: number
}
```

`accent`:

- 0.0–1.0
- M0 preset は原則 1.0
- 発音時の velocity / gain multiplier として利用可能

pattern文書では可読性のため 0/1 表記を使い、コードロード時に Hit 配列へ変換してよい。

発声gainは原則:

```ts
effectiveGain =
  performer.volume * hit.accent
```

とし、その後 master chain へ送る。

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

実装の基本:

```
Tone.Transport / audio clock
        ↓
internal pulse callback
        ↓
all performer patterns evaluate
        ↓
same-pulse hits scheduled at SAME audio time
        ↓
visual event emitted
        ↓
React / requestAnimationFrame follows
```

### 11.3 Tone.js mapping

klempung beat を quarter-note 相当として扱い、

```
Tone.Transport.bpm.value = tempoBpm
internal pulse = "16n"
```

とする。

内部では小節表示を利用しない。

### 11.4 Same-pulse scheduling

同一pulseで複数声部が発声する場合、全サンプルを **同一の callback time** に schedule する。

for-loop の実行時刻差を音声時刻へ反映させない。

### 11.5 Background / hidden tab

M0では、再生中にページが hidden になったら自動的に STOP と同じ状態へ移行する。

- joined / muted / volume / tempo は維持
- globalPulse = 0
- 復帰後はユーザーが START し直す

バックグラウンド中の時間を追跡して catch-up 再生しない。

---

## 12. Audio Samples

M0で必要な voice:

- `cak`
- `pung`

### 12.1 Sample player

最初から複数sample対応の形にする。

```ts
samples.cak = ['cak-01.wav']
samples.pung = ['pung-01.wav']
```

将来:

```ts
samples.cak = [
  'cak-01.wav',
  'cak-02.wav',
  'cak-03.wav'
]
```

として round-robin / variation へ拡張可能にする。

### 12.2 Rights

Public repository に含める音源は以下のいずれかだけ:

- 自作録音
- 明示的に再利用可能なライセンス
- 自前生成した placeholder

ネット上から出所不明の音源をコピーしない。

音源を同梱する場合は `public/sounds/README.md` に出典・作者・ライセンスを記録する。

M0開始時に適切な声素材がなければ、仮音源で実装し後から差し替える。

### 12.3 Master chain

同時発声による clipping を避ける。

推奨初期構成:

```
voice players
   ↓
performer gains
   ↓
master gain (-12 dB headroom)
   ↓
limiter (-1 dB ceiling)
   ↓
destination
```

数値は試聴で調整可能だが、master headroom と safety limiter 自体はM0から持つ。

---

## 13. Preset Data

ケチャ由来 pattern を component / scheduler に直書きしない。

```
src/data/kecakPresets.ts
```

へ集約する。

各presetには最低限:

- id
- displayName
- role
- voice
- pattern
- defaultVolume
- sourceNote
- transcriptionStatus

を持たせる。

特に Cak Lima は後から資料照合による修正を行えるよう、engine logic と完全に分離する。

---

## 14. Data Model

```ts
type Voice = 'cak' | 'pung'

type Role =
  | 'beat-keeper'
  | 'polos'
  | 'sangsih'
  | 'sanglot'

type KecakPart =
  | 'klempung'
  | 'besik-polos'
  | 'besik-sangsih'
  | 'telu-polos'
  | 'telu-sanglot'
  | 'telu-sangsih'
  | 'lima-polos'
  | 'lima-sangsih'

type Hit = {
  on: boolean
  accent: number
}

type Performer = {
  id: string
  entry: number
  name: string
  kecakPart: KecakPart
  role: Role
  voice: Voice
  pattern: readonly Hit[]
  rotation: number
  joined: boolean
  muted: boolean
  volume: number
  groupSize: number
}

type Session = {
  tempoBpm: number
  pendingTempoBpm: number | null
  globalPulse: number
  playing: boolean
  performers: Performer[]
}
```

Performer レベルでは `active` という状態名は使わない。発声点は `Hit.on`、参加状態は `joined`、消音状態は `muted` で表現する。

`joinedCount` のような導出可能な値も state として保持しない。必要な場合は `performers.filter(p => p.joined).length` から算出する。

状態の意味は:

```
joined = false
  → まだ参加していない

joined = true, muted = false
  → 参加して発声可能

joined = true, muted = true
  → 参加済みだが無音
```

---

## 15. Visual Feedback

発声時:

- hit node を短く強調
- performer avatar を軽く pulse
- 担当 orbit を短く強調

同じpulseで2声以上が発声した場合:

- 該当する全声部を同時反応
- 中央も軽く pulse

interlocking の「重なった瞬間」を視覚化する。

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

## 17. M0の反復性

pattern length は 4 / 8 / 16。

したがって全8声部の状態は最小公倍数である **16 internal pulses ごとに完全に同じ配置へ戻る**。

これはM0の仕様。

M0の目的は長大な非反復音楽ではなく、Kecak interlocking を短い周期で理解・体験すること。

長周期・異周期による長時間の関係変化は COSMIC MODE で扱う。

---

## 18. Test Fixture

M0の音楽仕様そのものを自動テスト可能にする。

全8声部 joined / unmuted / rotation 0 の状態で、pulse 0〜15 に「どの声部が鳴るか」の正解表を固定する。

正解表は [m0-pulse-fixture.md](./m0-pulse-fixture.md) を参照。

最低限テストする:

- pulse 0 の発声
- 16 pulse の完全反復
- START時の off-by-one
- STOP → START
- JOIN途中参加
- MUTE
- tempo境界変更
- same-pulse scheduling

---

## 19. M0 完了条件

以下が成立すればM0完了。

- audio clock 基準の global pulse が安定して流れる
- START時に pulse 0 が即時発声する
- STOP / RESET が仕様通り動く
- 8席が円形に表示される
- 8本の同心軌道を共有中心で表示できる
- 1人から固定順で8声部まで参加させられる
- 各声部が定義済み pattern を繰り返す
- 4 / 8 / 16 pulse の node が正しく動く
- 同時発声が同一AudioContext timeで鳴る
- Mute / Volume が動く
- Tempo変更が beat境界で反映される
- cak / pung が鳴る
- hidden tab で安全にSTOPする
- fixture test が通る
- スマートフォンで操作できる

---

## 20. M1 — 楽器化

M0後の候補:

- pattern node の直接 ON / OFF
- ring drag による rotation / phase
- performer / voice-group 追加削除
- Solo
- preset 保存
- URL共有
- pattern length 変更
- round-robin voice
- groupSize > 1
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
3. quarter beat + 16n internal pulse scheduler
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
14. visual hit feedback
15. performer detail
16. hidden-tab behavior
17. mobile
18. fixture tests
19. M0 test play

デザイン装飾より先に、音と時間モデルを完成させる。
