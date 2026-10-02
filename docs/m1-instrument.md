# M1 — Instrument (楽器化)

Status: M1 implementation baseline

M0.1 は「8声部を重ねて聴く」体験だった。M1 はその仕組みを **触って作り替えられる楽器** にする。
時間モデル(globalBeat / 12 subticks / BeatCell)は変えない。

## 実装するもの

| 項目 | 内容 |
|---|---|
| パターン編集 | 声部ごとに拍(beat)単位でジェスチャーを選ぶ(休み / 単発 / 裏 / 2連 / 3連 / 長音 …)。選んだ拍は 12 subtick のグリッドで個別に ON / OFF できる |
| 周期の長さ | 1〜8 beats。増やした拍は休み、減らすと末尾を切る |
| 回転(phase) | `rotationBeats` を ◀ ▶ ボタンと、拡大 ring のドラッグで変える |
| Solo | solo が 1 つでもあれば、solo の声部だけが鳴る(cue も同様) |
| 参加・離脱 | 暗い席を直接タップして参加(順不同)。参加済みは Leave で離脱できる。`JOIN NEXT VOICE` は従来どおり順に参加させる |
| 声部の追加・削除 | `+ ADD VOICE` で自作の声部を追加(最大 12)。自作の声部だけ削除できる。席と軌道は声部数に合わせて並び直す |
| ensemble 編集 | 人数(1〜8)、timing spread(0〜40 ms)、gain spread(0〜30%) |
| round-robin | 短音 3 take、長音 2 take(M0.1 から) |
| dynamics cue | `SOFT` で全体の音量を落とす。拍の境界で切り替わる |
| transition cue | `BREAK`: pung だけを残して 1 拍止め、全員のキメで戻る(M0.1 の `CUE` に加える第 2 の cue) |
| プリセット保存 | ブラウザに名前付きで保存・読み込み・削除 |
| 共有 | 編成を 1 本のテキスト(share code)にして、コピー・貼り付けで受け渡す。`#` 付きの URL でも読み込める |

## 反映のタイミング

再生中の編集(パターン、回転、周期、Solo、Mute、参加・離脱、声部の追加・削除、dynamics、ensemble)は、
M0.1 の JOIN / MUTE と同じく **次の global beat の境界** で反映する。停止中は即時。
Volume だけは即時(次の発声から)。globalBeat は止めない・リセットしない。

## Share code

`k1.` + base64url(JSON)。パターンは `[offsetSubtick, durationSubticks, sampleId, accent]` の配列。
読み込み時に全項目を検証し(型・範囲・個数)、不正なら拒否する。範囲: 声部 1〜12、周期 1〜8 beats、
1 beat 内の event 12 個まで、ensemble 人数 1〜8。

## 未実装(出典が必要なため)

Cak Nem / Cak Pitu / Cak Ocel / Cak Lesung / Panyelah / Juru Gending は、採譜の出典を確認してから追加する。
推測で作った形を「ケチャの正しいパターン」として載せない。M1 の編集機能で、ユーザーが自作の声部として作ることはできる。
