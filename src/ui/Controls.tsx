import { MAX_PERFORMERS, TEMPO_MAX, TEMPO_MIN, type Session } from '../engine/types'
import { PRESET_SETS } from '../data/presetSets'
import { engine } from './useEngine'

const CUE_NAME = { call: 'CUE', break: 'BREAK' } as const
const CUE_RUNNING = { call: 'CALL…', response: 'RESPONSE!' } as const

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

      <div className="cues">
        {(['call', 'break'] as const).map((kind) => {
          const mine = session.cueKind === kind
          const phase = mine ? session.cue : 'idle'
          const running = phase === 'call' || phase === 'response'
          return (
            <button
              key={kind}
              className={`cue ${phase}`}
              disabled={!session.playing || (session.cue === 'call' || session.cue === 'response')}
              aria-pressed={phase === 'armed'}
              onClick={() => engine.core.toggleCue(kind)}
            >
              {running ? CUE_RUNNING[phase as 'call' | 'response'] : CUE_NAME[kind]}
              <span className="count">{phase === 'armed' ? 'cancel' : ''}</span>
            </button>
          )
        })}
        <button
          className={session.dynamics === 'soft' ? 'toggle on' : 'toggle'}
          aria-pressed={session.dynamics === 'soft'}
          onClick={() => engine.core.setDynamics(session.dynamics === 'soft' ? 'loud' : 'soft')}
        >
          SOFT
        </button>
      </div>

      <div className="joins">
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
        <button
          className="ghost add"
          disabled={session.performers.length >= MAX_PERFORMERS}
          onClick={() => engine.core.addVoice()}
        >
          ＋ VOICE
        </button>
      </div>

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
