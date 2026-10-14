// Puja catalogue + puja bookings ↔ Shree Astro admin API.
//   pujas      GET/POST /admin/pujas, PUT /admin/pujas/:id, PATCH …/status, DELETE (archives)
//   bookings   GET /admin/puja-bookings[/:id], PATCH /admin/puja-bookings/:id { status: completed|cancelled, adminNote }
//              POST /admin/puja-bookings/:id/reschedule { date, time, reason }, POST …/assign { panditId }
//   pandits    GET /admin/pandits (approved, for the assign dialog)

import { api } from '@/lib/api'
import { createRemoteCollection, fetchAll } from '@/lib/remoteCollection'
import type { AssignablePandit, Booking, BookingEvent, BookingStatus, PaymentStatus, Puja, PujaCategory } from './types'

// ---------------------------------------------------------------- API shapes

type SPuja = {
  id: string
  name: string
  slug: string
  tagline?: string | null
  category?: string | null
  categoryLabel?: string | null
  badge?: string | null
  imageUrl?: string | null
  description?: string | null
  benefits?: string[]
  price: number
  oldPrice?: number | null
  durationText?: string | null
  people?: string | null
  onlineAvailable?: boolean
  timeSlots?: string[]
  maxPerSlot?: number
  rating?: number
  ratingCount?: number
  bookingCount?: number
  isFeatured?: boolean
  status: 'active' | 'hidden' | 'archived'
}

type SBooking = {
  id: string
  reference: string
  user?: { id: string; name?: string; phone?: string; email?: string } | string | null
  puja?: { id: string; slug?: string; name?: string; imageUrl?: string } | string | null
  pujaSnapshot?: { name?: string; price?: number }
  pandit?: { id: string; name?: string; photoUrl?: string } | string | null
  panditSnapshot?: { name?: string; phone?: string }
  panditStatus?: 'requested' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'declined' | 'cancelled'
  panditTimeline?: { acceptedAt?: string; enRouteAt?: string; arrivedAt?: string; startedAt?: string; completedAt?: string; declinedAt?: string }
  date: string
  time: string
  subtotal?: number
  discount?: number
  couponCode?: string | null
  amount: number
  total?: number
  status: 'awaiting_approval' | 'awaiting_payment' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled'
  payment?: { method?: 'wallet' | 'razorpay'; status?: 'pending' | 'paid' | 'failed' | 'refunded'; gateway?: { method?: string } }
  contact?: { fullName?: string; phone?: string; email?: string; gotra?: string; address?: string }
  notes?: string
  streamUrl?: string
  adminNote?: string
  rating?: number | null
  review?: string
  completedAt?: string
  cancelledAt?: string
  cancelledBy?: 'customer' | 'pandit' | 'admin' | 'system'
  cancelReason?: string
  createdAt: string
}

type SPandit = {
  id: string
  name?: string | null
  phone?: string | null
  city?: string | null
  serviceRadiusKm?: number | null
  rating?: number
  ratingCount?: number
  experienceYears?: number | null
  baseFee?: number | null
  offersOnlinePuja?: boolean
  acceptingBookings?: boolean
  applicationStatus?: string
  status?: string
  pujas?: string[]
  timeSlots?: string[]
}

// ---------------------------------------------------------------- pujas

/** API category key ↔ the panel's five shelves. Keys the panel has no shelf for map to the nearest one. */
const CATEGORY_FROM_API: Record<string, PujaCategory> = {
  prosperity: 'Prosperity',
  health: 'Health',
  shiva: 'Health',
  marriage: 'Marriage',
  planetary: 'Planets',
  planets: 'Planets',
  'home-vastu': 'Housewarming',
  housewarming: 'Housewarming',
  custom: 'Prosperity',
}
const CATEGORY_TO_API: Record<PujaCategory, { key: string; label: string }> = {
  Prosperity: { key: 'prosperity', label: 'Prosperity' },
  Health: { key: 'health', label: 'Health & Protection' },
  Marriage: { key: 'marriage', label: 'Marriage' },
  Planets: { key: 'planetary', label: 'Planetary' },
  Housewarming: { key: 'home-vastu', label: 'Home & Vastu' },
}

export function toPuja(p: SPuja): Puja {
  return {
    id: p.id,
    name: p.name,
    description: p.tagline || p.description || '',
    imageUrl: p.imageUrl ?? '',
    timeSlots: p.timeSlots ?? [],
    maxPerSlot: p.maxPerSlot ?? 3,
    category: CATEGORY_FROM_API[p.category ?? ''] ?? 'Prosperity',
    duration: p.durationText ?? '',
    people: p.people ?? '',
    benefits: p.benefits ?? [],
    basePrice: p.price,
    samagriPrice: 0,
    badge: p.badge ?? undefined,
    popular: !!p.isFeatured,
    onlineAvailable: p.onlineAvailable !== false,
    active: p.status === 'active',
    rating: p.rating ?? 0,
    bookings: p.bookingCount ?? 0,
  }
}

function pujaPayload(d: Partial<Puja>, current?: Puja) {
  const body: Record<string, unknown> = {}
  if (d.name !== undefined) body.name = d.name
  if (d.description !== undefined) body.tagline = d.description
  if (d.category !== undefined && d.category !== current?.category) {
    body.category = CATEGORY_TO_API[d.category].key
    body.categoryLabel = CATEGORY_TO_API[d.category].label
  }
  if (d.duration !== undefined) body.durationText = d.duration
  if (d.people !== undefined) body.people = d.people
  if (d.benefits !== undefined) body.benefits = d.benefits
  if (d.basePrice !== undefined) body.price = Math.round(d.basePrice)
  if (d.badge !== undefined) body.badge = d.badge || null
  if (d.popular !== undefined) body.isFeatured = d.popular
  if (d.onlineAvailable !== undefined) body.onlineAvailable = d.onlineAvailable
  if (d.active !== undefined) body.status = d.active ? 'active' : 'hidden'
  if (d.imageUrl) body.imageUrl = d.imageUrl
  if (d.timeSlots !== undefined) body.timeSlots = d.timeSlots
  if (d.maxPerSlot !== undefined) body.maxPerSlot = d.maxPerSlot
  return body
}

export const pujasDb = createRemoteCollection<Puja>({
  list: async () => (await fetchAll<SPuja>('/admin/pujas')).filter(p => p.status !== 'archived').map(toPuja),
  create: async item => toPuja((await api.post<{ puja: SPuja }>('/admin/pujas', pujaPayload(item))).puja),
  update: async (id, patch, current) => {
    const keys = Object.keys(patch)
    if (keys.length === 1 && keys[0] === 'active') {
      return toPuja((await api.patch<{ puja: SPuja }>(`/admin/pujas/${id}/status`, { status: patch.active ? 'active' : 'hidden' })).puja)
    }
    return toPuja((await api.put<{ puja: SPuja }>(`/admin/pujas/${id}`, pujaPayload(patch, current))).puja)
  },
  remove: async id => {
    await api.del(`/admin/pujas/${id}`)
  },
})

// ---------------------------------------------------------------- bookings

const PANDIT_PROGRESS: Partial<Record<NonNullable<SBooking['panditStatus']>, BookingStatus>> = {
  en_route: 'en route',
  arrived: 'arrived',
  in_progress: 'in progress',
}

const PANDIT_STATUS_LABEL: Record<NonNullable<SBooking['panditStatus']>, string> = {
  requested: 'Waiting for the pandit to accept',
  accepted: 'Accepted by the pandit',
  en_route: 'Pandit on the way',
  arrived: 'Pandit arrived',
  in_progress: 'Puja in progress',
  completed: 'Completed',
  declined: 'Declined by the pandit',
  cancelled: 'Cancelled',
}

function statusOf(b: SBooking): BookingStatus {
  if (b.status === 'completed') return 'completed'
  if (b.status === 'cancelled') return 'cancelled'
  return (b.panditStatus && PANDIT_PROGRESS[b.panditStatus]) || 'upcoming'
}

function paymentMethodOf(b: SBooking): Booking['paymentMethod'] {
  if ((b.payment?.method ?? 'wallet') === 'wallet') return 'Wallet'
  const gw = (b.payment?.gateway?.method ?? '').toLowerCase()
  return gw === 'upi' ? 'UPI' : gw === 'netbanking' ? 'Net Banking' : 'Card'
}

function historyOf(b: SBooking): BookingEvent[] {
  const events: BookingEvent[] = [{ label: 'Booking placed', at: b.createdAt, note: b.status === 'pending_payment' ? 'Waiting for online payment' : b.status === 'awaiting_approval' ? 'Request — paid after the pandit accepts' : b.status === 'awaiting_payment' ? 'Accepted — waiting for the customer to pay' : 'Payment received' }]
  const t = b.panditTimeline ?? {}
  const add = (label: string, at?: string, note?: string) => at && events.push({ label, at, note })
  add('Accepted by pandit', t.acceptedAt, b.panditSnapshot?.name)
  add('En route', t.enRouteAt, 'Updated from Pandit app')
  add('Arrived', t.arrivedAt, 'Updated from Pandit app')
  add('In progress', t.startedAt, 'Updated from Pandit app')
  add('Declined by pandit', t.declinedAt)
  add('Puja completed', b.completedAt ?? t.completedAt)
  add('Cancelled', b.cancelledAt, [b.cancelReason, b.cancelledBy && `by ${b.cancelledBy}`].filter(Boolean).join(' · ') || undefined)
  for (const line of (b.adminNote ?? '').split('\n').filter(l => l.startsWith('Rescheduled '))) events.push({ label: 'Rescheduled', at: b.createdAt, note: line.replace(/^Rescheduled /, '') })
  return events.sort((x, y) => x.at.localeCompare(y.at))
}

/** "9:00 AM" → "09:00 AM" so the page's slot parsing and sorting keep working. */
const padTime = (t: string) => t.replace(/^(\d):/, '0$1:')

export function toBooking(b: SBooking): Booking {
  const user = b.user && typeof b.user === 'object' ? b.user : null
  const puja = b.puja && typeof b.puja === 'object' ? b.puja : null
  const pandit = b.pandit && typeof b.pandit === 'object' ? b.pandit : null
  const panditId = pandit?.id ?? (typeof b.pandit === 'string' ? b.pandit : null)
  const online = !panditId
  const total = b.total ?? b.amount
  const refunded = b.payment?.status === 'refunded'
  return {
    id: b.id,
    reference: b.reference,
    customerId: user?.id ?? (typeof b.user === 'string' ? b.user : ''),
    customerName: b.contact?.fullName || user?.name || 'Customer',
    customerPhone: b.contact?.phone || user?.phone || '',
    panditId,
    panditName: pandit?.name || b.panditSnapshot?.name || '',
    panditPhone: b.panditSnapshot?.phone ?? '',
    panditStatus: b.status === 'awaiting_payment' ? 'Accepted — waiting for customer payment' : b.panditStatus ? PANDIT_STATUS_LABEL[b.panditStatus] : undefined,
    pujaId: puja?.id ?? (typeof b.puja === 'string' ? b.puja : ''),
    puja: puja?.name || b.pujaSnapshot?.name || 'Puja',
    date: b.date,
    slot: padTime(b.time),
    mode: online ? 'online' : 'home',
    address: b.contact?.address || (online ? 'Online (live stream)' : '—'),
    city: '',
    pincode: '',
    price: { base: b.subtotal ?? total, materials: 0, travel: 0, gst: 0 },
    total,
    discount: b.discount ?? 0,
    coupon: b.couponCode ?? undefined,
    paymentMethod: paymentMethodOf(b),
    paymentStatus: (b.payment?.status ?? 'paid') as PaymentStatus,
    status: statusOf(b),
    createdAt: b.createdAt,
    cancellation:
      b.status === 'cancelled'
        ? { reason: b.cancelReason ?? '', by: b.cancelledBy === 'pandit' || b.cancelledBy === 'customer' ? b.cancelledBy : 'admin', at: b.cancelledAt ?? b.createdAt, refundPct: refunded ? 100 : 0, refundAmount: refunded ? total : 0 }
        : undefined,
    rating: b.rating ?? undefined,
    review: b.review,
    gotra: b.contact?.gotra,
    notes: b.notes,
    streamUrl: b.streamUrl,
    adminNote: b.adminNote,
    history: historyOf(b),
  }
}

/** Only these booking changes exist in the API; the page asks through `update` like before. */
export const bookingsDb = createRemoteCollection<Booking>({
  list: async () => (await fetchAll<SBooking>('/admin/puja-bookings')).map(toBooking),
  get: async id => toBooking((await api.get<{ booking: SBooking }>(`/admin/puja-bookings/${id}`)).booking),
  update: async (id, patch, current) => {
    let latest: SBooking | null = null
    if (patch.panditId && patch.panditId !== current.panditId) {
      latest = (await api.post<{ booking: SBooking }>(`/admin/puja-bookings/${id}/assign`, { panditId: patch.panditId })).booking
    }
    if ((patch.date && patch.date !== current.date) || (patch.slot && patch.slot !== current.slot)) {
      const reason = patch.history?.at(-1)?.note?.split(' · ').slice(1).join(' · ')
      latest = (
        await api.post<{ booking: SBooking }>(`/admin/puja-bookings/${id}/reschedule`, {
          date: patch.date ?? current.date,
          time: (patch.slot ?? current.slot).replace(/^0(\d):/, '$1:'),
          ...(reason ? { reason } : {}),
        })
      ).booking
    }
    if (patch.status && patch.status !== current.status) {
      if (patch.status !== 'completed' && patch.status !== 'cancelled') throw new Error('Only the pandit can move a booking through its on-the-day steps.')
      const note = patch.status === 'cancelled' ? patch.cancellation?.reason : undefined
      latest = (await api.patch<{ booking: SBooking }>(`/admin/puja-bookings/${id}`, { status: patch.status, ...(note ? { adminNote: note } : {}) })).booking
    }
    if (patch.streamUrl !== undefined || patch.adminNote !== undefined) {
      latest = (
        await api.patch<{ booking: SBooking }>(`/admin/puja-bookings/${id}`, {
          ...(patch.streamUrl !== undefined ? { streamUrl: patch.streamUrl } : {}),
          ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
        })
      ).booking
    }
    if (!latest) latest = (await api.get<{ booking: SBooking }>(`/admin/puja-bookings/${id}`)).booking
    return toBooking(latest)
  },
})

// ---------------------------------------------------------------- pandits

const toPandit = (p: SPandit): AssignablePandit => ({
  id: p.id,
  name: p.name || 'Pandit',
  phone: p.phone ?? '',
  city: p.city ?? '',
  serviceRadiusKm: p.serviceRadiusKm ?? 0,
  rating: p.rating ?? 0,
  reviews: p.ratingCount ?? 0,
  experienceYears: p.experienceYears ?? 0,
  baseFee: p.baseFee ?? 0,
  onlinePuja: !!p.offersOnlinePuja,
  acceptingBookings: p.acceptingBookings !== false,
  pujaIds: p.pujas ?? [],
  timeSlots: p.timeSlots ?? [],
})

/** Approved, active pandits — who a booking can be given to. */
export const assignablePanditsDb = createRemoteCollection<AssignablePandit>({
  list: async () =>
    (await fetchAll<SPandit>('/admin/pandits', { status: 'approved' }))
      .filter(p => p.applicationStatus === 'approved' && p.status !== 'blocked')
      .map(toPandit),
})

/** Whether a pandit performs this puja (none assigned = every puja). */
export const performsPuja = (p: AssignablePandit, pujaId: string) => p.pujaIds.length === 0 || p.pujaIds.includes(pujaId)
