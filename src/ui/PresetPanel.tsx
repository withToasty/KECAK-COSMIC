import { useState } from 'react'
import { decodeArrangement, encodeArrangement, SHARE_PREFIX } from '../data/arrangement'
import { deleteSaved, listSaved, savePreset, type SavedPreset } from '../data/savedPresets'
import { engine } from './useEngine'

/** Copy text; browsers that refuse the clipboard fall back to a selectable box. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function PresetPanel() {
  const [saved, setSaved] = useState<SavedPreset[]>(() => listSaved())
  const [name, setName] = useState('My arrangement')
  const [paste, setPaste] = useState('')
  const [shown, setShown] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const say = (ok: boolean, text: string) => setMsg({ ok, text })
  const current = () => encodeArrangement(engine.core.getSession())

  const load = (code: string) => {
    try {
      engine.loadArrangement(decodeArrangement(code))
      say(true, '読み込みました(再生は止まり、頭出しされています)')
    } catch (e) {
      say(false, `読み込めません: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const share = async (asLink: boolean) => {
    const code = current()
    const text = asLink ? `${location.href.split('#')[0]}#${code}` : code
    if (await copyText(text)) {
      setShown('')
      say(true, asLink ? 'リンクをコピーしました' : 'コードをコピーしました')
    } else {
      setShown(text)
      say(true, 'コピーできないため、下のテキストを選んでコピーしてください')
    }
  }

  return (
    <details className="presets">
      <summary>Save / Share</summary>

      <div className="preset-row">
        <label htmlFor="preset-name" className="sr">Name</label>
        <input
          id="preset-name"
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={() => {
            const ok = savePreset(name, current())
            setSaved(listSaved())
            say(ok, ok ? `「${name.trim()}」を保存しました` : '保存できませんでした(名前が空か、ブラウザの保存領域が使えません)')
          }}
        >
          Save
        </button>
      </div>

      {saved.length > 0 && (
        <ul className="saved">
          {saved.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <button className="chip" onClick={() => load(p.code)}>Load</button>
              <button
                className="chip"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  deleteSaved(p.name)
                  setSaved(listSaved())
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="preset-row">
        <button onClick={() => void share(false)}>Copy code</button>
        <button onClick={() => void share(true)}>Copy link</button>
      </div>
      {shown && (
        <textarea
          readOnly
          rows={4}
          value={shown}
          aria-label="Share text"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}

      <div className="preset-row">
        <label htmlFor="preset-paste" className="sr">Share code</label>
        <textarea
          id="preset-paste"
          rows={2}
          placeholder={`${SHARE_PREFIX}… を貼り付け`}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button disabled={!paste.trim()} onClick={() => load(paste)}>Load</button>
      </div>

      {msg && (
        <p className={msg.ok ? 'msg ok' : 'msg err'} role="status">
          {msg.text}
        </p>
      )}
    </details>
  )
}
