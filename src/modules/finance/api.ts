// Finance module ↔ admin API (backend services/adminPanelFinance.service.js).
//   transactions → GET  /admin/finance/transactions (merged ledger, panel-shaped)
//                  POST /admin/finance/transactions/:id/status { status: 'failed' }  (pending top-ups only)
//   summary      → GET  /admin/finance/summary?days
//   payouts      → GET  /admin/finance/payouts; approve → POST /admin/finance/payouts/:type/:id/approve
//                  astrologer pay/reject → PATCH /admin/withdrawals/:id
//                  pandit pay/reject     → POST /admin/pandits/withdrawals/:reference/(pay|reject)
//   refunds      → GET/POST /admin/finance/refunds, POST …/:id/(approve|reject|process)
//   pricing      → GET/PATCH /admin/finance/pricing, /admin/finance/recharge-packs[/:id]
import { api, fetchAll } from '@/lib/api'
import type { FinanceConfig, PartyType, PaymentMethod, Payout, RechargePack, Refund, Transaction } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/* ---------- names (rows carry them; tables look them up by type + id) ---------- */

const names = new Map<string, string>()
const remember = (type: PartyType, id: string | undefined, name: string | undefined) => {
  if (id && name) names.set(`${type}:${id}`, name)
}
export const cachedName = (type: PartyType, id: string) => names.get(`${type}:${id}`)

/* ---------- transactions ---------- */

export const toTransaction = (r: Row): Transaction => {
  remember(r.partyType, r.partyId, r.partyName)
  return {
    id: String(r.id),
    partyType: r.partyType,
    partyId: String(r.partyId ?? ''),
    partyName: r.partyName,
    partyCode: r.partyCode,
    type: r.type,
    method: r.method,
    gatewayRef: r.gatewayRef ?? '',
    amount: Number(r.amount) || 0,
    gst: Number(r.gst) || 0,
    status: r.status,
    date: r.date,
    referenceId: r.referenceId ?? undefined,
    note: r.note ?? undefined,
    txnId: r.txnId,
    walletType: r.walletType,
    rowSource: r.source,
    failureReason: r.failureReason,
    refundTarget: r.refundTarget ?? null,
  }
}

export const fetchTransactions = async () => (await fetchAll<Row>('/admin/finance/transactions', {}, 3000)).map(toTransaction)

export const markTopUpFailed = (txnId: string, reason?: string) =>
  api.post<{ transaction: Row }>(`/admin/finance/transactions/${txnId}/status`, { status: 'failed', reason })

/* ---------- summary ---------- */

export type SummaryDay = {
  date: string
  volume: number
  topups: number
  topupCount: number
  commission: number
  consultationCommission: number
  panditCommission: number
  astrologerEarnings: number
  panditEarnings: number
  refunds: number
  payouts: number
}
export type FinanceSummary = {
  windowDays: number
  days: SummaryDay[]
  totals: Partial<SummaryDay>
  today: Partial<SummaryDay>
  month: Partial<SummaryDay>
}

export const fetchSummary = (days = 30) => api.get<FinanceSummary>('/admin/finance/summary', { days })

/* ---------- payouts ---------- */

export const toPayout = (r: Row): Payout => {
  remember(r.partnerType, r.partnerId, r.partnerName)
  return {
    id: String(r.id),
    mongoId: String(r.mongoId),
    partnerType: r.partnerType,
    partnerId: String(r.partnerId),
    partnerName: r.partnerName,
    partnerCode: r.partnerCode,
    holderName: r.holderName,
    amount: Number(r.amount) || 0,
    method: r.method === 'upi' ? 'upi' : 'bank',
    account: r.account || '—',
    ifsc: r.ifsc || undefined,
    requestedAt: r.requestedAt,
    processedAt: r.processedAt || undefined,
    completedAt: r.completedAt || undefined,
    status: r.status,
    utr: r.utr || undefined,
    rejectReason: r.rejectReason || undefined,
  }
}

export const fetchPayouts = async () => (await api.list<Row>('/admin/finance/payouts')).data.map(toPayout)

/** pending → processing (no money moves). */
export const approvePayout = (p: Payout) => api.post(`/admin/finance/payouts/${p.partnerType}/${p.mongoId}/approve`)

/** processing → paid with the bank UTR — this is what moves the money. */
export const payPayout = (p: Payout, utr: string) =>
  p.partnerType === 'astrologer'
    ? api.patch(`/admin/withdrawals/${p.mongoId}`, { status: 'approved', payoutReference: utr })
    : api.post(`/admin/pandits/withdrawals/${encodeURIComponent(p.id)}/pay`, { payoutReference: utr })

/** Returns the held amount to the partner's withdrawable balance. */
export const rejectPayout = (p: Payout, reason: string) =>
  p.partnerType === 'astrologer'
    ? api.patch(`/admin/withdrawals/${p.mongoId}`, { status: 'rejected', reason })
    : api.post(`/admin/pandits/withdrawals/${encodeURIComponent(p.id)}/reject`, { reason })

/* ---------- refunds ---------- */

/** Backend `paidVia` ('wallet', 'cod', 'razorpay:upi' …) → panel method label. */
export const paidViaMethod = (v: string | undefined): PaymentMethod => {
  const s = String(v || 'wallet').toLowerCase()
  if (s === 'wallet') return 'Wallet'
  if (s === 'cod') return 'COD'
  const m = s.split(':')[1] || ''
  return m === 'upi' ? 'UPI' : m === 'card' || m === 'emi' ? 'Card' : m === 'netbanking' ? 'NetBanking' : 'Gateway'
}

export const toRefund = (r: Row): Refund => {
  remember('customer', r.customerId, r.customerName)
  if (r.partnerType) remember(r.partnerType, r.partnerId, r.partnerName)
  return {
    id: String(r.id),
    mongoId: String(r.mongoId),
    kind: r.kind === 'ledger' ? 'ledger' : 'request',
    source: r.source,
    referenceId: r.referenceId ?? '',
    customerId: String(r.customerId),
    customerName: r.customerName,
    partnerId: r.partnerId || undefined,
    partnerName: r.partnerName,
    amountPaid: Number(r.amountPaid) || 0,
    amountRequested: Number(r.amountRequested) || 0,
    reason: r.reason ?? '',
    context: r.context ?? null,
    status: r.status,
    destination: r.destination === 'original' ? 'original' : 'wallet',
    paidVia: paidViaMethod(r.paidVia),
    requestedAt: r.requestedAt,
    approvedAmount: r.approvedAmount ?? undefined,
    creditAmount: r.creditAmount ?? undefined,
    decidedAt: r.decidedAt ?? undefined,
    rejectReason: r.rejectReason ?? undefined,
    adminNote: r.adminNote ?? undefined,
  }
}

export const fetchRefunds = async () => (await api.list<Row>('/admin/finance/refunds')).data.map(toRefund)

export const createRefundRequest = async (target: { source: string; id: string }, reason: string) =>
  toRefund((await api.post<{ refund: Row }>('/admin/finance/refunds', { source: target.source, sourceId: target.id, reason })).refund)

export const approveRefund = async (r: Refund, body: { amount: number; credit: number; destination: string; note?: string }) =>
  toRefund((await api.post<{ refund: Row }>(`/admin/finance/refunds/${r.mongoId}/approve`, body)).refund)

export const rejectRefund = async (r: Refund, reason: string) =>
  toRefund((await api.post<{ refund: Row }>(`/admin/finance/refunds/${r.mongoId}/reject`, { reason })).refund)

export const processRefund = async (r: Refund) => toRefund((await api.post<{ refund: Row }>(`/admin/finance/refunds/${r.mongoId}/process`)).refund)

/* ---------- pricing ---------- */

type PricingBody = FinanceConfig & { rechargePacks: RechargePack[] }

export const fetchPricing = async () => (await api.get<{ pricing: PricingBody }>('/admin/finance/pricing')).pricing

export const toConfig = ({ rechargePacks: _packs, ...rest }: PricingBody): FinanceConfig => rest

export const savePricing = async (patch: Partial<FinanceConfig>) => {
  const { id: _id, updatedAt: _u, ...body } = patch
  return (await api.patch<{ pricing: PricingBody }>('/admin/finance/pricing', body)).pricing
}

export const createPack = async (p: Omit<RechargePack, 'id'>) => (await api.post<{ pack: RechargePack }>('/admin/finance/recharge-packs', p)).pack
export const updatePack = async (id: string, patch: Partial<RechargePack>) => {
  const { id: _id, ...body } = patch
  return (await api.patch<{ pack: RechargePack }>(`/admin/finance/recharge-packs/${id}`, body)).pack
}
export const deletePack = (id: string) => api.del(`/admin/finance/recharge-packs/${id}`)
