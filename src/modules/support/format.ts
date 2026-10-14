import { useState } from 'react'

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "5m ago", "3h ago", "2d ago" — or "in 4h" for future timestamps. */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = now - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const m = Math.round(abs / 60_000)
  const label = m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
  return diff >= 0 ? `${label} ago` : `in ${label}`
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Timestamp captured once per mount — keeps render pure while comparing against "now". */
export function useNow() {
  const [now] = useState(() => Date.now())
  return now
}
