// Records shown on the customer detail page (GET /admin/customers/:id → history, actions).

export type ConsultType = 'chat' | 'call' | 'video'

export interface CustomerConsultation {
  id: string
  astrologerId: string | null
  astrologerName?: string
  type: ConsultType
  startedAt: string
  durationMin: number
  ratePerMin: number
  amount: number
  status: 'completed' | 'cancelled' | 'missed' | 'refunded' | 'ongoing' | 'requested'
  rating?: number
}

export interface CustomerBooking {
  id: string
  reference?: string
  panditId: string | null
  panditName?: string
  puja: string
  scheduledAt: string
  mode: 'home' | 'online'
  amount: number // base + materials + travel + GST
  status: 'upcoming' | 'completed' | 'cancelled'
}

export interface CustomerOrder {
  id: string
  reference?: string
  placedAt: string
  items: string[]
  amount: number
  payment: 'UPI' | 'Card' | 'COD' | 'Wallet'
  status: 'processing' | 'transit' | 'delivered' | 'cancelled'
}

export interface WalletTxn {
  id: string
  customerId: string
  at: string
  kind: 'credit' | 'debit'
  amount: number
  description: string
  /** Set on manual admin adjustments. */
  byAdmin?: boolean
  balanceAfter?: number
}

export interface PointsTxn {
  id: string
  customerId: string
  at: string
  kind: 'credit' | 'debit'
  points: number
  reason: string
}

export interface CustomerReview {
  id: string
  target: 'consultation' | 'puja' | 'product'
  subject: string // astrologer / pandit / product name
  rating: number
  comment: string
  at: string
  status: 'published' | 'hidden'
}

export type AdminActionKind = 'blocked' | 'unblocked' | 'suspended' | 'reactivated' | 'wallet' | 'points' | 'profile' | 'notification'

/** Audit trail of admin actions on a customer (block reasons, adjustments, notifications). */
export interface CustomerAction {
  id: string
  customerId: string
  at: string
  kind: AdminActionKind
  summary: string
  reason?: string
  admin: string
}
