import type { Consultation } from './types'

/** Billable seconds — live sessions keep ticking from startedAt (minus paused time). */
export const sessionSeconds = (c: Consultation, now = Date.now()) =>
  c.status === 'ongoing' ? Math.max(0, Math.floor((now - new Date(c.startedAt).getTime() - (c.pausedMs || 0)) / 1000)) : c.durationSec

export const formatDuration = (sec: number) => {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s.toString().padStart(2, '0')}s`
}

/**
 * Billing breakdown for a session (per-minute charges are rounded up to the minute).
 * Ended sessions use the amounts actually billed; live ones are estimated from the meter.
 * Gifts are split with the session's own commission, as the backend bills them.
 */
export function billing(c: Consultation, now = Date.now()) {
  const secs = sessionSeconds(c, now)
  const live = c.status === 'ongoing'
  const charges = live ? Math.max(c.amount, Math.ceil(secs / 60) * c.ratePerMin) : c.amount
  const astrologerCharges = live ? charges - Math.round((charges * c.commissionPct) / 100) : c.astrologerEarning
  const commission = charges - astrologerCharges
  const giftsTotal = c.giftsAmount || c.gifts.reduce((sum, g) => sum + g.price, 0)
  const giftShare = c.giftsEarning
  const astrologerShare = astrologerCharges + giftShare
  const platformShare = commission + (giftsTotal - giftShare)
  const refunded = c.refund?.amount ?? 0
  return { secs, charges, giftsTotal, commission, giftShare, astrologerShare, platformShare, gross: charges + giftsTotal, refunded }
}

export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
