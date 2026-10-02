# Cue Model — 合図とキメ

Status: M0.1 (pulled forward from M1 "dynamics cue / transition cue")

8声部は 1 / 2 / 4 beat で完全に繰り返す。曲としての展開(合図 → 全員が受ける → 刻みへ戻る)を、
**globalBeat を止めずに** その上へ重ねる。時間単位は [beat-gesture-model.md](./beat-gesture-model.md) に従う(1 beat = 12 subticks)。

## 操作

- `CUE` ボタン(再生中のみ有効)を押すと cue が **armed** になる。
- 次の global beat の境界で cue が始まる。待ち時間は最大 1 beat。押した瞬間には鳴らない。
- armed 中にもう一度押すと取り消せる。cue 実行中の押下は無視する。
- STOP / RESET で cue は破棄される。

## 構造(4 beats、開始 beat から数える)

| rel beat | phase | 内容 |
|---:|---|---|
| 0–1 | call | Juru Klempung(beat keeper)だけが掛け声をかける。他声部は沈黙する。pung だけだと小さいスピーカーで聞こえないため、長音の cak(チャーー)を重ねる |
| 2–3 | response | joined かつ unmuted の**全声部**が、自分の sample(pung / cak-short)で同じ subtick に一斉に打つ(キメ)。**裏拍(subtick 6)から入る** |
| 4〜 | 通常 | 通常の pattern 評価へ戻る。response 最後の発声が次の拍頭への pickup になる |

```
call     beat0: cak-long @0 + pung @0, @6    beat1: pung @0, cak-short @6
response beat2: @6             beat3: @0, @6, @9     (全声部・offsetSubtick)
```

- フレーズは `src/data/cuePhrase.ts` に集約する。後から差し替えられる。
- globalBeat はリセットしない。cue 中も marker は動き続ける。
- cue 中の声部は ensemble(複数メンバー)として通常どおり鳴る。
- muted の声部は cue 中も無音。unjoined の声部は参加しない。
- 同一 subtick の発声は、通常時と同じく同一 audio time に schedule する(ensemble の微小差の前)。

## Session

```ts
type CuePhase = 'idle' | 'armed' | 'call' | 'response'
// Session.cue: CuePhase
```

## 未決(M1 以降)

- 掛け声のバリエーション、複数の cue フレーズ
- cue での cak-long(長音)の使用
- テンポ・音量の cue(dynamics)
- 自動で展開が進む「曲」モード

## Cue の種類(M1)

| cue | call(2 beats) | response(2 beats) |
|---|---|---|
| `CUE` | Juru Klempung が長音の cak + pung で掛け声 | 全声部が裏拍から一斉に答える |
| `BREAK` | 小さな pung 1 発のあと 1 beat 完全な無音(transition) | 同じ一斉の答え |

- armed 中に別の cue を押すとそちらに切り替わり、同じ cue をもう一度押すと取り消せる。
- Solo の声部だけが鳴っている間は、cue の call / response も Solo の声部だけが担当する。
- `SOFT`(dynamics)は全体の音量を固定の比率(0.45)に落とす。拍の境界で切り替わる。
