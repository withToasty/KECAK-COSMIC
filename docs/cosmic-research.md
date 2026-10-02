# COSMIC MODE — 発展の調査メモ

Status: research notes (not a specification). 調べた日の検索結果に基づく。実装前にもう一度確認する。

## 1. 実時間の天体の位置

| 対象 | 方法 | 分かったこと | 未確認 |
|---|---|---|---|
| 太陽・月・惑星 | Astronomy Engine(JS / npm) | VSOP87 と NOVAS に基づき、**±1 分角**の精度で位置を計算する。ライセンスは MIT。minify 後 約 96 KB。ネットワーク不要で、ブラウザでも Node でも動く | 実際にバンドルして計測していない |
| 人工衛星(ISS など) | satellite.js(SGP4)+ TLE | TLE から位置と速度を計算できる。TLE は CelesTrak などが公開し、ログイン不要 | TLE は**数日〜数週間で精度が落ちる**ので、静的な同梱ではなく取得が要る。取得にネットワークが必要で、アーティファクトの枠内(外部への fetch が不可)では使えない可能性が高い |

- 惑星・月は、オフラインのライブラリで「今日の配置」を作れる。外部 API は要らない。
- 人工衛星は、データの取得が壁になる。アーティファクトでは難しく、通常のホスティング(自分のサイト)なら可能。
- 「今の配置から始める」と、全員そろって始まる現在の仕様(聴くための決め事)を、**実際の配置**に置き換えられる。

## 2. 軌道の形

NASA の惑星ファクトシートの値(検索結果の抜粋): 水星 離心率 0.206・傾斜 7.0°、火星 0.094・1.8°、海王星 0.010・1.8°。
ほかの惑星も同じ表にある。月と衛星は別の表になる。

- 円ではなく楕円にすると、**ケプラーの第2法則**で角速度が一定でなくなる(近日点で速く、遠日点で遅い)。音の間隔も一定でなくなる。
- 水星(離心率 0.206)は違いが大きく、金星・地球・海王星はほぼ円(0.01 以下)。聴いて分かるのは水星と火星くらい。
- 現在の「1 周に 1 回」を保ったまま、**周期は同じで間隔だけが歪む**形にできる。1 周の長さは変えない。

## 3. 周期以外のデータの音への変換(候補)

| データ | 候補の対応 | 注意 |
|---|---|---|
| 太陽からの距離 | 音の明るさ(フィルター)、定位、残響の量 | 距離の幅が広い(水星 0.39 AU から海王星 30 AU)ので、対数にする |
| 質量・大きさ | 音量や音色の厚み | 木星と地球で大きく違う。見た目の大きさとの関係を決める |
| 見かけの明るさ | 強さ(velocity) | 時刻と観測地点で変わる |
| 軌道速度 | 音の長さ、アタック | 周期と半径から出るので、情報としては重複する |

- 「データを装飾しない」(concept.md の原則)に合わせ、**どの量をどの音の性質に対応させたかを画面に書く**のが前提。
- 1 つのデータにつき 1 つの音の性質だけを使う(混ぜない)。

## 4. 今回見つかった訂正

初版の天王星 30688.5 日・海王星 60182 日は記憶による値で、NASA の表の値(30685.4 日・60189.018 日)と数日ずれていた。訂正済み。
資料によって数日(約 0.01%)違うので、どの資料の値かを `docs/cosmic-model.md` に記録する。

## 5. 進めるなら(提案の順)

1. 惑星の「今日の配置」から始める(Astronomy Engine、オフライン)。**実装済み**(`docs/cosmic-model.md`)。
2. 軌道の形(楕円)の描画と、間隔が歪む時間の進め方。
3. 距離や質量の 1 つ目の対応(距離 → 音の明るさ、など)。
4. 人工衛星の実時間の位置(通常のホスティングとデータ取得の仕組みが前提)。

## Sources

- [Astronomy Engine (npm)](https://npmjs.com/package/astronomy-engine)
- [Astronomy Engine (README)](https://cdn.jsdelivr.net/wp/plugins/the-moon/trunk/includes/vendor/astronomy-master/README.md)
- [satellite.js (SGP4 / TLE)](https://openapps.pro/packages/satellite-js)
- [Predicting the ISS From a TLE](https://issinfo.net/blog/predicting-iss-position-from-tle)
- [NASA Uranus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html) / [Neptune Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html)
- [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/index.html)
