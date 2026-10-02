import { TEMPO_MAX, TEMPO_MIN, type Session } from '../engine/types'
import { engine } from './useEngine'

export function Controls({ session }: { session: Session }) {
  const joined = session.performers.filter((p) => p.joined).length
  const allJoined = joined >= session.performers.length
  return (
    <div className="controls">
      <div className="transport">
        <button
          className="primary"
          disabled={session.playing}
          onClick={() => void engine.start()}
        >
          START
        </button>
        <button disabled={!session.playing} onClick={() => engine.stop()}>
          STOP
        </button>
        <button className="ghost" onClick={() => engine.reset()}>
          RESET
        </button>
      </div>

      <button
        className="join"
        disabled={allJoined}
        onClick={() => engine.core.join()}
      >
        {allJoined ? 'ALL VOICES JOINED' : 'JOIN NEXT VOICE'}
        <span className="count">
          {joined}/{session.performers.length}
        </span>
      </button>

      <label className="tempo">
        <span>
          Tempo <b>{session.pendingTempoBpm ?? session.tempoBpm}</b> BPM
          {session.pendingTempoBpm !== null && (
            <em> (next beat)</em>
          )}
        </span>
        <input
          type="range"
          min={TEMPO_MIN}
          max={TEMPO_MAX}
          step={1}
          value={session.pendingTempoBpm ?? session.tempoBpm}
          onChange={(e) => engine.core.setTempo(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
