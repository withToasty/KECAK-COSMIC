// One performer's rhythm orbit: beat sectors, intra-beat event marks
// (point = short, arc = sustained) and the moving marker. Used both in the
// shared-center view and, enlarged, in the detail panel.

import type { Performer } from '../domain/rhythm'
import { arcPath, cycleAngle, eventMarks, pointOnCircle } from './geometry'

type Props = {
  performer: Performer
  cx: number
  cy: number
  r: number
  /** Visual scale: point radius, tick length, marker radius. */
  point: number
  tick: number
  markerR: number
  muted?: boolean
}

export function OrbitRing({ performer: p, cx, cy, r, point, tick, markerR, muted }: Props) {
  const cycle = p.pattern.beats.length
  const marks = eventMarks(p)
  return (
    <g style={muted ? { opacity: 0.35 } : undefined}>
      {/* beat sector boundaries */}
      {Array.from({ length: cycle }, (_, b) => {
        const a = cycleAngle(b, cycle)
        const o = pointOnCircle(cx, cy, r + tick, a)
        const i = pointOnCircle(cx, cy, r - tick, a)
        return (
          <line key={b} className="beat-tick" x1={i.x} y1={i.y} x2={o.x} y2={o.y} />
        )
      })}
      {marks.map((m) =>
        m.sustained ? (
          <path
            key={m.key}
            data-event={m.key}
            className="event long"
            d={arcPath(cx, cy, r, m.startAngle, m.sweep)}
            style={{ strokeWidth: point * 1.5 }}
          />
        ) : (
          (() => {
            const pt = pointOnCircle(cx, cy, r, m.startAngle)
            return (
              <circle
                key={m.key}
                data-event={m.key}
                className="event short"
                cx={pt.x}
                cy={pt.y}
                r={point}
              />
            )
          })()
        ),
      )}
      <circle
        data-marker={p.id}
        data-len={cycle}
        data-r={r}
        data-cx={cx}
        data-cy={cy}
        className="marker"
        cx={cx}
        cy={cy - r}
        r={markerR}
      />
    </g>
  )
}
