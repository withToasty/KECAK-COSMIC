import { useEffect, useRef, useState } from 'react'
import { KECAK_PRESETS } from '../data/kecakPresets'
import {
  SUBTICKS_PER_BEAT,
  type BeatCell,
  type Performer,
  type VoicePattern,
} from '../domain/rhythm'
import { MAX_BEATS, MAX_ENSEMBLE } from '../engine/types'
import { engine } from './useEngine'
import { cycleAngle, pointOnCircle } from './geometry'
import { GESTURES, matchGesture, toggleEvent } from './gestures'
import { OrbitRing } from './OrbitRing'

const ROLE_LABEL: Record<Performer['role'], string> = {
  'beat-keeper': 'beat keeper',
  polos: 'polos (on-beat)',
  sangsih: 'sangsih (off-beat)',
  sanglot: 'sanglot (in-between)',
  custom: 'custom voice',
}

type RingProps = {
  p: Performer
  selectedBeat: number
  onSelectBeat: (beat: number) => void
}

/**
 * Enlarged ring. Drag around the center to rotate the pattern one beat at a
 * time; tap a beat sector to select it for editing.
 */
function BigRing({ p, selectedBeat, onSelectBeat }: RingProps) {
  const size = 200
  const c = size / 2
  const r = 78
  const cycle = p.pattern.beats.length
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ last: number; acc: number } | null>(null)

  const angleOf = (e: React.PointerEvent) => {
    const box = svgRef.current!.getBoundingClientRect()
    const x = e.clientX - (box.left + box.width / 2)
    const y = e.clientY - (box.top + box.height / 2)
    return Math.atan2(x, -y) // 0 at 12 o'clock, clockwise positive
  }

  const sector = 2 * Math.PI
  const arcStart = pointOnCircle(c, c, r + 9, cycleAngle(selectedBeat, cycle))
  const arcEnd = pointOnCircle(c, c, r + 9, cycleAngle(selectedBeat + 1, cycle))

  return (
    <svg
      ref={svgRef}
      className="big-ring"
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Pattern ring. Drag to rotate."
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { last: angleOf(e), acc: 0 }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const a = angleOf(e)
        let delta = a - d.last
        if (delta > Math.PI) delta -= sector
        if (delta < -Math.PI) delta += sector
        d.last = a
        d.acc += delta
        const step = sector / cycle
        while (d.acc >= step) {
          // Clockwise drag moves the pattern later: rotation counts down.
          engine.core.setRotation(p.id, p.rotationBeats - 1)
          d.acc -= step
        }
        while (d.acc <= -step) {
          engine.core.setRotation(p.id, p.rotationBeats + 1)
          d.acc += step
        }
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <circle className="orbit-line big" cx={c} cy={c} r={r} data-orbit={p.id} />
      <path
        className="sel-arc"
        d={`M ${arcStart.x} ${arcStart.y} A ${r + 9} ${r + 9} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
      />
      {Array.from({ length: cycle }, (_, b) => {
        const pt = pointOnCircle(c, c, r + 18, cycleAngle(b + 0.5, cycle))
        return (
          <text
            key={b}
            className={b === selectedBeat ? 'node-index sel' : 'node-index'}
            x={pt.x}
            y={pt.y}
            dy="0.35em"
            onClick={() => onSelectBeat(b)}
          >
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
            .map((e) => (e.sampleId === 'cak-long' ? `${e.offsetSubtick}~` : String(e.offsetSubtick)))
            .join(','),
    )
    .join(' | ')
}

function Slider(props: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="row" htmlFor={props.id}>
      <span>
        {props.label} <b>{props.format ? props.format(props.value) : props.value}</b>
      </span>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
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

  // Local copy of the pattern: edits made while playing are queued until the
  // next beat, so quick successive taps must build on each other, not on the
  // stale engine state.
  const [beats, setBeats] = useState<readonly BeatCell[]>(p.pattern.beats)
  const [sel, setSel] = useState(0)
  useEffect(() => setBeats(p.pattern.beats), [p.pattern])
  const cycle = beats.length
  const selected = Math.min(sel, cycle - 1)
  const cell = beats[selected] ?? []
  const sustained = cell.some((e) => e.sampleId === 'cak-long')

  const commit = (next: readonly BeatCell[]) => {
    setBeats(next)
    const pattern: VoicePattern = { beats: next }
    engine.core.setPattern(p.id, pattern)
  }
  const setCell = (next: BeatCell) =>
    commit(beats.map((c, i) => (i === selected ? next : c)))
  const active = matchGesture(p, cell)

  return (
    <section className="detail" aria-label={`${p.name} detail`}>
      <header>
        <h2>{p.name}</h2>
        <button className="ghost" onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </header>

      <div className="detail-body">
        <BigRing p={{ ...p, pattern: { beats } }} selectedBeat={selected} onSelectBeat={setSel} />
        <div className="detail-info">
          <dl>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[p.role]}</dd>
            <dt>Cycle</dt>
            <dd>{cycle} {cycle === 1 ? 'beat' : 'beats'}</dd>
            <dt>Events</dt>
            <dd>
              <code>{patternSummary(p)}</code>
              <span className="unit"> (per beat, /{SUBTICKS_PER_BEAT})</span>
            </dd>
          </dl>
          {preset && <p className="desc">{preset.description}</p>}
          <div className="stepper">
            <span>Rotate</span>
            <button
              aria-label="Rotate pattern one beat earlier"
              onClick={() => engine.core.setRotation(p.id, p.rotationBeats + 1)}
            >
              ◀
            </button>
            <b>{p.rotationBeats}</b>
            <button
              aria-label="Rotate pattern one beat later"
              onClick={() => engine.core.setRotation(p.id, p.rotationBeats - 1)}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="editor">
        <div className="stepper">
          <span>Beat</span>
          {Array.from({ length: cycle }, (_, b) => (
            <button
              key={b}
              className={b === selected ? 'chip on' : 'chip'}
              aria-pressed={b === selected}
              onClick={() => setSel(b)}
            >
              {b + 1}
            </button>
          ))}
          <button
            className="chip"
            aria-label="Remove last beat"
            disabled={cycle <= 1}
            onClick={() => commit(beats.slice(0, -1))}
          >
            −
          </button>
          <button
            className="chip"
            aria-label="Add a beat"
            disabled={cycle >= MAX_BEATS}
            onClick={() => commit([...beats, []])}
          >
            ＋
          </button>
        </div>

        <div className="gestures" role="group" aria-label={`Gesture for beat ${selected + 1}`}>
          {GESTURES.map((g) => {
            const off = g.cakOnly && p.role === 'beat-keeper'
            return (
              <button
                key={g.id}
                className={active === g.id ? 'chip on' : 'chip'}
                aria-pressed={active === g.id}
                disabled={off}
                title={g.hint}
                onClick={() => setCell(g.build(p))}
              >
                {g.label}
              </button>
            )
          })}
        </div>

        <div className="grid12" role="group" aria-label={`Subticks of beat ${selected + 1}`}>
          {Array.from({ length: SUBTICKS_PER_BEAT }, (_, i) => {
            const on = cell.some((e) => e.offsetSubtick === i)
            return (
              <button
                key={i}
                className={[on ? 'cellbtn on' : 'cellbtn', i % 3 === 0 ? 'q' : ''].join(' ')}
                aria-pressed={on}
                aria-label={`subtick ${i}`}
                disabled={sustained}
                onClick={() => setCell(toggleEvent(p, cell, i))}
              />
            )
          })}
        </div>
        <p className="desc">
          {sustained
            ? '長音の拍です。ほかのジェスチャーを選ぶと、12マスで細かく置けます'
            : '12マス = 1拍。1・4・7・10マス目が 4分割の位置、半分(7マス目)が裏拍'}
        </p>
      </div>

      <div className="mixer">
        <Slider
          id={`vol-${p.id}`}
          label="Volume"
          value={p.volume}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => engine.setVolume(p.id, v)}
        />
        <div className="buttons">
          <button
            className={p.muted ? 'toggle on' : 'toggle'}
            aria-pressed={p.muted}
            onClick={() => engine.core.setMuted(p.id, !p.muted)}
          >
            {p.muted ? 'Muted' : 'Mute'}
          </button>
          <button
            className={p.solo ? 'toggle on solo' : 'toggle'}
            aria-pressed={!!p.solo}
            onClick={() => engine.core.setSolo(p.id, !p.solo)}
          >
            Solo
          </button>
          <button
            className="ghost"
            onClick={() => {
              engine.core.leave(p.id)
              onClose()
            }}
          >
            Leave
          </button>
          {p.custom && (
            <button
              className="ghost danger"
              onClick={() => {
                engine.core.removeVoice(p.id)
                onClose()
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <details className="ensemble">
        <summary>
          Voice group · {p.ensemble.size} {p.ensemble.size === 1 ? 'voice' : 'voices'}
        </summary>
        <Slider
          id={`size-${p.id}`}
          label="Members"
          value={p.ensemble.size}
          min={1}
          max={MAX_ENSEMBLE}
          step={1}
          onChange={(v) => engine.core.setEnsemble(p.id, { ...p.ensemble, size: v })}
        />
        <Slider
          id={`spread-${p.id}`}
          label="Timing spread"
          value={p.ensemble.timingSpreadMs}
          min={0}
          max={40}
          step={1}
          format={(v) => `${v} ms`}
          onChange={(v) => engine.core.setEnsemble(p.id, { ...p.ensemble, timingSpreadMs: v })}
        />
        <Slider
          id={`gain-${p.id}`}
          label="Level spread"
          value={Math.round(p.ensemble.gainSpread * 100)}
          min={0}
          max={30}
          step={1}
          format={(v) => `${v}%`}
          onChange={(v) => engine.core.setEnsemble(p.id, { ...p.ensemble, gainSpread: v / 100 })}
        />
      </details>
    </section>
  )
}
