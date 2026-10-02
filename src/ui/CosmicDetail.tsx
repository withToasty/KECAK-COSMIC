import type { CosmicBody } from '../cosmos/bodies'
import { formatDuration, pitchHz } from '../cosmos/compress'
import type { CosmicVoice } from '../cosmos/cosmicCore'
import { engine } from './useEngine'

const TYPE_LABEL = { planet: '惑星', moon: '衛星(月)', satellite: '人工衛星' } as const

export function CosmicDetail({
  body,
  voice,
  periodBeats,
  tempoBpm,
  allSeconds,
  onClose,
}: {
  body: CosmicBody
  voice: CosmicVoice
  periodBeats: number
  tempoBpm: number
  allSeconds: number[]
  onClose: () => void
}) {
  const hz = pitchHz(body.realPeriodSeconds, allSeconds)
  return (
    <section className="detail" aria-label={`${body.name} detail`}>
      <header>
        <h2>
          {body.nameJa} <span className="en">{body.name}</span>
        </h2>
        <button className="ghost" onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </header>

      <p className="why">
        軌道が12時の位置を通るたびに、1回鳴ります。1周が実際の{' '}
        <b>{formatDuration(body.realPeriodSeconds)}</b> で、ここでは <b>{periodBeats.toFixed(2)} 拍</b>
        (いまのテンポで {formatDuration((periodBeats * 60) / tempoBpm)})です。
      </p>

      <dl>
        <dt>種類</dt>
        <dd>{TYPE_LABEL[body.sourceType]}</dd>
        <dt>実際の周期</dt>
        <dd>
          {formatDuration(body.realPeriodSeconds)}
          {body.precision === 'approx' && <span className="unit"> (目安。実際は少し変わります)</span>}
        </dd>
        <dt>音の高さ</dt>
        <dd>{hz.toFixed(0)} Hz(周期が短いほど高い)</dd>
      </dl>
      <p className="desc">{body.note}</p>

      <label className="row" htmlFor={`cvol-${body.id}`}>
        <span>
          Volume <b>{Math.round(voice.volume * 100)}%</b>
        </span>
        <input
          id={`cvol-${body.id}`}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={voice.volume}
          onChange={(e) => engine.cosmic.setVolume(body.id, Number(e.target.value))}
        />
      </label>
      <div className="buttons">
        <button
          className={voice.muted ? 'toggle on' : 'toggle'}
          aria-pressed={voice.muted}
          onClick={() => engine.cosmic.setMuted(body.id, !voice.muted)}
        >
          {voice.muted ? 'Muted' : 'Mute'}
        </button>
        <button
          className="ghost"
          onClick={() => {
            engine.cosmic.leave(body.id)
            onClose()
          }}
        >
          Leave
        </button>
      </div>
    </section>
  )
}
