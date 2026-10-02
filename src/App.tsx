import { useEffect, useRef, useState } from 'react'
import { decodeArrangement, SHARE_PREFIX } from './data/arrangement'
import { Controls } from './ui/Controls'
import { DetailPanel } from './ui/DetailPanel'
import { OrbitView } from './ui/OrbitView'
import { PresetPanel } from './ui/PresetPanel'
import { engine, useSession, useStopWhenHidden } from './ui/useEngine'
import { startVisualLoop } from './ui/visualLoop'

export default function App() {
  const session = useSession()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useStopWhenHidden()
  // A share link (#k1.…) loads its arrangement once, on open.
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash.startsWith(SHARE_PREFIX)) return
    try {
      engine.loadArrangement(decodeArrangement(hash))
    } catch {
      // A damaged link just opens the default arrangement.
    }
  }, [])
  useEffect(() => startVisualLoop(rootRef.current!), [])

  const next = engine.core.nextJoinable()
  const selected =
    session.performers.find((p) => p.id === selectedId && p.joined) ?? null

  return (
    <div className="app" ref={rootRef}>
      <header className="title">
        <h1>KECAK-COSMIC</h1>
        <p>Source-based Kecak 8 · M1</p>
      </header>

      <OrbitView
        performers={session.performers}
        nextEntry={next && !next.joined ? next.entry : null}
        selectedId={selected?.id ?? null}
        onSeat={(p) => {
          if (p.joined) setSelectedId(p.id === selectedId ? null : p.id)
          else if (engine.core.join(p.id)) setSelectedId(p.id)
        }}
      />

      <Controls session={session} />

      {selected && (
        <DetailPanel key={selected.id} performer={selected} onClose={() => setSelectedId(null)} />
      )}

      <PresetPanel />
    </div>
  )
}
