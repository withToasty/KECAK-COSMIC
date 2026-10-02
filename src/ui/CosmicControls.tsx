import { COSMIC_SYSTEMS, findSystem } from '../cosmos/bodies'
import { FASTEST_BEATS_MAX, FASTEST_BEATS_MIN, type CosmicSession } from '../cosmos/cosmicCore'
import { formatDuration, nextRealignment, realSecondsPerBeat } from '../cosmos/compress'
import { orderedBodies } from '../cosmos/cosmicCore'
import { TEMPO_MAX, TEMPO_MIN } from '../engine/types'
import { DATE_MAX, DATE_MIN, parseDate, supportsEphemeris, todayString } from '../cosmos/ephemeris'
import { engine } from './useEngine'

export function CosmicControls({
  session,
  periods,
}: {
  session: CosmicSession
  periods: Map<string, number>
}) {
  const bodies = orderedBodies(session.systemId)
  const joined = session.voices.filter((v) => v.joined).length
  const all = joined >= session.voices.length
  const tempo = session.pendingTempoBpm ?? session.tempoBpm
  const perBeat = realSecondsPerBeat(bodies, session.fastestBeats)

  const sounding = session.voices
    .filter((v) => v.joined && !v.muted)
    .map((v) => periods.get(v.id)!)
  const startPhases = session.voices
    .filter((v) => v.joined && !v.muted)
    .map((v) => session.phases[v.id] ?? 0)
  const again = nextRealignment(sounding, 4000, 0.03, startPhases)
  const canUseDate = supportsEphemeris(session.systemId)
  const startMs = session.startDate ? parseDate(session.startDate)?.getTime() : undefined

  return (
    <div className="controls">
      <div className="preset systems" role="group" aria-label="System">
        {COSMIC_SYSTEMS.map((s) => (
          <button
            key={s.id}
            className={session.systemId === s.id ? 'seg on' : 'seg'}
            aria-pressed={session.systemId === s.id}
            onClick={() => engine.setCosmicSystem(s.id)}
          >
            {s.label}
          </button>
        ))}
        <p className="preset-note">{findSystem(session.systemId).description}</p>
      </div>

      <div className="transport">
        <button className="primary" disabled={session.playing} onClick={() => void engine.start()}>
          START
        </button>
        <button disabled={!session.playing} onClick={() => engine.stop()}>
          STOP
        </button>
        <button className="ghost" onClick={() => engine.resetCosmic()}>
          RESET
        </button>
      </div>

      <button className="join" disabled={all} onClick={() => engine.cosmic.join()}>
        {all ? 'ALL BODIES JOINED' : 'JOIN NEXT BODY'}
        <span className="count">
          {joined}/{session.voices.length}
        </span>
      </button>

      {canUseDate && (
        <div className="startmode">
          <div className="preset" role="group" aria-label="Start">
            <button
              className={session.startDate === null ? 'seg on' : 'seg'}
              aria-pressed={session.startDate === null}
              disabled={session.playing}
              onClick={() => engine.cosmic.setStartDate(null)}
            >
              そろえて始める
            </button>
            <button
              className={session.startDate !== null ? 'seg on' : 'seg'}
              aria-pressed={session.startDate !== null}
              disabled={session.playing}
              onClick={() => engine.cosmic.setStartDate(session.startDate ?? todayString())}
            >
              日付の配置
            </button>
          </div>
          {session.startDate !== null && (
            <div className="datepick">
              <label htmlFor="start-date" className="sr">
                開始日
              </label>
              <input
                id="start-date"
                type="date"
                min={DATE_MIN}
                max={DATE_MAX}
                value={session.startDate}
                disabled={session.playing}
                onChange={(e) => {
                  if (e.target.value) engine.cosmic.setStartDate(e.target.value)
                }}
              />
              <button disabled={session.playing} onClick={() => engine.cosmic.setStartDate(todayString())}>
                今日
              </button>
            </div>
          )}
          <p className="preset-note">
            {session.startDate === null
              ? '全員が同じ位置から一斉に始まり、そこからずれていきます'
              : '12時 = 春分点の方向(太陽から見て黄経0°)。画面は時計回りに揃えているため、実際を上から見た向きとは鏡像です。惑星の位置は Astronomy Engine(精度 ±1 分角)で計算'}
          </p>
        </div>
      )}

      <label className="tempo" htmlFor="compression">
        <span>
          最も速い天体の1周 = <b>{session.fastestBeats}</b> 拍
          {session.playing && <em> (停止中に変更できます)</em>}
        </span>
        <input
          id="compression"
          type="range"
          min={FASTEST_BEATS_MIN}
          max={FASTEST_BEATS_MAX}
          step={0.5}
          disabled={session.playing}
          value={session.fastestBeats}
          onChange={(e) => engine.cosmic.setFastestBeats(Number(e.target.value))}
        />
      </label>

      <label className="tempo" htmlFor="cosmic-tempo">
        <span>
          Tempo <b>{tempo}</b> BPM
          {session.pendingTempoBpm !== null && <em> (next beat)</em>}
        </span>
        <input
          id="cosmic-tempo"
          type="range"
          min={TEMPO_MIN}
          max={TEMPO_MAX}
          step={1}
          value={tempo}
          onChange={(e) => engine.cosmic.setTempo(Number(e.target.value))}
        />
      </label>

      <dl className="facts">
        <dt>1拍 =</dt>
        <dd>実際の {formatDuration(perBeat)}</dd>
        {startMs !== undefined && (
          <>
            <dt>音の中の日付</dt>
            <dd>
              <b
                className="simdate"
                data-simdate
                data-start-ms={startMs}
                data-sec-per-beat={perBeat}
              >
                {session.startDate}
              </b>
            </dd>
          </>
        )}
        <dt>また重なる</dt>
        <dd>
          {sounding.length < 2
            ? '2つ以上を鳴らすと表示されます'
            : again === null
              ? 'しばらく(約4000拍)は重なりません'
              : `約 ${again.toFixed(1)} 拍後(${formatDuration((again * 60) / tempo)}後)`}
        </dd>
      </dl>
    </div>
  )
}
