# Cue Model — 合図とキメ

Status: M0.5 (pulled forward from M1 "dynamics cue / transition cue")

M0 の8声部は 16 pulse で完全に繰り返す。曲としての展開(合図 → 全員が受ける → 刻みへ戻る)を、
**global pulse を止めずに** その上へ重ねる。

## 操作

- `CUE` ボタン(再生中のみ有効)を押すと cue が **armed** になる。
- 次の klempung beat の境界(`globalPulse % 4 === 0`)で cue が始まる。待ち時間は最大 1 拍。押した瞬間には鳴らない。
- armed 中にもう一度押すと取り消せる。cue 実行中の押下は無視する。
- STOP / RESET で cue は破棄される。

## 構造(16 pulse = 1 cue cycle、開始位置から数える)

| rel pulse | phase | 内容 |
|---:|---|---|
| 0–7 | call | Juru Klempung(beat keeper)だけが掛け声を打つ。他声部は沈黙する |
| 8–15 | response | joined かつ unmuted の**全声部**が、自分の voice で同じ pulse に一斉に打つ(キメ)。**裏拍(拍の中間、rel 10)から入る** |
| 16〜 | 通常 | 通常の pattern 評価へ戻る。response の最後の 2 発が拍頭への pickup になる |

```
call      (JK) 10101000
response (all) 00101011   # 裏から入り、最後の 6,7 が次の拍頭への助走
```

- 数値は `src/data/cuePhrase.ts` に集約する。後から差し替えられる。
- globalPulse はリセットしない。cue 中も marker は動き続ける。
- muted の声部は cue 中も無音。unjoined の声部は参加しない。
- 同一 pulse の発声は、通常時と同じく同一 audio time に schedule する。

## Session

```ts
type CuePhase = 'idle' | 'armed' | 'call' | 'response'
// Session.cue: CuePhase
```

## 未決(M1 以降)

- 掛け声のバリエーション、複数の cue フレーズ
- テンポ・音量の cue(dynamics)
- 自動で展開が進む「曲」モード
