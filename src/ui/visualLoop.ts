// requestAnimationFrame follower. The audio clock is the source of truth:
// marker positions and hit flashes are derived from audio time every frame,
// imperatively, so React never re-renders per frame.

import { engine } from './useEngine'
import { orbitFraction } from '../cosmos/compress'
import { CENTER, cycleAngle, pointOnCircle } from './geometry'

const flash = (el: Element | null, keyframes: Keyframe[], duration: number) => {
  el?.animate(keyframes, { duration, easing: 'ease-out' })
}

export function startVisualLoop(root: HTMLElement): () => void {
  let raf = 0

  /** COSMIC MODE: each body travels its orbit; a sound is the pass at 12 o'clock. */
  const cosmicFrame = () => {
    const pos = engine.position()
    root.querySelectorAll<SVGCircleElement>('[data-body]').forEach((el) => {
      const period = Number(el.dataset.period)
      const r = Number(el.dataset.r)
      const phase = Number(el.dataset.phase ?? 0)
      const p = pointOnCircle(CENTER, CENTER, r, orbitFraction(pos, period, phase) * Math.PI * 2)
      el.setAttribute('cx', p.x.toFixed(2))
      el.setAttribute('cy', p.y.toFixed(2))
    })
    // The date inside the music: the start date plus the real time the beats stand for.
    root.querySelectorAll<HTMLElement>('[data-simdate]').forEach((el) => {
      const start = Number(el.dataset.startMs)
      const spb = Number(el.dataset.secPerBeat)
      if (!Number.isFinite(start) || !Number.isFinite(spb)) return
      const ms = start + pos * spb * 1000
      const text = Math.abs(ms) < 8.6e15 ? new Date(ms).toISOString().slice(0, 10) : ''
      if (el.textContent !== text) el.textContent = text
    })
    let together = false
    for (const ev of engine.cosmicVisuals()) {
      root.querySelectorAll(`[data-body="${ev.bodyId}"]`).forEach((m) =>
        flash(m, [{ transform: 'scale(2.6)' }], 320),
      )
      root.querySelectorAll(`[data-avatar="${ev.bodyId}"]`).forEach((a) =>
        flash(a, [{ transform: 'scale(1.18)' }], 220),
      )
      root.querySelectorAll(`[data-orbit="${ev.bodyId}"]`).forEach((o) =>
        flash(o, [{ strokeOpacity: 1, strokeWidth: 2.6 }], 300),
      )
      together ||= ev.conjunction
    }
    if (together) {
      root.querySelectorAll('[data-center]').forEach((c) =>
        flash(c, [{ transform: 'scale(2)', opacity: 1 }], 400),
      )
    }
  }

  const frame = () => {
    if (engine.getMode() === 'cosmic') {
      cosmicFrame()
      raf = requestAnimationFrame(frame)
      return
    }
    const session = engine.core.getSession()
    const pos = engine.position()

    root.querySelectorAll<SVGCircleElement>('[data-marker]').forEach((el) => {
      const len = Number(el.dataset.len)
      const r = Number(el.dataset.r)
      const cx = Number(el.dataset.cx ?? CENTER)
      const cy = Number(el.dataset.cy ?? CENTER)
      const rotation =
        session.performers.find((p) => p.id === el.dataset.marker)?.rotationBeats ?? 0
      const p = pointOnCircle(cx, cy, r, cycleAngle(((pos + rotation) % len + len) % len, len))
      el.setAttribute('cx', p.x.toFixed(2))
      el.setAttribute('cy', p.y.toFixed(2))
    })

    const due = engine.dueVisuals()
    const bursts = new Map<number, number>()
    for (const ev of due) {
      const key = `${ev.performerId}:${ev.beatIndex}:${ev.eventIndex}`
      root.querySelectorAll(`[data-event="${key}"]`).forEach((n) =>
        flash(n, [{ transform: 'scale(2.4)', opacity: 1 }], 280),
      )
      root.querySelectorAll(`[data-avatar="${ev.performerId}"]`).forEach((a) =>
        flash(a, [{ transform: 'scale(1.18)' }], 220),
      )
      root.querySelectorAll(`[data-orbit="${ev.performerId}"]`).forEach((o) =>
        flash(o, [{ strokeOpacity: 1, strokeWidth: 2.6 }], 260),
      )
      // Voices that sound on the same subtick: pulse the center.
      const t = Math.round(ev.audioTime * 1000)
      bursts.set(t, (bursts.get(t) ?? 0) + 1)
    }
    if ([...bursts.values()].some((n) => n >= 2)) {
      root.querySelectorAll('[data-center]').forEach((c) =>
        flash(c, [{ transform: 'scale(1.5)', opacity: 1 }], 240),
      )
    }

    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
