export type RaisedByType = 'customer' | 'astrologer' | 'pandit'
export type TicketCategory = 'payment' | 'refund' | 'consultation' | 'puja booking' | 'order' | 'account' | 'technical' | 'dispute'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in progress' | 'resolved' | 'closed'
export type ReferenceType = 'Booking' | 'Order' | 'Session' | 'Transaction' | 'Withdrawal'

export const TICKET_CATEGORIES: TicketCategory[] = ['payment', 'refund', 'consultation', 'puja booking', 'order', 'account', 'technical', 'dispute']
export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
export const TICKET_STATUSES: TicketStatus[] = ['open', 'in progress', 'resolved', 'closed']
export const RAISED_BY: RaisedByType[] = ['customer', 'astrologer', 'pandit']
export const REFERENCE_TYPES: ReferenceType[] = ['Booking', 'Order', 'Session', 'Transaction', 'Withdrawal']

/** Resolution SLA by priority, in hours. */
export const SLA_HOURS: Record<TicketPriority, number> = { urgent: 8, high: 24, medium: 48, low: 72 }

export interface TicketMessage {
  id: string
  /** `system` = automatic lines in a support chat (welcome, "marked resolved"). */
  from: 'requester' | 'agent' | 'system'
  author: string
  body: string
  at: string
}

export interface TicketNote {
  id: string
  author: string
  body: string
  at: string
}

/** Contact details of whoever raised it (from the ticket detail endpoint). */
export interface Requester {
  name: string
  phone: string
  email: string
  city: string
  code: string
}

export interface Ticket {
  /** Ticket: its Mongo id. Support chat: `chat-<thread id>`. */
  id: string
  /** `ticket` = a filed SupportTicket, `chat` = a support chat thread (same queue). */
  kind: 'ticket' | 'chat'
  /** Display reference: TKT-XXXXXX, or CHAT-XXXXXX for a chat. */
  code: string
  raisedByType: RaisedByType
  raisedById: string // customer / astrologer / pandit id
  raisedByName: string
  requester?: Requester
  channel: 'UserApp chat' | 'Astro app chat' | 'UserApp help' | 'Astro app dispute' | 'Pandit app' | 'Email'
  /** Issue type picked in the astro app "Raise a dispute" form. */
  issueType?: string
  category: TicketCategory
  subject: string
  priority: TicketPriority
  status: TicketStatus
  assigneeId: string | null // admin id
  assigneeName: string | null
  /** Support chats: messages the team has not read yet. */
  unread?: number
  reference?: { type: ReferenceType; id: string }
  slaDueAt: string
  createdAt: string
  updatedAt: string
  firstResponseAt: string | null
  resolvedAt: string | null
  messages: TicketMessage[]
  notes: TicketNote[]
}

export interface CannedResponse {
  id: string
  title: string
  body: string
}

export type InquiryStatus = 'new' | 'contacted' | 'converted' | 'closed'

/** Website contact form submission. */
export interface Inquiry {
  id: string
  reference: string
  name: string
  phone: string
  email: string
  service: string
  message: string
  status: InquiryStatus
  notes: string
  createdAt: string
}

/** Website "Get the app" phone + OTP lead. */
export interface AppLead {
  id: string
  reference: string
  phone: string
  sourcePage: string
  otpVerified: boolean
  /** The download-link SMS: 'sent', or why it was not ('not_configured', 'no_links', 'provider_error'); '' before verify. */
  appLinkSms: string
  status: 'new' | 'contacted' | 'converted'
  notes: string
  createdAt: string
}

export interface Subscriber {
  id: string
  email: string
  subscribedAt: string
  active: boolean
}

/** A team member who can work the queue (Assignee pickers). */
export interface SupportAgent {
  id: string
  name: string
  email: string
  /** Backend role, e.g. support_lead. */
  role: string
}
