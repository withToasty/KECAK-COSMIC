// Named arrangements saved in this browser. Every access is wrapped: storage can
// be missing, full or blocked, and the app must work without it.

const KEY = 'kecak-cosmic.saved.v1'

export type SavedPreset = { name: string; code: string }

export function listSaved(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is SavedPreset =>
        typeof x?.name === 'string' && typeof x?.code === 'string',
    )
  } catch {
    return []
  }
}

function write(list: SavedPreset[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** Save under `name` (replacing a same-named preset). Returns false if storage failed. */
export function savePreset(name: string, code: string): boolean {
  const clean = name.trim().slice(0, 40)
  if (!clean) return false
  const rest = listSaved().filter((p) => p.name !== clean)
  return write([{ name: clean, code }, ...rest].slice(0, 30))
}

export function deleteSaved(name: string): boolean {
  return write(listSaved().filter((p) => p.name !== name))
}
