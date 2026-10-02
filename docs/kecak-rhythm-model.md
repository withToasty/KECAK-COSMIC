# KECAK-COSMIC — Kecak Rhythm Model

Status: Source-grounded rhythm-source model  
Purpose: KECAK LOOP の最初の8パートの音楽素材を定義する。実装時間モデルは [beat-gesture-model.md](./beat-gesture-model.md) を正とする。

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

M0.1では、音楽上の大きな単位を `globalBeat` とし、1beat内部を12 subticksで表現する。

```
beat subtick:
0 1 2 3 4 5 6 7 8 9 10 11
```

この文書に残っている旧4マス表記:

```
q0 q1 q2 q3
```

は、資料整理・migration用の簡略表記として扱い、実装では次へ写像する。

```
q0 -> subtick 0
q1 -> subtick 3
q2 -> subtick 6
q3 -> subtick 9
```

したがって、旧 `0010` は:

```
offsetSubtick = 6
```

の短い発声eventとして表現できる。

さらにM0.1では、同じ1beat内に複数eventを置けるため:

- 1拍伸ばす cak
- double cak
- triple cak
- offset double

などを0/1列ではなくBeatCellとして直接記述する。

詳細は [Beat Gesture Model](./beat-gesture-model.md)。
---

## 3. 円のルール

各声部は、自分専用の円形シーケンサーを持つ。ただし **すべての軌道は同じ中心を共有する同心円** とする。

M0.1では:

```
1 large sector = 1 beat
sector内のmark = vocal event
```

とする。

- short event = point
- long event = arc
- double / triple = 同じsector内に複数point
- current marker = beat内部を連続移動

つまり:

```
global beat
      ↓
orbit beat sector
      ↓
intra-beat VocalEvent
      ↓
voice / sample
```

円は装飾ではなく、周期とbeat内部の発声配置を可視化する。
---

## 4. M0の最初の8パート

最初の8パートは以下とする。

| Entry | Part | Role | Voice | Cycle length |
|---:|---|---|---|---:|
| 1 | Juru Klempung | beat keeper | pung | 1 beat |
| 2 | Cak Besik — Polos | on-beat | cak | 1 beat |
| 3 | Cak Besik — Sangsih | off-beat | cak | 1 beat |
| 4 | Cak Telu — Polos | 3-part interlock | cak | 2 beats |
| 5 | Cak Telu — Sanglot | in-between | cak | 2 beats |
| 6 | Cak Telu — Sangsih | off-beat | cak | 2 beats |
| 7 | Cak Lima — Polos | 2-part interlock | cak | 4 beats |
| 8 | Cak Lima — Sangsih | complementary part | cak | 4 beats |

この8つで、

- pulse の基準
- 2声の interlock
- 3声の interlock
- さらに長い別周期

を段階的に体験できる。

---

## 5. パターン定義

以下の0/1列は **legacy transcription notation** として残す。

- `1` = その旧quarter-grid位置に短い発声
- `0` = 休符

実装時には4桁ごとに1beatへまとめ、q0/q1/q2/q3をsubtick 0/3/6/9へ変換する。
新しい sustained / double / triple gesture はこの0/1表記へ戻さず、BeatCellで直接定義する。

### 5.1 Juru Klempung

beat keeper。

実際のケチャでは `pung` を規則的に発声してテンポを保持する役割。

```
1000
```

1 beatごとに:

```
PUNG . . .
```

を繰り返す。

---

### 5.2 Cak Besik — Polos

1 beat の on-beat。

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

cak telu のlegacy notationは2 beats = 8 quarter-grid positionsを1周期として扱う。

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

4 beats = 16 legacy quarter-grid positions。

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

`1*` のみ joined。

ユーザーが `JOIN NEXT VOICE` を押すか、次の暗い人物をクリックすると次のパートが参加する。

参加時:

- 人物が明るくなる
- その人物の orbit が現れる
- beat sectors と vocal-event marks が表示される
- 次の global beat boundary から演奏へ加わる

途中参加で global beat 自体はリセットしない。

---

## 8. 円の見え方

各声部のorbitは patternのbeat数で区切る。

- 1 beat cycle → 1 sector
- 2 beat cycle → 2 sectors
- 4 beat cycle → 4 sectors

sector内部にはBeatCellのVocalEventを配置する。

```
• = short event
━ = sustained event
◎ = current position
```

double / tripleは同じsector内に複数の • を置く。

current markerがevent位置を通過した瞬間に発声し、人物もpulse animationする。
---

## 9. データモデル

実装データモデルは [beat-gesture-model.md](./beat-gesture-model.md) と [specification.md](./specification.md) を正とする。

中心型:

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

周期位置:

```ts
const beatIndex =
  (globalBeat + performer.rotationBeats) %
  performer.pattern.beats.length
```

発声eventは、そのBeatCell内の全VocalEventをAudioContext timeへscheduleする。

旧 `Hit.on` / `globalPulse` はmigration sourceとしてのみ扱い、新規engine APIでは使用しない。
---

## 10. Phase の扱い

M0では数値入力の `Phase` は廃止する。

将来、ユーザーが pattern ring を回転させることで位相を変更する。

内部的には:

```ts
beatIndex =
  (globalBeat + rotationBeats) %
  pattern.beats.length
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

M0.1では `EnsembleProfile` を持ち、試聴時には同じパートを複数人へ展開できるようにする。決定論テスト時だけ size=1 / spread=0 とする。

M0.1のPerformer状態は `joined` と `muted` で表現する。発声内容は `BeatCell / VocalEvent` とし、Performer状態と発声eventの概念を分離する。

これにより、人数差・音圧・わずかなタイミング差・複数テイクの声を後から追加しても、ケチャの集団性を壊さず拡張できる。

---

## 14. Sources

Primary references used for this model:

- Kendra Stepputat, *The Kecak and Cultural Tourism on Bali*, Chapter 1: “Kecak: The Music”, 2021/2022. Cambridge University Press / Boydell & Brewer.
- Kendra Stepputat, “Performing Kecak: A Balinese Dance Tradition Between Daily Routine and Creative Art”, *Yearbook for Traditional Music* 44 (2012), pp. 49–70.
- I Wayan Dibia, *Kecak: The Vocal Chant of Bali*, 2000.
- I Made Bandem, article on kotekan / three-part interlocking structure, as discussed in later musicological literature.

The M0 digitization is an application-oriented abstraction of published transcriptions, not a substitute for instruction from Balinese practitioners.
