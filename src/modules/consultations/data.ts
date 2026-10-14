import { createRemoteCollection } from '@/lib/store'
import { archiveGift, createGift, getConsultation, listConsultations, listGifts, updateGift } from './api'
import type { Consultation, Gift } from './types'

export { TOPICS } from './api'

/** Consultations from /admin/consultation-sessions; `get` fetches the detail (transcript, gifts, refunds). */
export const consultationsDb = createRemoteCollection<Consultation>({
  list: listConsultations,
  get: (id, current) => getConsultation(id, current),
  // Local-only merge (e.g. earlier transcript pages); real changes go through ./api and re-fetch.
  update: async () => undefined,
  staleMs: 10_000,
})

/** Gift catalogue: /admin/consultation-gifts (with times sent) + /admin/gifts CRUD. */
export const giftsDb = createRemoteCollection<Gift>({
  list: listGifts,
  create: createGift,
  update: (id, patch, current) => updateGift(id, patch, current),
  remove: archiveGift,
})
