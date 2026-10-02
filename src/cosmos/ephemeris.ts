// "Today's configuration": where the planets actually are on a given date.
//
// Positions come from Astronomy Engine (VSOP87-based, nominal accuracy about
// one arcminute, offline, MIT). Only the heliocentric ecliptic longitude is
// used: it tells how far around its orbit each planet is, measured from the
// direction of the March equinox as seen from the Sun. See docs/cosmic-model.md.

import * as Astronomy from 'astronomy-engine'
import type { SystemId } from './bodies'

const PLANETS: Record<string, Astronomy.Body> = {
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
}

/** Systems whose bodies all have a computable position. */
export const EPHEMERIS_SYSTEMS: readonly SystemId[] = ['inner', 'outer']

export const supportsEphemeris = (id: SystemId): boolean => EPHEMERIS_SYSTEMS.includes(id)

/** Dates the library is meant for (its tables are truncated outside this span). */
export const DATE_MIN = '1900-01-01'
export const DATE_MAX = '2100-12-31'

/** `YYYY-MM-DD` -> noon UTC of that day; null when it is not a valid date. */
export function parseDate(text: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const d = new Date(`${text}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export const isDateInRange = (text: string) => text >= DATE_MIN && text <= DATE_MAX

export function todayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Heliocentric ecliptic longitude (degrees, 0..360) of a planet on `date`. */
export function heliocentricLongitude(bodyId: string, date: Date): number {
  const body = PLANETS[bodyId]
  if (!body) throw new Error(`no ephemeris for ${bodyId}`)
  const lon = Astronomy.EclipticLongitude(body, date)
  return ((lon % 360) + 360) % 360
}

/**
 * Fraction (0..1) of its revolution each planet has completed since it last
 * passed the equinox direction. 0 = at the 12 o'clock mark.
 */
export function phasesForDate(ids: readonly string[], date: Date): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of ids) out[id] = heliocentricLongitude(id, date) / 360
  return out
}
