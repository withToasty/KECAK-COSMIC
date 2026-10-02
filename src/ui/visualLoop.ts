// requestAnimationFrame follower. The audio clock is the source of truth:
// marker positions and hit flashes are derived from audio time every frame,
// imperatively, so React never re-renders per frame.

import { engine } from './useEngine'
import { CENTER, nodeAngle, pointOnCircle } from './geometry'

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
        session.performers.find((p) => p.id === el.dataset.marker)?.rotation ?? 0
      const p = pointOnCircle(cx, cy, r, nodeAngle(((pos + rotation) % len + len) % len, len))
      el.setAttribute('cx', p.x.toFixed(2))
      el.setAttribute('cy', p.y.toFixed(2))
    })

    for (const ev of engine.dueVisuals()) {
      for (const hit of ev.hits) {
        root
          .querySelectorAll(`[data-node="${hit.id}:${hit.position}"]`)
          .forEach((n) =>
            flash(n, [{ transform: 'scale(2.6)' }], 260),
          )
        root.querySelectorAll(`[data-avatar="${hit.id}"]`).forEach((a) =>
          flash(a, [{ transform: 'scale(1.18)' }], 220),
        )
        root.querySelectorAll(`[data-orbit="${hit.id}"]`).forEach((o) =>
          flash(o, [{ strokeOpacity: 1, strokeWidth: 2.6 }], 260),
        )
      }
      if (ev.hits.length >= 2) {
        root.querySelectorAll('[data-center]').forEach((c) =>
          flash(c, [{ transform: 'scale(1.5)', opacity: 1 }], 240),
        )
      }
    }

    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
