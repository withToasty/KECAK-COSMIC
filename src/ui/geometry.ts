export const VIEW = 400
export const CENTER = VIEW / 2
export const ORBIT_INNER = 30
export const ORBIT_STEP = 14
export const SEAT_RADIUS = 170
export const AVATAR_R = 19

/** Orbit radius for entry 1 (innermost) .. 8 (outermost). */
export const orbitRadius = (entry: number) =>
  ORBIT_INNER + (entry - 1) * ORBIT_STEP

/** Angle in radians; 0 = 12 o'clock, clockwise. */
export function pointOnCircle(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) }
}

export const nodeAngle = (position: number, length: number) =>
  (position / length) * Math.PI * 2

/** Seats sit every 45 degrees starting at 12 o'clock, clockwise by entry. */
export const seatAngle = (entry: number) => ((entry - 1) / 8) * Math.PI * 2
