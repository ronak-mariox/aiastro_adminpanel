// Finance module types — ledger, partner payouts, refund requests and pricing config.

export type PartyType = 'customer' | 'astrologer' | 'pandit'

export type TxnType =
  | 'wallet_recharge'
  | 'consultation_debit'
  | 'puja_payment'
  | 'store_payment'
  | 'gift'
  | 'refund'
  | 'payout'
  | 'referral_bonus'
  | 'commission'
  | 'bonus'
  | 'cashback'
  | 'adjustment'
  | 'points_redeem'

/** 'Gateway' = paid through Razorpay with no method recorded (or a Razorpay wallet). */
export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD' | 'Gateway'

export type TxnStatus = 'success' | 'pending' | 'failed'

export interface Transaction {
  id: string // TXN-… / ORD-… / PJB-… / CNS-… / COM-… / WD…
  partyType: PartyType
  partyId: string // Mongo id of the customer / astrologer / pandit
  partyName?: string
  partyCode?: string
  type: TxnType
  method: PaymentMethod
  gatewayRef: string
  amount: number // base amount ₹ (excl. GST)
  gst: number
  status: TxnStatus
  date: string // ISO
  /** Linked consultation / booking / order / payout id. */
  referenceId?: string
  note?: string
  /** Wallet-ledger row id (Mongo) — only rows from WalletTransaction. */
  txnId?: string
  /** Backend wallet type (topup, order_payment …) for wallet rows. */
  walletType?: string
  /** Where the row comes from: wallet ledger, grouped consultation, gateway order/booking, pandit payout, commission. */
  rowSource?: 'wallet' | 'consultation' | 'order' | 'booking' | 'pandit_payout' | 'commission'
  failureReason?: string
  /** What a refund request would be raised against, when the row is a refundable customer payment. */
  refundTarget?: { source: RefundSource; id: string } | null
}

export type PartnerType = 'astrologer' | 'pandit'
export type PayoutMethod = 'bank' | 'upi'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'rejected'

export interface Payout {
  id: string // WDL-… (astrologer) / WD… (pandit)
  /** Withdrawal / PanditWithdrawal Mongo id. */
  mongoId: string
  partnerType: PartnerType
  partnerId: string
  partnerName?: string
  partnerCode?: string
  holderName?: string
  amount: number
  method: PayoutMethod
  /** Masked destination, e.g. "HDFC Bank ••••4521" or "ra•••@okaxis". */
  account: string
  ifsc?: string
  requestedAt: string
  processedAt?: string
  completedAt?: string
  status: PayoutStatus
  utr?: string
  rejectReason?: string
}

export type RefundSource = 'consultation' | 'puja' | 'store'
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed'
export type RefundDestination = 'wallet' | 'original'

/** Facts the refund policy tier is derived from. */
export type PolicyContext =
  | { kind: 'consultation'; scenario: 'cancel'; minutesBefore: number }
  | { kind: 'consultation'; scenario: 'no_show' }
  | { kind: 'puja'; hoursBefore: number }
  | { kind: 'store'; daysSinceDelivery: number }

export interface Refund {
  id: string // RF-… (request) / TXN-… (refund already in the ledger)
  mongoId: string
  /** 'request' = refund-request queue row; 'ledger' = a refund credit made without a request (read-only history). */
  kind: 'request' | 'ledger'
  source: RefundSource
  referenceId: string // chat id / PJB-… / ORD-…
  customerId: string
  customerName?: string
  partnerId?: string
  partnerName?: string
  amountPaid: number
  amountRequested: number
  reason: string
  /** null for ledger rows (no policy facts recorded). */
  context: PolicyContext | null
  status: RefundStatus
  destination: RefundDestination
  /** Original payment method (for "original method" destination). */
  paidVia: PaymentMethod
  requestedAt: string
  approvedAmount?: number
  creditAmount?: number
  decidedAt?: string
  rejectReason?: string
  adminNote?: string
}

export interface RechargePack {
  id: string // RP…
  amount: number
  bonus: number
  popular: boolean
  active: boolean
}

export type PayoutSchedule = 'on_request' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface FinanceConfig {
  id: string
  commission: { chat: number; call: number; video: number; puja: number; store: number }
  gst: { recharge: number; puja: number; store: number }
  pujaFees: { materials: number; travel: number }
  quickAmounts: number[]
  minRecharge: number
  minWithdrawal: number
  payoutSchedule: PayoutSchedule
  payoutDay: string
  tdsPercent: number
  freeFirstSession: boolean
  firstSessionMinutes: number
  firstConsultationPrice: number
  shipping: { freeAbove: number; flatFee: number; codFee: number; returnDays: number }
  updatedAt: string
}
