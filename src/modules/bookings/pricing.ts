import type { Booking, BookingMode, BookingStatus, PriceBreakdown, Puja, PujaCategory } from './types'

export const CATEGORIES: PujaCategory[] = ['Prosperity', 'Health', 'Marriage', 'Planets', 'Housewarming']

/** The API charges the puja's own price — no samagri, travel or GST is added on top. */
export const MATERIALS_FEE = 0
export const TRAVEL_FEE = 0
export const GST_PCT = 0

/** Fallback slot list (a puja's own `timeSlots` win). */
export const SLOTS = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM']

export const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** What the customer pays: the puja's price, all-inclusive (same for home and online). */
export function priceFor(puja: Pick<Puja, 'basePrice' | 'samagriPrice'>, mode: BookingMode): PriceBreakdown {
  void mode
  return { base: puja.basePrice, materials: puja.samagriPrice || MATERIALS_FEE, travel: TRAVEL_FEE, gst: 0 }
}

/** Local Date for a booking's date + slot. */
export function bookingStart(b: Pick<Booking, 'date' | 'slot'>) {
  const [hm, ap] = b.slot.trim().split(/\s+/)
  const [h, m] = (hm ?? '00:00').split(':').map(Number)
  const hour = ((h ?? 0) % 12) + (ap === 'PM' ? 12 : 0)
  const [y, mo, d] = b.date.split('-').map(Number)
  return new Date(y ?? 2026, (mo ?? 1) - 1, d ?? 1, hour, m ?? 0)
}

/** Hours until the puja (the policy tiers are shown for reference; an admin cancellation refunds in full). */
export function refundTier(b: Pick<Booking, 'date' | 'slot'>, now = new Date()) {
  const start = bookingStart(b)
  const hours = (start.getTime() - now.getTime()) / 3_600_000
  if (start.toDateString() === now.toDateString() || hours <= 0) return { pct: 0, label: 'Same day — no refund', hours }
  if (hours > 72) return { pct: 100, label: 'More than 72 hours before — full refund', hours }
  if (hours >= 24) return { pct: 70, label: '24–72 hours before — 70% refund', hours }
  return { pct: 50, label: 'Less than 24 hours before — 50% refund', hours }
}

/** Lifecycle as tracked by the Pandit app; online pujas skip travel steps. */
export const flowFor = (mode: BookingMode): BookingStatus[] =>
  mode === 'online' ? ['upcoming', 'in progress', 'completed'] : ['upcoming', 'en route', 'arrived', 'in progress', 'completed']

export const nextStatus = (b: Pick<Booking, 'mode' | 'status'>): BookingStatus | null => {
  const flow = flowFor(b.mode)
  const i = flow.indexOf(b.status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1]! : null
}

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


