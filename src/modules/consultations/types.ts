import type { Gender } from '@/data/types'

export type ConsultationType = 'chat' | 'call' | 'video'
/** 'requested' = waiting for the astrologer to accept. */
export type ConsultationStatus = 'requested' | 'ongoing' | 'completed' | 'missed' | 'cancelled' | 'refunded'

export interface IntakeForm {
  name: string
  gender: Gender
  dob: string // ISO date ('' when not given)
  tob: string // "05:30 AM" or "Unknown"
  place: string
  topic: string
  question?: string
}

export interface ChatMessage {
  id?: string
  seq?: number
  from: 'customer' | 'astrologer' | 'system'
  /** Message kind from the API: text | image | gift | system … */
  kind?: string
  text: string
  url?: string
  at: string // ISO
}

export interface GiftSent {
  giftId: string
  name: string
  icon: string
  imageUrl?: string
  price: number
  at: string
}

export interface ConsultationRefund {
  type: 'full' | 'partial'
  amount: number
  reason: string
  at: string
}

export interface AstrologerWarning {
  reason: string
  at: string
}

/** Chat / call / video session between a customer and an astrologer (per-minute billing). */
export interface Consultation {
  id: string // ChatSession id
  /** Short display reference, e.g. CNS-3F9A21. */
  ref: string
  customerId: string
  customerName: string
  customerCode?: string
  astrologerId: string
  astrologerName: string
  type: ConsultationType
  status: ConsultationStatus
  requestedAt: string
  startedAt: string
  endedAt?: string
  /** Billable seconds; for ongoing sessions it is derived live from startedAt. */
  durationSec: number
  ratePerMin: number
  /** Session charges (minutes × rate), excludes gifts. */
  amount: number
  /** Astrologer's share of the session charges as billed. */
  astrologerEarning: number
  commissionPct: number
  /** Gift totals from the session billing (gifts[] is only filled on the detail fetch). */
  giftsAmount: number
  giftsEarning: number
  /** Charges still refundable (ledger charges − every refund so far). */
  refundable: number
  /** Paused time (astrologer away / recharge) excluded from the live timer. */
  pausedMs: number
  endReason?: string
  /** Detail fetch: an earlier transcript page exists. */
  hasMoreMessages?: boolean
  gifts: GiftSent[]
  rating?: number
  review?: string
  intake: IntakeForm
  messages: ChatMessage[]
  flagged: boolean
  flagReason?: string
  cancelReason?: string
  refund?: ConsultationRefund
  warnings: AstrologerWarning[]
}

export interface Gift {
  id: string
  /** Stable slug the apps use for bundled artwork. */
  key?: string
  name: string
  icon: string // emoji
  imageUrl?: string
  price: number
  active: boolean
  sentCount: number
}
