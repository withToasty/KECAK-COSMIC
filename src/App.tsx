import { useEffect, useRef, useState } from 'react'
import { decodeArrangement, SHARE_PREFIX } from './data/arrangement'
import { Controls } from './ui/Controls'
import { CosmicApp } from './ui/CosmicApp'
import { DetailPanel } from './ui/DetailPanel'
import { OrbitView } from './ui/OrbitView'
import { PresetPanel } from './ui/PresetPanel'
import { engine, useMode, useSession, useStopWhenHidden } from './ui/useEngine'
import { startVisualLoop } from './ui/visualLoop'

export default function App() {
  const session = useSession()
  const mode = useMode()
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
        <p>{mode === 'cosmic' ? '周期を重ねると、宇宙は音楽になる · M2' : 'Source-based Kecak 8 · M1'}</p>
      </header>

      <div className="mode" role="group" aria-label="Mode">
        <button
          className={mode === 'kecak' ? 'seg on' : 'seg'}
          aria-pressed={mode === 'kecak'}
          onClick={() => engine.setMode('kecak')}
        >
          KECAK LOOP
        </button>
        <button
          className={mode === 'cosmic' ? 'seg on' : 'seg'}
          aria-pressed={mode === 'cosmic'}
          onClick={() => engine.setMode('cosmic')}
        >
          COSMIC MODE
        </button>
      </div>

      {mode === 'cosmic' ? (
        <CosmicApp />
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
