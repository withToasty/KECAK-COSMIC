import { KECAK_PRESETS } from '../data/kecakPresets'
import type { Performer } from '../domain/rhythm'
import { OrbitRing } from './OrbitRing'
import {
  AVATAR_R,
  CENTER,
  ORBIT_STEP,
  SEAT_RADIUS,
  VIEW,
  orbitRadius,
  pointOnCircle,
  seatAngle,
} from './geometry'

const labelOf = (p: Performer) =>
  KECAK_PRESETS.find((x) => x.id === p.id)?.shortLabel ?? String(p.entry)

type Props = {
  performers: Performer[]
  nextEntry: number | null
  selectedId: string | null
  onSeat: (p: Performer) => void
}

/** All voices share one center; Entry 1 = innermost orbit, Entry 8 = outermost. */
export function OrbitView({ performers, nextEntry, selectedId, onSeat }: Props) {
  return (
    <svg
      className="orbit-view"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="group"
      aria-label="Kecak orbits"
    >
      <circle
        data-center
        className="center-dot"
        cx={CENTER}
        cy={CENTER}
        r={6}
      />

      {performers.map((p) => {
        const r = orbitRadius(p.entry)
        return (
          <g key={p.id} className={p.joined ? 'orbit joined' : 'orbit'}>
            <circle
              data-orbit={p.id}
              className="orbit-line"
              cx={CENTER}
              cy={CENTER}
              r={r}
            />
            {p.joined && (
              <OrbitRing
                performer={p}
                cx={CENTER}
                cy={CENTER}
                r={r}
                point={2.6}
                tick={2.4}
                markerR={4.6}
                muted={p.muted}
              />
            )}
          </g>
        )
      })}

      {performers.map((p) => {
        const a = seatAngle(p.entry)
        const seat = pointOnCircle(CENTER, CENTER, SEAT_RADIUS, a)
        const tag = pointOnCircle(CENTER, CENTER, orbitRadius(p.entry), a)
        const stem = pointOnCircle(CENTER, CENTER, SEAT_RADIUS - AVATAR_R, a)
        const isNext = nextEntry === p.entry
        const cls = [
          'seat',
          p.joined ? 'joined' : 'idle',
          isNext ? 'next' : '',
          p.muted ? 'muted' : '',
          selectedId === p.id ? 'selected' : '',
        ].join(' ')
        const clickable = p.joined || isNext
        return (
          <g key={`seat-${p.id}`} className={cls}>
            {/* leader line ties the person to their orbit without relying on color */}
            <line
              className="leader"
              x1={stem.x}
              y1={stem.y}
              x2={tag.x}
              y2={tag.y}
            />
            <g
              className="orbit-tag"
              transform={`translate(${tag.x} ${tag.y})`}
            >
              <circle r={ORBIT_STEP / 2 - 1.5} />
              <text dy="0.35em">{p.entry}</text>
            </g>
            <g
              className="avatar-hit"
              role="button"
              tabIndex={clickable ? 0 : -1}
              aria-label={`${p.entry}. ${p.name}${p.joined ? '' : isNext ? ' (join)' : ' (locked)'}`}
              aria-disabled={!clickable}
              onClick={() => clickable && onSeat(p)}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSeat(p)
                }
              }}
            >
              {/* 44px+ tap target on a 400-unit viewBox rendered ~ >=340px wide */}
              <circle className="tap" cx={seat.x} cy={seat.y} r={AVATAR_R + 6} />
              <g
                data-avatar={p.id}
                className="avatar"
                style={{
                  transformOrigin: `${seat.x}px ${seat.y}px`,
                }}
              >
                <circle cx={seat.x} cy={seat.y} r={AVATAR_R} />
                <text x={seat.x} y={seat.y} dy="0.35em">
                  {labelOf(p)}
                </text>
              </g>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
