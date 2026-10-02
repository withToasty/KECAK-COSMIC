# KECAK-COSMIC — Specification

Version: v0.2  
Status: Draft / Prototype specification

この文書は「何を実装するか」を定義する。  
思想・背景は [concept.md](./concept.md)、ケチャのリズム設計は [kecak-rhythm-model.md](./kecak-rhythm-model.md) を参照。

---

## 1. プロダクト概要

KECAK-COSMIC は、複数の反復パターンが1本の共通 pulse の上で回り続け、互いに噛み合うことで音楽を作る Web アプリ。

M0では、人間の演奏者を円形に配置し、実際のケチャの interlocking / kotekan をもとにした8つのパートを一人ずつ参加させる。

将来の COSMIC MODE では、この「円」「周期」「現在位置」という同じUI文法を、月・惑星・人工衛星の軌道周期へ接続する。

---

## 2. 時間モデル

### 2.1 Global Pulse

小節で区切らない。

```
0 1 2 3 4 5 6 7 8 9 10 ... ∞
```

START から STOP まで1本の pulse が永遠に進む。

4/4、1小節目、2小節目、といった表示はM0では使わない。

### 2.2 Internal Resolution

M0では、

```
1 klempung beat = 4 internal pulses
```

とする。

これを全パート共通の最小時間グリッドにする。

---

## 3. M0の8パート

M0 preset は以下。

| Entry | Part | Voice | Pattern length |
|---:|---|---|---:|
| 1 | Juru Klempung | pung | 4 |
| 2 | Cak Besik — Polos | cak | 4 |
| 3 | Cak Besik — Sangsih | cak | 4 |
| 4 | Cak Telu — Polos | cak | 8 |
| 5 | Cak Telu — Sanglot | cak | 8 |
| 6 | Cak Telu — Sangsih | cak | 8 |
| 7 | Cak Lima — Polos | cak | 16 |
| 8 | Cak Lima — Sangsih | cak | 16 |

実際の pattern 配列は [kecak-rhythm-model.md](./kecak-rhythm-model.md) を正とする。

これは「伝統的ケチャに固定8パートがある」という意味ではなく、実際のケチャ構造をM0用に縮約した preset。

---

## 4. 初回体験

8つの席は最初から円形に配置する。

ただし開始時に active なのは Entry 1 のみ。

未参加者は暗いシルエットで表示する。

ユーザーが次の人物をクリック、または `JOIN NEXT VOICE` を押すたびに、固定順で1人ずつ参加する。

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

参加しても global pulse は止めない・リセットしない。

新しい演奏者は現在の global pulse 上の正しい位相位置から演奏へ加わる。

---

## 5. 円形UI

### 5.1 全体

8人は中央を向いて円形に座る。

中央:

- START / STOP
- Pulse tempo
- JOIN NEXT VOICE

### 5.2 各演奏者の orbit

各演奏者は小さな円形シーケンサーを持つ。

node 数 = `pattern.length`

例:

- 4 pulse → 4 nodes
- 8 pulse → 8 nodes
- 16 pulse → 16 nodes

表記:

- rest node = ○
- active node = ●
- current position = moving marker

current marker が ● に到達した瞬間に発声。

### 5.3 円の意味

円は装飾ではなく、周期を可視化したもの。

M0では「リズムの軌道」。

COSMIC MODEでは「天体・衛星の軌道」へそのまま意味を拡張する。

---

## 6. START / STOP

### START

- AudioContext を開始
- globalPulse を進める
- active performer の pattern を評価
- 該当 node で発声
- UI current marker を同期

### STOP

M0では:

- transport 停止
- globalPulse = 0
- 全 performer の表示位置を初期位置へ戻す

後のバージョンでは pause と reset を分けてもよい。

---

## 7. Tempo

UI名は `Tempo`。

**BPM は klempung beat の速度を表す。internal pulse の速度ではない。**

```
1 klempung beat = 4 internal pulses
```

したがって Tempo = 120 BPM のとき:

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

スケジューラは内部的に `tempoBpm * 4` の pulse rate を使う。

M0では全パートが同じ global pulse を共有する。

---

## 8. 発声

M0で必要な voice:

- `cak`
- `pung`

最初から `cek` / `tak` / `low` など創作音色を増やさない。

まずケチャ由来の構造を確認する。

### 音源優先順位

1. 実際の短い人声サンプル
2. 録音が未準備なら仮サンプル
3. 最終手段として Web Audio API 生成音

音声ファイルは差し替え可能にする。

---

## 9. 発音判定

```ts
const position =
  globalPulse % performer.pattern.length

const shouldPlay =
  performer.active &&
  performer.pattern[position] === 1
```

発声タイミングは UI の `setInterval` に依存させない。

Audio scheduler を時間の正とする。

---

## 10. Phase

M0では数値入力の Phase はUIに出さない。

将来、orbit ring 自体を回転させることで位相を変える。

内部:

```ts
const position =
  (globalPulse + performer.rotation) %
  performer.pattern.length
```

M0の preset では `rotation = 0`。

---

## 11. Performer 操作

M0でユーザーができること:

- 参加させる
- active / mute
- volume 調整
- performer をクリックして pattern 名を見る

M0では pattern 自体を編集しない。

理由:

まず「本物のケチャ由来の8パートを重ねた時に、どんな体験になるか」を検証する。

自由編集はM1。

---

## 12. Performer Detail

演奏者をクリックしたら小さな panel を表示。

表示内容:

- Part name
- Role: polos / sangsih / sanglot / beat keeper
- Pattern length
- Voice
- Volume
- Mute
- pattern ring の拡大表示

説明例:

```
CAK TELU — SANGLOT

8 pulses
in-between voice

Polos と Sangsih の間を埋める
3声 interlock の中央パート
```

---

## 13. 視覚フィードバック

発声時:

- current node を一瞬強調
- performer 本体を軽く pulse
- orbit ring を一瞬発光

同時発声が起きた場合:

- 該当する全 performer を同時に反応させる
- 中央円もわずかに pulse させる

「複数周期が重なった瞬間」が視覚でも分かるようにする。

---

## 14. データモデル

```ts
type Voice = 'cak' | 'pung'

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
  active: boolean
  accent: number // M0 default = 1.0
}

type Performer = {
  id: string
  name: string
  kecakPart: KecakPart
  role: 'beat-keeper' | 'polos' | 'sangsih' | 'sanglot'
  voice: Voice
  pattern: readonly Hit[]
  rotation: number
  active: boolean
  joined: boolean
  volume: number

  // UI上は代表者1人を表示するが、内部概念は「声部グループ」。
  // M0では常に1。将来は複数人化・微小な揺らぎに使う。
  groupSize: number
}

type Session = {
  tempoBpm: number // klempung beat BPM
  globalPulse: number
  playing: boolean
  joinedCount: number
  performers: Performer[]
}
```

---

## 15. 初期状態

```ts
{
  tempoBpm: 120,
  globalPulse: 0,
  playing: false,
  joinedCount: 1
}
```

Entry 1 の Juru Klempung のみ joined。

START 後:

```
pung . . . pung . . . pung ...
```

ここから一人ずつ増える。

---

## 16. 音響エンジン

推奨:

- Tone.js
- Web Audio API

### 16.1 時間の正

**Audio clock が唯一の時間の正。React state は表示専用。**

禁止:

- `setInterval` を発音タイミングの基準にする
- React render / state update を発音トリガーにする

同一 pulse で複数声部が鳴る場合、すべて同一 AudioContext time に schedule する。

### 16.2 途中参加

新しい声部は JOIN した時点で global pulse をリセットしない。

次の scheduled pulse から、

```ts
position = globalPulse % pattern.length
```

の現在位置で参加する。

「その人の1周目を待つ」処理はしない。

### 16.3 Browser audio unlock

モバイルブラウザを含め、最初の START ユーザー操作内で AudioContext / Tone.start() を unlock する。

### 16.4 Background / visibility

M0ではページが非表示になった場合、復帰後に wall-clock の経過分を追いかけて高速再生しない。

AudioContext / transport の実際の状態を正とし、必要なら安全に再同期する。

### 16.5 Sample architecture

M0は1 sample / voice でもよいが、sample player は将来の round-robin を前提に配列を受け取れる構造にする。

例:

```ts
samples.cak = ['cak-01.wav']
```

M1以降:

```ts
samples.cak = ['cak-01.wav', 'cak-02.wav', 'cak-03.wav']
```

### 16.6 Pattern source isolation

ケチャ由来 pattern は component や scheduler に直書きしない。

`src/data/kecakPresets.ts` に集約し、各 preset に source / note を持たせる。

Cak Lima は特に後から転写を修正しやすくする。

### 16.7 UI density

16-node ring はスマートフォン通常表示で読みにくい可能性がある。

通常時は orbit と current marker を優先し、node は簡略表示してよい。
performer detail を開いたときに拡大 ring を表示する。

構造:

```
audio clock
   ↓
global pulse scheduler
   ↓
performer pattern evaluation
   ↓
sample trigger
   ↓
visual event
```

音が主、UIは追従。

重要:

- long-running drift を極力避ける
- 画面描画負荷で音がずれない
- タブ復帰時の状態を壊さない
- 同時発声を正確に揃える

---

## 17. デザイン

M0の目的は「宇宙っぽい画面」を作ることではない。

優先順位:

1. interlocking が聴こえる
2. 一人ずつ加わることで複雑さが立ち上がる
3. 円を見ると pattern が理解できる
4. 操作が直感的
5. 見た目

背景は暗色。

人物・node・orbit を主役にする。

星空、星雲、派手なパーティクルは後回し。

---

## 18. モバイル

スマートフォン縦画面を基準の1つとする。

条件:

- 8人の円が1画面内に収まる
- current marker が見える
- 人物タップ領域は十分確保
- panel を開いても中央 transport を完全には隠さない

---

## 19. M0 完了条件

以下がすべて成立すればM0完了。

- 1本の global pulse が安定して流れる
- 8席が円形に表示される
- 初期状態は1人のみ
- 1人ずつ順番に参加させられる
- 各 performer が定義済み pattern を永遠に繰り返す
- 4 / 8 / 16 pulse の ring が正しく回る
- active node でのみ発声する
- cak / pung が鳴る
- 同時発声がずれない
- 発声時に performer が視覚反応する
- STOP で初期位置へ戻る
- スマートフォンで操作できる

---

## 20. M1 — 楽器化

M0後に追加候補:

- pattern node を直接 ON / OFF
- ring drag による rotation / phase
- performer 追加 / 削除
- Solo
- preset 保存
- URL共有
- pattern length 変更
- voice 差し替え
- Cak Nem
- Cak Pitu / Ocel
- Cak Lesung
- Panyelah
- Juru Gending
- dynamics cue
- transition cue

M1で「ケチャ再現 preset」から「ケチャの原理を使う楽器」へ広げる。

---

## 21. M2 — COSMIC MODE

KECAK LOOP の円形 time model を宇宙へ置き換える。

### 21.1 Cosmic performer

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

### 21.2 変換

```
real orbital period
        ↓
time compression rule
        ↓
human-scale period
        ↓
orbit revolution
        ↓
sound event
```

### 21.3 UI

KECAK LOOP:

```
person + rhythm orbit
```

COSMIC MODE:

```
celestial body + actual-looking orbit
```

基本操作は共通。

---

## 22. M0の反復性

M0の pattern length は 4 / 8 / 16 なので、全声部の状態は最小公倍数である **16 internal pulses ごとに完全に同じ配置へ戻る**。

これは仕様とする。

M0の目的は長大な非反復音楽ではなく、**Kecak interlocking の成立を短い周期で理解・体験すること**。

長周期・異周期による「関係が長時間変化し続ける」体験は COSMIC MODE で扱う。

---

## 23. M0ではやらないこと

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
- 正確な天体軌道描画

最初の検証は1つだけ。

> **単純な役割を一人ずつ重ねるだけで、複雑な音楽が立ち上がる体験は面白いか。**

---

## 24. 開発順序

1. Vite + React + TypeScript
2. global pulse scheduler
3. cak / pung sample playback
4. 1 performer + 1 orbit ring
5. pattern node 判定
6. 8席の円形配置
7. 8 preset pattern 実装
8. JOIN NEXT VOICE
9. 発声 animation
10. 同時発声 visual
11. performer detail
12. tempo
13. mobile
14. M0 test

デザインの前に、まず音で interlocking が成立することを確認する。
