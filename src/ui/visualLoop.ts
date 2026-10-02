// requestAnimationFrame follower. The audio clock is the source of truth:
// marker positions and hit flashes are derived from audio time every frame,
// imperatively, so React never re-renders per frame.

import { engine } from './useEngine'
import { CENTER, cycleAngle, pointOnCircle } from './geometry'

const flash = (el: Element | null, keyframes: Keyframe[], duration: number) => {
  el?.animate(keyframes, { duration, easing: 'ease-out' })
}

export function startVisualLoop(root: HTMLElement): () => void {
  let raf = 0

  const frame = () => {
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
