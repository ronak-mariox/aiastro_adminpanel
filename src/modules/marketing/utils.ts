// Small helpers shared by the marketing + content modules.

type CsvValue = string | number | boolean | null | undefined

/** Triggers a browser download of `rows` as CSV (header row from the first object's keys). */
export function downloadCsv(filename: string, rows: Record<string, CsvValue>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]!)
  const esc = (v: CsvValue) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Returns a copy of `list` with the item at `index` moved one step up (-1) or down (+1). */
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

/** Deterministic pseudo-random generator so mock seeds stay stable across reloads. */
export function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** yyyy-mm-dd for <input type="date">. */
export const toDateInput = (iso: string) => iso.slice(0, 10)

/** yyyy-mm-ddThh:mm for <input type="datetime-local">. */
export const toDateTimeInput = (iso: string) => iso.slice(0, 16)

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0)

/** Mock "now" — keeps derived statuses (expired / scheduled) stable against the 2026 seed data. */
export const nowIso = () => new Date().toISOString()

/** Today's date as yyyy-mm-dd. */
export const todayStr = () => nowIso().slice(0, 10)

export const isFuture = (local: string) => new Date(local).getTime() > Date.now()
