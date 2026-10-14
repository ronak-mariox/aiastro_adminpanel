// Support module ↔ admin API.
//   tickets  GET  /admin/support-tickets (queue)          GET   /admin/support-tickets/:id (detail + requester)
//            POST /admin/support-tickets (log for someone) PATCH /admin/support-tickets/:id/properties
//            POST /admin/support-tickets/:id/messages      POST/DELETE /admin/support-tickets/:id/notes[/:noteId]
//   chats    GET  /admin/support-desk/threads (queue)      GET   /admin/support-desk/threads/:id (clears unread)
//            PATCH /admin/support-desk/threads/:id         POST  /admin/support-desk/threads/:id/messages
//            POST/DELETE /admin/support-desk/threads/:id/notes[/:noteId]
//   agents   GET  /admin/support-desk/agents
//   leads    GET  /admin/leads?kind=   PATCH/DELETE /admin/leads/:id
// Support chats are shown as tickets with id `chat-<threadId>` in the same queue.
import { api, fetchAll } from '@/lib/api'
import { iso, titleCase, type Row } from '@/data/adapters'
import {
  REFERENCE_TYPES,
  SLA_HOURS,
  type AppLead,
  type Inquiry,
  type RaisedByType,
  type ReferenceType,
  type Requester,
  type Subscriber,
  type SupportAgent,
  type Ticket,
  type TicketCategory,
  type TicketMessage,
  type TicketNote,
  type TicketPriority,
  type TicketStatus,
} from './types'

const CHAT = 'chat-'
export const isChatId = (id: string) => id.startsWith(CHAT)
const threadId = (id: string) => id.slice(CHAT.length)

const RAISED_BY: Record<string, RaisedByType> = { user: 'customer', astrologer: 'astrologer', pandit: 'pandit' }
const PRIORITY: Record<string, TicketPriority> = { low: 'low', normal: 'medium', medium: 'medium', high: 'high', urgent: 'urgent' }
const STATUS: Record<string, TicketStatus> = { open: 'open', in_progress: 'in progress', resolved: 'resolved', closed: 'closed' }
/** App-filed issue types → the panel's categories. */
const ISSUE_CATEGORY: Record<string, TicketCategory> = {
  astrologer: 'consultation',
  puja: 'puja booking',
  product: 'order',
  donation: 'payment',
  payment: 'payment',
  other: 'technical',
}
const THREAD_REF: Record<string, ReferenceType> = { Order: 'Order', PujaBooking: 'Booking', Consultation: 'Session' }

const sla = (createdAt: string, priority: TicketPriority) => new Date(new Date(createdAt).getTime() + SLA_HOURS[priority] * 3_600_000).toISOString()

const toRequester = (r: Row | null | undefined): Requester | undefined =>
  r ? { name: r.name ?? '', phone: r.phone ?? '', email: r.email ?? '', city: r.city ?? '', code: r.code ?? '' } : undefined

const toNote = (n: Row): TicketNote => ({ id: String(n.id ?? n._id), author: n.authorName || 'Admin', body: n.body, at: iso(n.createdAt) })

// ---------------------------------------------------------------- tickets

export function toTicket(t: Row, requester?: Row | null): Ticket {
  const createdAt = iso(t.createdAt)
  const priority = PRIORITY[t.priority] ?? 'medium'
  const raisedByType = RAISED_BY[t.ownerRole] ?? 'customer'
  const name = t.ownerName || requester?.name || titleCase(raisedByType)
  const messages: TicketMessage[] = [{ id: `${t._id}-0`, from: 'requester', author: name, body: t.description ?? '', at: createdAt }]
  for (const m of t.messages ?? []) {
    messages.push({
      id: String(m._id),
      from: m.from === 'agent' ? 'agent' : 'requester',
      author: m.from === 'agent' ? m.authorName || 'Support' : name,
      body: m.body,
      at: iso(m.createdAt),
    })
  }
  // A resolution written through the older PATCH /admin/support-tickets/:id (no message row).
  if (t.resolution && !messages.some(m => m.from === 'agent' && m.body === t.resolution)) {
    messages.push({ id: `${t._id}-resolution`, from: 'agent', author: 'Support', body: t.resolution, at: iso(t.resolvedAt ?? t.updatedAt) })
  }
  const ref: ReferenceType | undefined = REFERENCE_TYPES.find(r => r === t.linkedRef?.type)
  const firstAgent = messages.find(m => m.from === 'agent')
  return {
    id: String(t._id ?? t.id),
    kind: 'ticket',
    code: t.reference ?? '',
    raisedByType,
    raisedById: String(t.owner ?? ''),
    raisedByName: name,
    requester: toRequester(requester),
    channel: t.channel || (raisedByType === 'astrologer' ? 'Astro app dispute' : raisedByType === 'pandit' ? 'Pandit app' : 'UserApp help'),
    issueType: !t.category && t.issueType ? titleCase(t.issueType) : undefined,
    category: (t.category as TicketCategory) || ISSUE_CATEGORY[t.issueType] || 'technical',
    subject: t.subject || (t.description ? String(t.description).split('\n')[0].slice(0, 90) : t.reference),
    priority,
    status: STATUS[t.status] ?? 'open',
    assigneeId: t.assignee ? String(t.assignee) : null,
    assigneeName: t.assigneeName ?? null,
    reference: ref ? { type: ref, id: t.linkedRef.id } : t.chatSession ? { type: 'Session', id: String(t.chatSession) } : undefined,
    slaDueAt: sla(createdAt, priority),
    createdAt,
    updatedAt: iso(t.updatedAt ?? t.createdAt),
    firstResponseAt: t.firstResponseAt ? iso(t.firstResponseAt) : firstAgent && t.resolution ? firstAgent.at : null,
    resolvedAt: t.resolvedAt ? iso(t.resolvedAt) : null,
    messages,
    notes: (t.notes ?? []).map(toNote),
  }
}

// ---------------------------------------------------------------- chats

export function chatToTicket(t: Row, requester?: Row | null): Ticket {
  const createdAt = iso(t.createdAt)
  const priority = PRIORITY[t.priority] ?? 'medium'
  const raisedByType = RAISED_BY[t.ownerRole] ?? 'customer'
  const name = t.ownerName || requester?.name || titleCase(raisedByType)
  const firstResponseAt = t.firstResponseAt ? iso(t.firstResponseAt) : null
  const refType = t.ref?.kind ? THREAD_REF[t.ref.kind] : undefined
  const closed = t.status === 'closed'
  return {
    id: `${CHAT}${t.id}`,
    kind: 'chat',
    code: `CHAT-${String(t.id).slice(-6).toUpperCase()}`,
    raisedByType,
    raisedById: String(t.ownerId ?? ''),
    raisedByName: name,
    requester: toRequester(requester),
    channel: raisedByType === 'astrologer' ? 'Astro app chat' : 'UserApp chat',
    category:
      (t.category as TicketCategory) || (refType === 'Order' ? 'order' : refType === 'Booking' ? 'puja booking' : refType === 'Session' ? 'consultation' : 'account'),
    subject: t.subject || t.lastMessagePreview || 'Support chat',
    priority,
    status: closed ? 'resolved' : firstResponseAt ? 'in progress' : 'open',
    assigneeId: t.assigneeId ?? null,
    assigneeName: t.assigneeName ?? null,
    unread: closed ? 0 : (t.unreadByAgent ?? 0),
    reference: refType ? { type: refType, id: t.ref.id } : undefined,
    slaDueAt: sla(createdAt, priority),
    createdAt,
    updatedAt: iso(t.lastMessageAt ?? t.updatedAt ?? t.createdAt),
    firstResponseAt,
    resolvedAt: closed && t.closedAt ? iso(t.closedAt) : null,
    messages: (t.messages ?? []).map(
      (m: Row): TicketMessage => ({
        id: String(m.id),
        from: m.sender === 'agent' ? 'agent' : m.sender === 'system' ? 'system' : 'requester',
        author: m.sender === 'agent' ? m.agentName || 'Support' : m.sender === 'system' ? 'System' : name,
        body: m.text,
        at: iso(m.createdAt),
      }),
    ),
    notes: (t.notes ?? []).map(toNote),
  }
}

// ---------------------------------------------------------------- queue

export async function listQueue(): Promise<Ticket[]> {
  const [tickets, chats] = await Promise.all([fetchAll<Row>('/admin/support-tickets'), fetchAll<Row>('/admin/support-desk/threads')])
  return [...tickets.map(t => toTicket(t)), ...chats.map(t => chatToTicket(t))].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getQueueItem(id: string, current?: Ticket): Promise<Ticket | undefined> {
  if (isChatId(id)) {
    const d = await api.get<{ thread: Row; requester: Row | null }>(`/admin/support-desk/threads/${threadId(id)}`)
    return chatToTicket(d.thread, d.requester)
  }
  const d = await api.get<{ ticket: Row; requester: Row | null }>(`/admin/support-tickets/${id}`)
  const row = toTicket(d.ticket, d.requester)
  return current?.requester && !row.requester ? { ...row, requester: current.requester } : row
}

/** Status / priority / assignee (and category) — the properties panel. */
export async function updateQueueItem(id: string, patch: Partial<Ticket>, current?: Ticket): Promise<Ticket | undefined> {
  const body: Row = {}
  if (patch.status !== undefined) body.status = patch.status
  if (patch.priority !== undefined) body.priority = patch.priority
  if (patch.category !== undefined) body.category = patch.category
  if ('assigneeId' in patch) body.assigneeId = patch.assigneeId ?? ''
  // Nothing the server stores (e.g. `notes` already saved through addNote): merge the patch locally.
  if (!Object.keys(body).length) return undefined
  if (isChatId(id)) {
    const d = await api.patch<{ thread: Row; requester: Row | null }>(`/admin/support-desk/threads/${threadId(id)}`, body)
    return chatToTicket(d.thread, d.requester)
  }
  const d = await api.patch<{ ticket: Row }>(`/admin/support-tickets/${id}/properties`, body)
  return { ...toTicket(d.ticket), requester: current?.requester }
}

export type NewTicketInput = {
  raisedByType: RaisedByType
  raisedById: string
  category: TicketCategory
  priority: TicketPriority
  subject: string
  body: string
  reference?: { type: ReferenceType; id: string }
  assigneeId?: string
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const d = await api.post<{ ticket: Row; requester: Row | null }>('/admin/support-tickets', { ...input, channel: 'Email' })
  return toTicket(d.ticket, d.requester)
}

/** Agent reply; `resolve` also resolves the ticket / closes the chat. Returns the fresh row. */
export async function sendReply(t: Ticket, text: string, resolve: boolean): Promise<Ticket> {
  if (t.kind === 'chat') {
    const d = await api.post<{ thread: Row; requester: Row | null }>(`/admin/support-desk/threads/${threadId(t.id)}/messages`, { text, resolve })
    return chatToTicket(d.thread, d.requester)
  }
  const d = await api.post<{ ticket: Row }>(`/admin/support-tickets/${t.id}/messages`, { text, resolve })
  return { ...toTicket(d.ticket), requester: t.requester }
}

export async function addNote(t: Ticket, text: string): Promise<TicketNote[]> {
  if (t.kind === 'chat') return (await api.post<{ notes: Row[] }>(`/admin/support-desk/threads/${threadId(t.id)}/notes`, { text })).notes.map(toNote)
  return toTicket((await api.post<{ ticket: Row }>(`/admin/support-tickets/${t.id}/notes`, { text })).ticket).notes
}

export async function removeNote(t: Ticket, noteId: string): Promise<TicketNote[]> {
  if (t.kind === 'chat') return (await api.del<{ notes: Row[] }>(`/admin/support-desk/threads/${threadId(t.id)}/notes/${noteId}`)).notes.map(toNote)
  return toTicket((await api.del<{ ticket: Row }>(`/admin/support-tickets/${t.id}/notes/${noteId}`)).ticket).notes
}

export const listAgents = async (): Promise<SupportAgent[]> =>
  (await api.get<{ items: Row[] }>('/admin/support-desk/agents')).items.map(a => ({ id: String(a.id), name: a.name, email: a.email ?? '', role: a.role ?? '' }))

// ---------------------------------------------------------------- leads

const leadStatus = (s: string) => (['new', 'contacted', 'converted', 'closed'].includes(s) ? s : 'new')

export const toInquiry = (l: Row): Inquiry => ({
  id: String(l.id),
  reference: l.reference ?? '',
  name: l.name || 'Unnamed',
  phone: l.phone ?? '',
  email: l.email ?? '',
  service: l.service || 'General',
  message: l.message ?? '',
  status: leadStatus(l.status) as Inquiry['status'],
  notes: l.notes ?? '',
  createdAt: iso(l.createdAt),
})

export const toAppLead = (l: Row): AppLead => ({
  id: String(l.id),
  reference: l.reference ?? '',
  phone: l.phone ?? '',
  sourcePage: l.sourcePage || '/',
  otpVerified: !!l.otpVerified,
  appLinkSms: l.appLinkSms ?? '',
  status: (l.status === 'closed' ? 'new' : leadStatus(l.status)) as AppLead['status'],
  notes: l.notes ?? '',
  createdAt: iso(l.createdAt),
})

export const toSubscriber = (l: Row): Subscriber => ({ id: String(l.id), email: l.email ?? '', subscribedAt: iso(l.createdAt), active: l.active !== false })

export const listLeads = (kind: 'inquiry' | 'app' | 'newsletter') => fetchAll<Row>('/admin/leads', { kind })

export const updateLead = async (id: string, body: { status?: string; notes?: string; active?: boolean }) =>
  (await api.patch<{ lead: Row }>(`/admin/leads/${id}`, body)).lead

export const removeLead = (id: string) => api.del(`/admin/leads/${id}`)
