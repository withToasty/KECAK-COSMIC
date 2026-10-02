import { KECAK_PRESETS } from '../data/kecakPresets'
import { SUBTICKS_PER_BEAT, type Performer } from '../domain/rhythm'
import { engine } from './useEngine'
import { cycleAngle, pointOnCircle } from './geometry'
import { OrbitRing } from './OrbitRing'

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
  const cycle = p.pattern.beats.length
  return (
    <svg className="big-ring" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="orbit-line big" cx={c} cy={c} r={r} data-orbit={p.id} />
      {Array.from({ length: cycle }, (_, b) => {
        const pt = pointOnCircle(c, c, r + 16, cycleAngle(b + 0.5, cycle))
        return (
          <text key={b} className="node-index" x={pt.x} y={pt.y} dy="0.35em">
            {b + 1}
          </text>
        )
      })}
      <OrbitRing performer={p} cx={c} cy={c} r={r} point={5} tick={5} markerR={7} />
      <text className="ring-center" x={c} y={c} dy="0.35em">
        {cycle} {cycle === 1 ? 'beat' : 'beats'}
      </text>
    </svg>
  )
}

/** Compact text view: one cell per beat, event offsets in 12ths of a beat. */
function patternSummary(p: Performer): string {
  return p.pattern.beats
    .map((cell) =>
      cell.length === 0
        ? '–'
        : cell
            .map((e) =>
              e.sampleId === 'cak-long' ? `${e.offsetSubtick}~` : String(e.offsetSubtick),
            )
            .join(','),
    )
    .join(' | ')
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
            <dt>Cycle</dt>
            <dd>{p.pattern.beats.length} beats</dd>
            <dt>Events</dt>
            <dd>
              <code>{patternSummary(p)}</code>
              <span className="unit"> (per beat, /{SUBTICKS_PER_BEAT})</span>
            </dd>
            <dt>Voice group</dt>
            <dd>{p.ensemble.size} {p.ensemble.size === 1 ? 'voice' : 'voices'}</dd>
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
