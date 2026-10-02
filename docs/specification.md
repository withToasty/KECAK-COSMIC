# KECAK-COSMIC — Specification

Version: v0.1  
Status: Draft / Prototype specification

この文書は「何を実装するか」を定義する。  
思想・背景は [concept.md](./concept.md) を参照。

---

## 1. プロダクト概要

KECAK-COSMIC は、複数の周期を重ねて音楽を作る Web アプリ。

最初の実装では、円形に座る複数の演奏者を操作し、それぞれに異なる発声周期を与えることでポリリズムを作る。

その後、演奏者の周期を人間が決める値から、月・惑星・人工衛星など実在する宇宙の周期へ置き換える。

---

## 2. モード

### 2.1 KECAK LOOP

ユーザーが自由に周期を設定して演奏するモード。

各演奏者は以下を持つ。

- ON / OFF
- 発声音
- 周期
- 位相
- 音量

複数の演奏者を同時に動かし、周期の重なりを聴く。

### 2.2 COSMIC MODE

宇宙に存在する周期データを使うモード。

候補:

- 月の公転
- 地球の自転
- 惑星の公転
- ISS の周回
- 人工衛星の周回

元データを人間が聴ける時間へ圧縮し、KECAK LOOP と同じ音響エンジンへ入力する。

COSMIC MODE は M0 では実装しない。

---

## 3. M0 — 最初に完成させるもの

### 3.1 画面

1画面のみ。

中央に円形の演奏スペースを表示する。

その周囲に **8人の演奏者** を等間隔で配置する。

各演奏者は円の中心を向いて座っているように見せる。

初期段階では人物はシンプルな図形・アイコンでよい。

---

## 4. 基本操作

### 4.1 START / STOP

画面中央に再生ボタンを置く。

START:

- 全体クロック開始
- ON になっている演奏者が、それぞれの周期で発声する

STOP:

- 全体クロック停止
- 再生位置を先頭へ戻す

### 4.2 演奏者をクリック

演奏者をクリックすると設定パネルを開く。

設定項目:

- Active: ON / OFF
- Voice
- Cycle
- Phase
- Volume

---

## 5. Voice

M0 では以下の4種類を用意する。

- cak
- cek
- tak
- low

実際の人声サンプルが未準備の場合は、Web Audio API で短いパーカッシブ音を生成して代用してよい。

後から音声ファイルへ差し替え可能な構造にする。

---

## 6. Cycle

演奏者が何拍ごとに鳴るかを指定する。

M0 の選択肢:

- 1
- 2
- 3
- 4
- 5
- 7
- 8
- 11
- 13
- 16

例:

- Cycle = 2 → 2拍ごとに発声
- Cycle = 3 → 3拍ごとに発声
- Cycle = 5 → 5拍ごとに発声

異なる Cycle を同時に動かすことでポリリズムを作る。

---

## 7. Phase

周期の開始位置をずらす。

値:

- 0 〜 Cycle - 1

例:

Cycle = 4  
Phase = 0

なら、

1 / 5 / 9 / 13 ...

で鳴る。

Cycle = 4  
Phase = 2

なら、

3 / 7 / 11 / 15 ...

で鳴る。

---

## 8. Tempo

全体共通の BPM を持つ。

初期値:

120 BPM

設定可能範囲:

40 〜 240 BPM

M0 では全演奏者が同じ BPM を共有する。

---

## 9. 視覚フィードバック

演奏者が発声した瞬間、その演奏者を短時間だけ強調表示する。

例:

- 少し大きくなる
- 明るくなる
- 円が広がる

これにより、

**どの周期が今鳴ったか**

を目でも理解できるようにする。

複数人が同時に発声した場合は、同時に強調する。

---

## 10. 全体拍表示

中央に現在の Beat を表示する。

例:

```
BEAT
37
```

M0 では最低限、現在何拍目か分かればよい。

---

## 11. 初期プリセット

初回起動時に以下の状態をセットする。

| Player | Voice | Cycle | Phase | Active |
|---|---|---:|---:|---|
| 1 | cak | 2 | 0 | ON |
| 2 | cek | 3 | 0 | ON |
| 3 | tak | 5 | 0 | ON |
| 4 | low | 7 | 0 | ON |
| 5 | cak | 4 | 1 | OFF |
| 6 | cek | 8 | 3 | OFF |
| 7 | tak | 11 | 0 | OFF |
| 8 | low | 13 | 0 | OFF |

START を押すだけで、最初から周期の重なりを体験できる状態にする。

---

## 12. データモデル

各演奏者は以下のデータを持つ。

```ts
type Performer = {
  id: string
  name: string
  active: boolean
  voice: 'cak' | 'cek' | 'tak' | 'low'
  cycle: number
  phase: number
  volume: number
}
```

全体状態:

```ts
type Session = {
  bpm: number
  beat: number
  playing: boolean
  performers: Performer[]
}
```

---

## 13. 発音判定

各拍で、各演奏者について以下を判定する。

```ts
shouldPlay =
  performer.active &&
  (beat - performer.phase) % performer.cycle === 0
```

ただし、

```
beat >= phase
```

の場合のみ発音する。

UI 描画のフレームではなく、音声スケジューラ側の時間を基準にする。

---

## 14. 音響エンジン

ブラウザ上で完結させる。

M0:

- Web Audio API
- または Tone.js

を使用する。

重要要件:

- 複数周期を長時間動かしても、目立つタイミングずれを起こさない
- UI の `setInterval` を音声タイミングの基準にしない
- 音声スケジューラと UI 表示を分離する

---

## 15. UI構成

概念図:

```
             P1

       P8          P2

   P7                  P3


          START
        BPM 120
         BEAT 1


   P6                  P4

             P5
```

スマートフォンでは円全体が1画面に収まるようにする。

---

## 16. デザイン方針

M0 では装飾を作り込みすぎない。

優先順位:

1. 周期が重なる
2. 音が気持ちよく鳴る
3. 誰が鳴ったか分かる
4. 操作が直感的
5. 見た目

背景は暗色。

演奏者と軌道を感じさせる円形レイアウトにする。

「宇宙っぽい」星空エフェクトなどは M0 では必須にしない。

---

## 17. 技術構成

M0 推奨:

- Vite
- TypeScript
- React
- Tone.js
- CSS

バックエンドなし。

すべてブラウザ上で動作する静的 Web アプリとする。

---

## 18. ディレクトリ案

```
src/
├─ App.tsx
├─ components/
│  ├─ PerformerCircle.tsx
│  ├─ Performer.tsx
│  ├─ PerformerPanel.tsx
│  └─ Transport.tsx
├─ audio/
│  ├─ engine.ts
│  └─ voices.ts
├─ data/
│  └─ presets.ts
├─ types/
│  └─ session.ts
└─ styles/
   └─ main.css
```

---

## 19. M0 完了条件

以下がすべてできれば M0 完了。

- Web ページを開ける
- 円形に8人表示される
- START / STOP ができる
- BPM を変更できる
- 各演奏者を ON / OFF できる
- Voice を変更できる
- Cycle を変更できる
- Phase を変更できる
- 複数の周期が同時に安定して再生される
- 発声時に該当演奏者が視覚的に反応する
- スマートフォンでも操作できる

---

## 20. M1 — 演奏として面白くする

M0 完成後に追加する。

候補:

- 演奏者を追加 / 削除
- Solo
- Mute
- 全体 Volume
- ランダム生成
- プリセット保存
- URL 共有
- Cycle の直接入力
- 音声サンプル差し替え
- 発声パターンの複数化
- 位相を円上でドラッグして変更
- ループ全体の長さ表示
- 次に全員が重なるタイミングの表示

---

## 21. M2 — COSMIC MODE

KECAK LOOP が楽器として成立した後に実装する。

### M2-1

静的な天体周期データを用意する。

例:

```ts
type CosmicPerformer = {
  id: string
  name: string
  sourceType: 'planet' | 'moon' | 'satellite'
  realPeriodSeconds: number
  voice: Voice
}
```

### M2-2

時間圧縮率を設定する。

```
real period
    ↓
time compression
    ↓
musical cycle
```

### M2-3

円形 UI 上の人間を天体へ置き換える。

例:

- Moon
- Earth
- Mars
- Jupiter
- ISS

### M2-4

各音について、

- 元になった天体
- 元周期
- 圧縮率
- 音楽上の周期

を確認できるようにする。

---

## 22. M0 ではやらないこと

以下は意図的に後回しにする。

- ログイン
- データベース
- SNS
- 複数人リアルタイム演奏
- AI 作曲
- 3D
- VR
- 正確な軌道シミュレーション
- リアルタイム人工衛星追跡
- 天文学データ API 連携
- DAW 相当の編集機能

まず、

**異なる周期を重ねるだけで、本当に触っていて面白いか**

を確認する。

---

## 23. 開発順序

実装は以下の順で進める。

1. Vite + React + TypeScript を起動
2. 円形に8人配置
3. Tone.js で全体クロック作成
4. 1人を一定周期で鳴らす
5. 8人を別周期で鳴らす
6. START / STOP
7. Active / Cycle / Phase
8. 発声時アニメーション
9. Voice / Volume
10. BPM
11. モバイル調整
12. M0 完了

この順序では、デザインより先に **周期が実際に重なる音** を完成させる。
