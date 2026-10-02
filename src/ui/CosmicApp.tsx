import { useState } from 'react'
import { orderedBodies } from '../cosmos/cosmicCore'
import { CosmicControls } from './CosmicControls'
import { CosmicDetail } from './CosmicDetail'
import { CosmicView } from './CosmicView'
import { engine, useCosmicSession } from './useEngine'

export function CosmicApp() {
  const session = useCosmicSession()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const bodies = orderedBodies(session.systemId)
  const periods = engine.cosmic.periods()
  const nextId = engine.cosmic.nextJoinable()?.id ?? null
  const selected = bodies.find((b) => b.id === selectedId)
  const voice = session.voices.find((v) => v.id === selectedId)

  return (
    <>
      <CosmicView
        bodies={bodies}
        voices={session.voices}
        periods={periods}
        phases={session.phases}
        nextId={nextId}
        selectedId={selectedId}
        onSeat={(id) => {
          const v = session.voices.find((x) => x.id === id)!
          if (v.joined) setSelectedId(id === selectedId ? null : id)
          else if (engine.cosmic.join(id)) setSelectedId(id)
        }}
      />
      <CosmicControls session={session} periods={periods} />
      {selected && voice?.joined && (
        <CosmicDetail
          key={selected.id}
          body={selected}
          voice={voice}
          periodBeats={periods.get(selected.id)!}
          tempoBpm={session.tempoBpm}
          allSeconds={bodies.map((b) => b.realPeriodSeconds)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
