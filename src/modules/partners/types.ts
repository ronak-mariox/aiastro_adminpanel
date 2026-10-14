import type { Pandit } from '@/data'

export type BankInfo = Pandit['bank']

export type DocStatus = 'verified' | 'pending' | 'rejected'
/** Display label of a filed document ('Aadhaar (front)', 'PAN', 'Certificate', …). */
export type KycDocType = string

export interface KycDocument {
  id: string
  type: KycDocType
  /** Backend document type (aadhaar_front, pan_card, certificate, …). */
  rawType: string
  /** ID number as filed, or '—'. */
  number: string
  fileName: string
  fileUrl: string | null
  mimeType: string | null
  uploadedAt: string
  status: DocStatus
  reason?: string
  /** Pandit certificates. */
  issuer?: string
  year?: string
  /** Partner's note when they asked for a document update. */
  note?: string
}

export interface BankAccount extends BankInfo {
  id: string
  upi: string
  status: DocStatus
  isPrimary: boolean
  proofUrl: string | null
  /** Passbook / cheque scan's name and type (for the thumbnail). */
  proofFile?: string
  proofMime?: string | null
  reason?: string
  submittedAt: string
}

export interface PriceChange {
  id: string
  service: string
  oldRate: number
  requestedRate: number
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  note?: string
  reason?: string
}

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface DaySchedule {
  day: Weekday
  enabled: boolean
  from: string // "10:00"
  to: string // "19:00"
}

export type SessionType = 'chat' | 'call' | 'video'

export interface AstroSession {
  id: string
  customerId: string
  customerName: string
  type: SessionType
  minutes: number
  amount: number
  rating?: number
  status: 'completed' | 'missed' | 'cancelled' | 'active' | 'requested'
  startedAt: string
}

/** Astro-app data that is not part of the shared Astrologer record (GET /admin/panel/astrologers/:id). */
export interface AstrologerProfile {
  id: string
  bio: string
  documents: KycDocument[]
  /** Primary payout account (empty fields when none on file). */
  bank: BankInfo & { upi: string; status?: DocStatus; id?: string }
  bankAccounts: BankAccount[]
  priceChanges: PriceChange[]
  schedule: DaySchedule[]
  availabilityNote: string
  /** Platform commission on gross session revenue. */
  commissionPct: number
  sessions: AstroSession[]
  earnings: {
    gross: number
    net: number
    sessions: number
    balance: number
    pendingWithdrawal: number
    withdrawn: number
    monthly: { month: string; amount: number }[]
  }
  rejectionReason?: string
  blockedReason?: string
}

export interface BlockedDate {
  date: string // YYYY-MM-DD
  reason: string
}

/** Pandit-app data not part of the shared Pandit record (GET /admin/panel/pandits/:id). */
export interface PanditProfile {
  id: string
  address: string
  about: string
  street: string
  pin: string
  state: string
  serviceArea: string
  blockedDates: BlockedDate[]
  completedBookings: number
  cancelledBookings: number
  upcomingBookings: number
  /** Certificates and identity documents on file. */
  documents: KycDocument[]
  pendingBank: (BankInfo & { submittedAt: string }) | null
  earnings: { balance: number; lifetime: number; pendingWithdrawal: number; withdrawn: number }
  rejectionReason?: string
}
