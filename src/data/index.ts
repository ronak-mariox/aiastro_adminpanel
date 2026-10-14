import { api, fetchAll } from '@/lib/api'
import { createRemoteCollection } from '@/lib/store'
import { badgeId, expertiseId, languageId, toAstrologer, toCustomer, toPandit, type Row } from './adapters'
import type { Astrologer, Customer, Pandit } from './types'

export * from './types'
export { toAstrologer, toCustomer, toPandit } from './adapters'

// Shared collections — every module reads/writes the same records, now backed by the admin API.
//   customers   → /admin/customers (panel-shaped rows; see backend services/adminCustomers.service.js)
//   astrologers → /admin/astrologers
//   pandits     → /admin/pandits

export const customersDb = createRemoteCollection<Customer>({
  list: async () => (await fetchAll<Row>('/admin/customers')).map(toCustomer),
  get: async id => toCustomer((await api.get<{ customer: Row }>(`/admin/customers/${id}`)).customer),
  create: async item => {
    const { customer } = await api.post<{ customer: Row }>('/admin/customers', {
      name: item.name,
      phone: item.phone,
      email: item.email,
      gender: item.gender,
      dob: item.dob,
      tob: item.tob,
      birthPlace: item.birthPlace,
      city: item.city,
      state: item.state,
    })
    return toCustomer(customer)
  },
  update: async (id, patch) => {
    const { status, ...rest } = patch
    let row: Row | undefined
    const profileKeys = ['name', 'phone', 'email', 'gender', 'dob', 'tob', 'birthPlace', 'city', 'state'] as const
    const profile = Object.fromEntries(profileKeys.filter(k => k in rest).map(k => [k, rest[k]]))
    if (Object.keys(profile).length) row = (await api.patch<{ customer: Row }>(`/admin/customers/${id}`, profile)).customer
    if (status) row = { ...(row ?? {}), ...(await api.patch<{ customer: Row }>(`/admin/customers/${id}/status`, { status })).customer }
    return row ? toCustomer((await api.get<{ customer: Row }>(`/admin/customers/${id}`)).customer) : undefined
  },
})

// ---- partner detail fetches (shared by the collections below and the partner pages) ----
// One GET serves both useRecord(astrologersDb, id) and the detail page's extra data, so the
// page does not fetch the same record twice.
const detailCache = new Map<string, { at: number; promise: Promise<Row> }>()
function cachedDetail(path: string, fresh: boolean): Promise<Row> {
  const hit = detailCache.get(path)
  if (!fresh && hit && Date.now() - hit.at < 2000) return hit.promise
  const promise = api.get<Row>(path)
  promise.catch(() => detailCache.delete(path))
  detailCache.set(path, { at: Date.now(), promise })
  return promise
}
const primeDetail = (path: string, row: Row) => detailCache.set(path, { at: Date.now(), promise: Promise.resolve(row) })

/** GET /admin/panel/astrologers/:id → { astrologer, documents, bankAccounts, priceChangeRequests, sessions, earnings }. */
export const loadAstrologerDetail = (id: string, fresh = false) => cachedDetail(`/admin/panel/astrologers/${id}`, fresh)
/** GET /admin/panel/pandits/:id → { pandit } (wallet, bank, pendingBank, blocked dates, booking stats, documents). */
export const loadPanditDetail = (id: string, fresh = false) => cachedDetail(`/admin/panel/pandits/${id}`, fresh)

/** Admin profile/rate/commission edits: PATCH /admin/panel/astrologers/:id (answers the fresh detail). */
export async function patchAstrologer(id: string, body: Row): Promise<Astrologer> {
  const detail = await api.patch<Row>(`/admin/panel/astrologers/${id}`, body)
  primeDetail(`/admin/panel/astrologers/${id}`, detail)
  return toAstrologer(detail.astrologer)
}
/** PATCH /admin/panel/pandits/:id (answers { pandit } with the panel row). */
export async function patchPandit(id: string, body: Row): Promise<Pandit> {
  const detail = await api.patch<Row>(`/admin/panel/pandits/${id}`, body)
  primeDetail(`/admin/panel/pandits/${id}`, detail)
  return toPandit(detail.pandit)
}

/** Maps a panel patch of the shared Astrologer record onto the edit endpoint's body. */
function astrologerBody(patch: Partial<Astrologer>, current?: Astrologer): Row {
  const body: Row = {}
  for (const k of ['name', 'phone', 'email', 'experienceYears', 'city'] as const) if (k in patch) body[k] = patch[k]
  if ('gender' in patch) body.gender = (patch.gender ?? '').toLowerCase()
  if (patch.languages) body.languages = patch.languages.map(languageId)
  if (patch.skills) body.expertise = patch.skills.map(expertiseId)
  if ('badge' in patch) body.badges = patch.badge ? [badgeId(patch.badge)] : []
  if (patch.commissionPct !== undefined) body.commissionPercent = patch.commissionPct
  if (patch.pricing || patch.services) {
    const pricing = { ...current?.pricing, ...patch.pricing } as Astrologer['pricing']
    const services = { ...current?.services, ...patch.services } as Astrologer['services']
    body.services = (['chat', 'call', 'video'] as const)
      .filter(t => (patch.pricing && t in patch.pricing) || (patch.services && t in patch.services))
      .filter(t => (pricing[t] ?? 0) > 0 || current?.pricing[t])
      .map(t => ({ type: t, ratePerMinute: pricing[t] ?? 0, isEnabled: !!services[t] && (pricing[t] ?? 0) > 0 }))
  }
  return body
}

export const astrologersDb = createRemoteCollection<Astrologer>({
  list: async () => (await fetchAll<Row>('/admin/panel/astrologers')).map(toAstrologer),
  get: async id => toAstrologer((await loadAstrologerDetail(id)).astrologer),
  create: async item => {
    const detail = await api.post<Row>('/admin/panel/astrologers', { ...astrologerBody(item), email: item.email })
    return toAstrologer(detail.astrologer)
  },
  update: async (id, patch, current) => {
    let row: Astrologer | undefined
    if (patch.status === 'suspended' || (patch.status === 'active' && current?.status === 'suspended')) {
      await api.patch(`/admin/astrologers/${id}/status`, { status: patch.status === 'suspended' ? 'blocked' : 'active' })
    }
    const body = astrologerBody(patch, current)
    if (Object.keys(body).length) row = await patchAstrologer(id, body)
    return row ?? toAstrologer((await loadAstrologerDetail(id, true)).astrologer)
  },
})

export const panditsDb = createRemoteCollection<Pandit>({
  list: async () => (await fetchAll<Row>('/admin/panel/pandits')).map(toPandit),
  get: async id => toPandit((await loadPanditDetail(id)).pandit),
  update: async (id, patch, current) => {
    const body: Row = {}
    for (const k of ['name', 'phone', 'email', 'city', 'experienceYears', 'serviceRadiusKm', 'baseFee', 'languages', 'acceptingBookings'] as const)
      if (k in patch) body[k] = patch[k]
    if (patch.expertise) body.specializations = patch.expertise
    if ('onlinePuja' in patch) body.offersOnlinePuja = patch.onlinePuja
    if (patch.status === 'suspended') body.status = 'blocked'
    if (patch.status === 'active' && current?.status === 'suspended') {
      body.status = 'active'
      if (current.applicationStatus === 'suspended') body.applicationStatus = 'approved'
    }
    if (Object.keys(body).length) return patchPandit(id, body)
    return toPandit((await loadPanditDetail(id, true)).pandit)
  },
})

/** Lookup helpers for joining ids → names in other modules' tables (reads whatever is loaded). */
export const customerName = (id: string) => customersDb.snapshot().find(c => c.id === id)?.name ?? id
export const astrologerName = (id: string) => astrologersDb.snapshot().find(a => a.id === id)?.name ?? id
export const panditName = (id: string) => panditsDb.snapshot().find(p => p.id === id)?.name ?? id

export const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Sanskrit']
