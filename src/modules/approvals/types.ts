import type { PartnerType, ServiceRate } from '../partners/actions'
import type { BankAccount, BankInfo, DaySchedule, KycDocument } from '../partners/types'

/** One dated milestone of an application (registered, KYC uploaded, submitted, decided). */
export type TimelineEvent = { key: string; label: string; at: string }

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
/** What the backend actually queues for a decision (GET /admin/panel/approvals). */
export type ApprovalKind = 'onboarding' | 'price' | 'bank' | 'certificate' | 'document'

interface ApprovalBase {
  /** Backend row id, e.g. "prc-<requestId>". */
  id: string
  /** Short reference shown in the table. */
  ref: string
  partnerType: PartnerType
  partnerId: string
  /** Name at load time. */
  partnerName: string
  partnerCode?: string
  photoUrl?: string | null
  submittedAt: string
  status: ApprovalStatus
  reviewedAt?: string
  reviewedBy?: string
  /** Rejection reason / approval note. */
  reason?: string
  /** Partner's own note from the app. */
  note?: string
}

export type BankView = BankInfo & { upi?: string }

export type ApprovalPayload =
  | {
      kind: 'onboarding'
      applicationStatus: string
      experienceYears: number
      city: string
      languages: string[]
      expertise: string[]
      gender?: string
      email: string
      phone: string
      about: string
      availabilityNote?: string
      /** Astrologer: commission and the rates they filed (pre-fill the approve form). */
      commissionPercent?: number
      services: ServiceRate[]
      /** Pandit listing basics. */
      baseFee?: number
      serviceRadiusKm?: number
      onlinePuja?: boolean
      documents: KycDocument[]
      bankAccounts: BankAccount[]
      bank?: BankView | null
      /** Astrologer: the weekly hours filed in the app's Availability step. */
      schedule: DaySchedule[]
      /** Astrologer: astroApp wizard steps (kyc, profile, pricing, bank, availability). */
      steps: { key: string; done: boolean }[]
      /** Pandit: service area / state / street + PIN from the Service Area step. */
      serviceArea?: string
      state?: string
      address?: string
      timeline: TimelineEvent[]
    }
  | { kind: 'price'; requestId: string; service: string; currentRate: number; requestedRate: number; offerPercent: number; applyToAll: boolean }
  | { kind: 'bank'; accountId?: string; oldBank: BankView | null; newBank: BankView; proofUrl: string | null; proofFile: string }
  | ({ kind: 'certificate' | 'document'; documentId: string; docType: string } & Pick<KycDocument, 'rawType' | 'number' | 'fileName' | 'fileUrl' | 'mimeType' | 'issuer' | 'year'>)

export type Approval = ApprovalBase & ApprovalPayload
