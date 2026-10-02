import { TEMPO_MAX, TEMPO_MIN, type Session } from '../engine/types'
import { PRESET_SETS } from '../data/presetSets'
import { engine } from './useEngine'

const CUE_LABEL = {
  idle: 'CUE',
  armed: 'CUE ARMED',
  call: 'CALL…',
  response: 'RESPONSE!',
} as const

const CUE_HINT = {
  idle: 'next beat',
  armed: 'tap to cancel',
  call: '',
  response: '',
} as const

export function Controls({ session }: { session: Session }) {
  const joined = session.performers.filter((p) => p.joined).length
  const allJoined = joined >= session.performers.length
  return (
    <div className="controls">
      <div className="preset" role="group" aria-label="Arrangement">
        {PRESET_SETS.map((set) => (
          <button
            key={set.id}
            className={session.presetSet === set.id ? 'seg on' : 'seg'}
            aria-pressed={session.presetSet === set.id}
            onClick={() => engine.setPresetSet(set)}
          >
            {set.label}
          </button>
        ))}
        <p className="preset-note">
          {PRESET_SETS.find((s) => s.id === session.presetSet)?.description}
        </p>
      </div>
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
        className={`cue ${session.cue}`}
        disabled={!session.playing || session.cue === 'call' || session.cue === 'response'}
        onClick={() => engine.core.toggleCue()}
      >
        {CUE_LABEL[session.cue]}
        <span className="count">{CUE_HINT[session.cue]}</span>
      </button>

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
