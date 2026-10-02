import { SUBTICKS_PER_BEAT, type Performer } from '../domain/rhythm'

export const VIEW = 400
export const CENTER = VIEW / 2
export const ORBIT_INNER = 30
export const ORBIT_STEP_MAX = 14
export const ORBIT_OUTER = 128
export const SEAT_RADIUS = 170
export const AVATAR_R = 19

/** Gap between orbits: 14 for up to 8 voices, tighter when more are added. */
export const orbitStep = (count: number) =>
  Math.min(ORBIT_STEP_MAX, (ORBIT_OUTER - ORBIT_INNER) / Math.max(1, count - 1))

/** Orbit radius for entry 1 (innermost) .. N (outermost). */
export const orbitRadius = (entry: number, count: number) =>
  ORBIT_INNER + (entry - 1) * orbitStep(count)

/** Angle in radians; 0 = 12 o'clock, clockwise. */
export function pointOnCircle(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) }
}

/** Seats are spread evenly (45 degrees for 8) from 12 o'clock, clockwise by entry. */
export const seatAngle = (entry: number, count: number) =>
  ((entry - 1) / count) * Math.PI * 2

/** Position inside a cycle (in beats, fractional) -> angle. */
export const cycleAngle = (beatPosition: number, cycleBeats: number) =>
  (beatPosition / cycleBeats) * Math.PI * 2

export type EventMark = {
  key: string
  beatIndex: number
  eventIndex: number
  startAngle: number
  /** Arc length in radians (sustained events); short events render as a point. */
  sweep: number
  sustained: boolean
}

/** Flatten a performer's pattern into marks placed around its orbit. */
export function eventMarks(p: Performer): EventMark[] {
  const cycle = p.pattern.beats.length
  const marks: EventMark[] = []
  p.pattern.beats.forEach((cell, beatIndex) => {
    cell.forEach((e, eventIndex) => {
      const startBeat = beatIndex + e.offsetSubtick / SUBTICKS_PER_BEAT
      const durBeats = e.durationSubticks / SUBTICKS_PER_BEAT
      marks.push({
        key: `${p.id}:${beatIndex}:${eventIndex}`,
        beatIndex,
        eventIndex,
        startAngle: cycleAngle(startBeat, cycle),
        sweep: cycleAngle(Math.min(durBeats, cycle), cycle),
        sustained: e.sampleId === 'cak-long',
      })
    })
  })
  return marks
}

/** SVG arc path along a circle from `start` over `sweep` radians (clockwise). */
export function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const a = pointOnCircle(cx, cy, r, start)
  const b = pointOnCircle(cx, cy, r, start + Math.min(sweep, Math.PI * 2 - 0.001))
  const large = sweep > Math.PI ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}
