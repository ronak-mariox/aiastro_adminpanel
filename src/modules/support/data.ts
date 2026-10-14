import { createRemoteCollection } from '@/lib/store'
import { astrologerName, customerName, panditName } from '@/data'
import {
  createTicket,
  getQueueItem,
  listAgents,
  listLeads,
  listQueue,
  removeLead,
  toAppLead,
  toInquiry,
  toSubscriber,
  updateLead,
  updateQueueItem,
} from './api'
import type { AppLead, CannedResponse, Inquiry, Subscriber, SupportAgent, Ticket } from './types'

// Backed by the admin API — see ./api.ts for the endpoints.

/** Name of whoever raised a ticket (carried on the row; falls back to the loaded partner lists). */
export const requesterName = (t: Pick<Ticket, 'raisedByType' | 'raisedById' | 'raisedByName'>) =>
  t.raisedByName ||
  (t.raisedByType === 'customer' ? customerName(t.raisedById) : t.raisedByType === 'astrologer' ? astrologerName(t.raisedById) : panditName(t.raisedById))

export const cannedResponses: CannedResponse[] = [
  { id: 'greet', title: 'Acknowledge', body: 'Namaste, thank you for contacting VedRashi Support. I am looking into this and will get back to you within a few hours.' },
  { id: 'refund', title: 'Refund initiated', body: 'We have initiated the refund. It will reflect in your VedRashi wallet within 24 hours (or 5–7 working days for bank refunds).' },
  { id: 'wallet', title: 'Wallet credited', body: 'We have credited the amount to your VedRashi wallet. Please refresh the app to see the updated balance.' },
  { id: 'details', title: 'Need more details', body: 'Could you please share a screenshot and the transaction / booking ID so that we can check this quickly?' },
  { id: 'payout', title: 'Payout timeline', body: 'Payouts are processed within 24–48 hours of completion. Your payment has been released and should reach your bank account shortly.' },
  { id: 'escalated', title: 'Escalated', body: 'I have escalated this to our senior team. You will hear from us within 24 hours.' },
  { id: 'resolved', title: 'Resolved', body: 'This has been resolved from our side. If you face any other issue, just reply here — we are happy to help.' },
]

/** Support tickets + support chats in one queue (chat ids are `chat-<threadId>`). */
export const ticketsDb = createRemoteCollection<Ticket>({
  list: listQueue,
  get: (id, current) => getQueueItem(id, current),
  update: (id, patch, current) => updateQueueItem(id, patch, current),
  staleMs: 10_000,
})

/** Admins who can be assigned tickets. */
export const agentsDb = createRemoteCollection<SupportAgent>({ list: listAgents, staleMs: 5 * 60_000 })

export { createTicket }

/** Assignee label for a ticket row. */
export const assigneeLabel = (t: Pick<Ticket, 'assigneeId' | 'assigneeName'>) =>
  t.assigneeId ? (t.assigneeName ?? agentsDb.snapshot().find(a => a.id === t.assigneeId)?.name ?? 'Team member') : 'Unassigned'

/** Leads captured on the website (/admin/leads). */
export const inquiriesDb = createRemoteCollection<Inquiry>({
  list: async () => (await listLeads('inquiry')).map(toInquiry),
  update: async (id, patch) => toInquiry(await updateLead(id, { status: patch.status, notes: patch.notes })),
  remove: async id => {
    await removeLead(id)
  },
})

export const appLeadsDb = createRemoteCollection<AppLead>({
  list: async () => (await listLeads('app')).map(toAppLead),
  update: async (id, patch) => toAppLead(await updateLead(id, { status: patch.status, notes: patch.notes })),
})

export const subscribersDb = createRemoteCollection<Subscriber>({
  list: async () => (await listLeads('newsletter')).map(toSubscriber),
  update: async (id, patch) => toSubscriber(await updateLead(id, { active: patch.active })),
  remove: async id => {
    await removeLead(id)
  },
})

/** Unresolved and past its resolution SLA. */
export const isOverdue = (t: Ticket, now = Date.now()) =>
  (t.status === 'open' || t.status === 'in progress') && new Date(t.slaDueAt).getTime() < now

/** Nav badge: new tickets plus chats with unread messages. */
export const needsAttention = (t: Ticket) => (t.kind === 'chat' ? (t.unread ?? 0) > 0 : t.status === 'open')
