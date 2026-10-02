// COSMIC MODE view: the same grammar as the Kecak view (shared center, one orbit
// per voice, seats outside, a marker that moves along the orbit) with bodies in
// place of voices. The orbit is one revolution of the body; it sounds each time
// the marker passes 12 o'clock.

import { findBody, type CosmicBody } from '../cosmos/bodies'
import type { CosmicVoice } from '../cosmos/cosmicCore'
import { AVATAR_R, CENTER, SEAT_RADIUS, VIEW, pointOnCircle, seatAngle } from './geometry'

const ORBIT_FIRST = 38
const ORBIT_LAST = 128

const radiusOf = (index: number, count: number) =>
  count <= 1 ? ORBIT_FIRST : ORBIT_FIRST + (index * (ORBIT_LAST - ORBIT_FIRST)) / (count - 1)

const DOT: Record<CosmicBody['sourceType'], number> = { planet: 6, moon: 4.6, satellite: 3.6 }

type Props = {
  bodies: CosmicBody[]
  voices: CosmicVoice[]
  periods: Map<string, number>
  nextId: string | null
  selectedId: string | null
  onSeat: (id: string) => void
}

export function CosmicView({ bodies, voices, periods, nextId, selectedId, onSeat }: Props) {
  const count = bodies.length
  const byId = new Map(voices.map((v) => [v.id, v]))
  return (
    <svg className="orbit-view cosmic" viewBox={`0 0 ${VIEW} ${VIEW}`} role="group" aria-label="Cosmic orbits">
      <circle data-center className="center-dot sun" cx={CENTER} cy={CENTER} r={7} />

      {bodies.map((b, i) => {
        const v = byId.get(b.id)!
        const r = radiusOf(i, count)
        const start = pointOnCircle(CENTER, CENTER, r, 0)
        return (
          <g key={b.id} className={v.joined ? 'orbit joined' : 'orbit'}>
            <circle data-orbit={b.id} className="orbit-line" cx={CENTER} cy={CENTER} r={r} />
            {/* the point where the orbit "begins": one sound per pass */}
            <line className="beat-tick" x1={start.x} y1={start.y - 5} x2={start.x} y2={start.y + 5} />
            {v.joined && (
              <circle
                data-body={b.id}
                data-period={periods.get(b.id)}
                data-r={r}
                className={`marker body ${b.sourceType}`}
                style={v.muted ? { opacity: 0.35 } : undefined}
                cx={CENTER}
                cy={CENTER - r}
                r={DOT[b.sourceType]}
              />
            )}
          </g>
        )
      })}

      {bodies.map((b, i) => {
        const v = byId.get(b.id)!
        const a = seatAngle(i + 1, count)
        const seat = pointOnCircle(CENTER, CENTER, SEAT_RADIUS, a)
        const tag = pointOnCircle(CENTER, CENTER, radiusOf(i, count), a)
        const stem = pointOnCircle(CENTER, CENTER, SEAT_RADIUS - AVATAR_R, a)
        const cls = [
          'seat',
          v.joined ? 'joined' : 'idle',
          nextId === b.id ? 'next' : '',
          v.muted ? 'muted' : '',
          selectedId === b.id ? 'selected' : '',
        ].join(' ')
        return (
          <g key={`seat-${b.id}`} className={cls}>
            <line className="leader" x1={stem.x} y1={stem.y} x2={tag.x} y2={tag.y} />
            <g className="orbit-tag" transform={`translate(${tag.x} ${tag.y})`}>
              <circle r={6.5} />
              <text dy="0.35em">{i + 1}</text>
            </g>
            <g
              className="avatar-hit"
              role="button"
              tabIndex={0}
              aria-label={`${i + 1}. ${b.nameJa} (${b.name})${v.joined ? '' : ' (join)'}`}
              onClick={() => onSeat(b.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSeat(b.id)
                }
              }}
            >
              <circle className="tap" cx={seat.x} cy={seat.y} r={AVATAR_R + 6} />
              <g
                data-avatar={b.id}
                className="avatar"
                style={{ transformOrigin: `${seat.x}px ${seat.y}px` }}
              >
                <circle cx={seat.x} cy={seat.y} r={AVATAR_R} />
                <text x={seat.x} y={seat.y} dy="0.35em" style={{ fontSize: b.shortLabel.length > 3 ? 9 : 11 }}>
                  {b.shortLabel}
                </text>
              </g>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

export const bodyById = (id: string) => findBody(id)
