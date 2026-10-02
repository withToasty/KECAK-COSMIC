import { KECAK_PRESETS } from '../data/kecakPresets'
import type { Performer } from '../engine/types'
import { engine } from './useEngine'
import { nodeAngle, pointOnCircle } from './geometry'

const ROLE_LABEL: Record<Performer['role'], string> = {
  'beat-keeper': 'beat keeper',
  polos: 'polos (on-beat)',
  sangsih: 'sangsih (off-beat)',
  sanglot: 'sanglot (in-between)',
}

function BigRing({ p }: { p: Performer }) {
  const size = 200
  const c = size / 2
  const r = 78
  const len = p.pattern.length
  return (
    <svg className="big-ring" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="orbit-line big" cx={c} cy={c} r={r} data-orbit={p.id} />
      {p.pattern.map((hit, i) => {
        const pt = pointOnCircle(c, c, r, nodeAngle(i, len))
        return (
          <g key={i}>
            <circle
              data-node={`${p.id}:${i}`}
              className={hit.on ? 'node hit' : 'node rest'}
              cx={pt.x}
              cy={pt.y}
              r={hit.on ? 6 : 3.6}
            />
            <text className="node-index" x={pt.x} y={pt.y} dy={pt.y < c ? -11 : 17}>
              {i}
            </text>
          </g>
        )
      })}
      <circle
        data-marker={p.id}
        data-len={len}
        data-r={r}
        data-cx={c}
        data-cy={c}
        className="marker"
        cx={c}
        cy={c - r}
        r={8}
      />
      <text className="ring-center" x={c} y={c} dy="0.35em">
        {len} pulses
      </text>
    </svg>
  )
}

export function DetailPanel({
  performer: p,
  onClose,
}: {
  performer: Performer
  onClose: () => void
}) {
  const preset = KECAK_PRESETS.find((x) => x.id === p.id)
  return (
    <section className="detail" aria-label={`${p.name} detail`}>
      <header>
        <h2>{p.name}</h2>
        <button className="ghost" onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </header>
      <div className="detail-body">
        <BigRing p={p} />
        <div className="detail-info">
          <dl>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[p.role]}</dd>
            <dt>Pattern</dt>
            <dd>
              {p.pattern.length} pulses · <code>{p.pattern.map((h) => (h.on ? '1' : '0')).join('')}</code>
            </dd>
            <dt>Voice</dt>
            <dd>{p.voice}</dd>
          </dl>
          {preset && <p className="desc">{preset.description}</p>}
          <label className="row">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={p.volume}
              onChange={(e) => engine.setVolume(p.id, Number(e.target.value))}
            />
          </label>
          <button
            className={p.muted ? 'toggle on' : 'toggle'}
            aria-pressed={p.muted}
            onClick={() => engine.core.setMuted(p.id, !p.muted)}
          >
            {p.muted ? 'Muted' : 'Mute'}
          </button>
        </div>
      </div>
    </section>
  )
}
