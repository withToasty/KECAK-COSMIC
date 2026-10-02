# KECAK-COSMIC — Kecak Rhythm Model

Status: Source-grounded prototype model  
Purpose: KECAK LOOP の最初の8パートを、実際のケチャのインターロッキング構造から抽象化して定義する。

> この文書の8パートは「伝統的ケチャには8人の固定パートがある」という意味ではない。
> 実際のケチャは大人数の合唱で、同じパートを複数人が担当し、地域・グループによって使用パターンも変わる。
> ここでは、文献に記録された pola cak / kotekan を、M0で理解・実装できる8つの役割へ縮約する。

---

## 1. 調査から採用する基本原理

ケチャの中心は、短い ostinato（反復パターン）を複数の声部が同時に繰り返し、互いの隙間を埋める **kotekan / interlocking** にある。

主要な声部関係:

- **polos** — 基準側、主に on-beat
- **sangsih** — polos と噛み合う off-beat 側
- **sanglot** — kecak でよく使われる3声構造の「間」に入る声部

文献では、cak besik / cak telu / cak lima / cak nem / cak pitu など複数の pola cak が同時に重ねられる。

特に cak telu は、polos / sanglot / sangsih の3声が、同じリズム形を時間的にずらして噛み合わせる代表的な構造。

---

## 2. KECAK-COSMIC の時間モデル

### 2.1 Global Pulse

アプリ全体には、小節で区切られない1本の pulse が永遠に流れる。

```
0 1 2 3 4 5 6 7 8 9 10 11 ... ∞
```

STOP するまで終わらない。

UI上では「4/4」「1小節目」のような西洋音楽的な小節表示を基本にしない。

### 2.2 最小時間単位

M0 の内部時間単位は、

**1 klempung beat = 4 internal pulses**

とする。

理由:

- cak telu が1 beatを4つの等間隔 pulse に分ける資料がある
- besik の beat / off-beat も同じ4分割グリッド上に置ける
- 後から細かいパターンを追加しやすい

したがって内部 pulse を `q` とすると、

```
klempung beat:
q0 q1 q2 q3
^     ^
on    half
```

となる。

---

## 3. 円のルール

各声部は、自分専用の円形シーケンサーを持つ。ただし **すべての軌道は同じ中心を共有する同心円** とする。

例: 8 pulse pattern

```
       0
    7     1
  6         2
  5         3
       4
```

global pulse が1つ進むたびに、各声部の現在位置も1 node進む。node 0 は12時方向、進行方向は時計回り。

現在位置が active node に到達した瞬間だけ発声する。

つまり、

```
global pulse
      ↓
orbital position
      ↓
pattern node
      ↓
voice
```

という構造。

円は装飾ではなく、時間そのものを可視化する。

---

## 4. M0の最初の8パート

最初の8パートは以下とする。

| Entry | Part | Role | Voice | Pattern length |
|---:|---|---|---|---:|
| 1 | Juru Klempung | beat keeper | pung | 4 |
| 2 | Cak Besik — Polos | on-beat | cak | 4 |
| 3 | Cak Besik — Sangsih | off-beat | cak | 4 |
| 4 | Cak Telu — Polos | 3-part interlock | cak | 8 |
| 5 | Cak Telu — Sanglot | in-between | cak | 8 |
| 6 | Cak Telu — Sangsih | off-beat | cak | 8 |
| 7 | Cak Lima — Polos | 2-part interlock | cak | 16 |
| 8 | Cak Lima — Sangsih | complementary part | cak | 16 |

この8つで、

- pulse の基準
- 2声の interlock
- 3声の interlock
- さらに長い別周期

を段階的に体験できる。

---

## 5. パターン定義

表記:

- `1` = 発声
- `0` = 休符

### 5.1 Juru Klempung

beat keeper。

実際のケチャでは `pung` を規則的に発声してテンポを保持する役割。

```
1000
```

4 internal pulses ごとに:

```
PUNG . . .
```

を繰り返す。

---

### 5.2 Cak Besik — Polos

1 klempung beat の on-beat。

```
1000
```

発声:

```
CAK . . .
```

---

### 5.3 Cak Besik — Sangsih

同じ beat の halfway に入る complementary part。

```
0010
```

polos と合わせると:

```
Polos    CAK .   .   .
Sangsih  .   .   CAK .
Combined CAK .   CAK .
```

となり、単独では単純な2つの声が互いの空間を埋める。

---

### 5.4 Cak Telu — Polos

cak telu は2 klempung beats = 8 internal pulses を1周期として扱う。

```
00100101
```

```
. . CAK . . CAK . CAK
```

---

### 5.5 Cak Telu — Sanglot

```
10010100
```

```
CAK . . CAK . CAK . .
```

---

### 5.6 Cak Telu — Sangsih

```
01001010
```

```
. CAK . . CAK . CAK .
```

3声を重ねると、各人のパターンは疎なのに、全体では高密度の連続した interlocking texture になる。

重要なのは **誰か一人が複雑なフレーズを演奏しているわけではない** こと。

複雑さは声部間の関係から生まれる。

---

### 5.7 Cak Lima — Polos

4 klempung beats = 16 internal pulses。

M0では Stepputat の転写を4分割 pulse grid に写して以下を使用する。

```
1000100010001010
```

4つずつ区切ると:

```
1000 | 1000 | 1000 | 1010
```

---

### 5.8 Cak Lima — Sangsih

```
0010001000100101
```

4つずつ区切ると:

```
0010 | 0010 | 0010 | 0101
```

最後の beat で polos / sangsih の発声密度が上がり、次の周期への推進感を作る。

---

## 6. 8人が増える順序

初回体験では8人を最初から全部鳴らさない。

参加順は固定 preset とする。

```
1. Juru Klempung
      ↓
2. Besik Polos
      ↓
3. Besik Sangsih
      ↓
4. Telu Polos
      ↓
5. Telu Sanglot
      ↓
6. Telu Sangsih
      ↓
7. Lima Polos
      ↓
8. Lima Sangsih
```

意図:

### 1人
ただの pulse。

### 2人
pulse に cak が乗る。

### 3人
最初の「噛み合い」が聞こえる。

### 4〜5人
リズムが複雑になり始める。

### 6人
cak telu の3声 interlock が完成する。

### 7〜8人
別周期の層が入り、個々の単純さから全体の複雑さが生まれる。

この「一人ずつ参加させる」過程そのものをチュートリアルにする。

---

## 7. 初回UI

8つの席は最初から円形に存在する。

ただし未参加者は暗いシルエット。

開始時:

```
7   8   1*  2
6           3
    5   4
```

`1*` のみ active。

ユーザーが `JOIN NEXT VOICE` を押すか、次の暗い人物をクリックすると次のパートが参加する。

参加時:

- 人物が明るくなる
- その人物の orbit が現れる
- pattern nodes が表示される
- 次の global pulse から演奏へ加わる

途中参加で global pulse 自体はリセットしない。

---

## 8. 円の見え方

各声部の orbit の node 数は patternLength と一致させる。Entry 1 を最内周、Entry 8 を最外周とする。

- 4 pulse part → 4 node ring
- 8 pulse part → 8 node ring
- 16 pulse part → 16 node ring

active node は塗りつぶす。

current position は別の moving marker で示す。

```
○ = rest
● = cak
◎ = current position
```

current position が ● と重なった瞬間に発声し、人物も pulse animation する。

---

## 9. データモデル

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
  accent: number
}

type Performer = {
  id: string
  entry: number
  name: string
  kecakPart: KecakPart
  voice: Voice
  pattern: readonly Hit[]
  rotation: number
  joined: boolean
  muted: boolean
  volume: number
  groupSize: number
}

type Session = {
  tempoBpm: number // klempung beat BPM
  pendingTempoBpm: number | null
  globalPulse: number
  playing: boolean
  performers: Performer[]
}
```

現在位置:

```ts
const position =
  (globalPulse + performer.rotation) %
  performer.pattern.length
```

発声:

```ts
const shouldPlay =
  performer.joined &&
  !performer.muted &&
  performer.pattern[position].active
```

---

## 10. Phase の扱い

M0では数値入力の `Phase` は廃止する。

将来、ユーザーが pattern ring を回転させることで位相を変更する。

内部的には:

```ts
position =
  (globalPulse + rotation) % pattern.length
```

とする。

UIでは「Phase = 3」のような数値を主役にしない。

**円を回した結果として位相が変わる。**

---

## 11. COSMIC MODE への接続

この仕組みをそのまま宇宙へ接続する。

KECAK LOOP:

```
pattern length
      ↓
orbit revolution
      ↓
voice
```

COSMIC MODE:

```
real orbital period
      ↓
time compression
      ↓
orbit revolution
      ↓
event / voice
```

人間モードの「pattern ring」が、宇宙モードでは本物の軌道の意味を持つ。

UIの基本文法を変えずに、

**リズムの円 → 軌道の円**

へ移行できる構造にする。

---

## 12. 重要な非目標

M0の8パートを「唯一の正しいケチャ」として扱わない。

実際には:

- 数十〜百人規模の chorus
- 同じ part を複数人が担当
- cak nem / cak pitu / cak lesung / ocel / panyelah 等も存在
- 村・グループ・演目によって構成が異なる
- 新しい kotekan も作られる

したがって UI 上でも preset 名を、

**Traditional-inspired / Source-based Kecak 8**

程度の意味として扱い、「完全再現」とは表現しない。

---

## 13. M0での声部の解釈

画面上では各パートを代表する人物を1人表示する。

ただし内部概念としては、各 Performer は「1人の個人」ではなく **1つの声部グループ** として扱う。

M0では `groupSize = 1` とするが、将来は同じパートを複数人が担う状態を表現できるようにする。

M0の状態は `joined` と `muted` で表現し、`active` という曖昧な状態名は使わない。

これにより、人数差・音圧・わずかなタイミング差・複数テイクの声を後から追加しても、ケチャの集団性を壊さず拡張できる。

---

## 14. Sources

Primary references used for this model:

- Kendra Stepputat, *The Kecak and Cultural Tourism on Bali*, Chapter 1: “Kecak: The Music”, 2021/2022. Cambridge University Press / Boydell & Brewer.
- Kendra Stepputat, “Performing Kecak: A Balinese Dance Tradition Between Daily Routine and Creative Art”, *Yearbook for Traditional Music* 44 (2012), pp. 49–70.
- I Wayan Dibia, *Kecak: The Vocal Chant of Bali*, 2000.
- I Made Bandem, article on kotekan / three-part interlocking structure, as discussed in later musicological literature.

The M0 digitization is an application-oriented abstraction of published transcriptions, not a substitute for instruction from Balinese practitioners.
