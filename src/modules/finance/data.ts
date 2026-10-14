import { createRemoteCollection } from '@/lib/store'
import { astrologerName, customerName, panditName } from '@/data'
import {
  approvePayout,
  approveRefund,
  cachedName,
  createPack,
  deletePack,
  fetchPayouts,
  fetchPricing,
  fetchRefunds,
  fetchTransactions,
  payPayout,
  processRefund,
  rejectPayout,
  rejectRefund,
  savePricing,
  toConfig,
  updatePack,
} from './api'
import type { FinanceConfig, PartnerType, PartyType, Payout, RechargePack, Refund, RefundSource, Transaction, TxnType } from './types'

/** Name for a party: the name the finance API sent with the row, else the shared (loaded) directories. */
export const partyName = (type: PartyType, id: string) =>
  cachedName(type, id) ?? (type === 'customer' ? customerName(id) : type === 'astrologer' ? astrologerName(id) : panditName(id))

export const partnerName = (type: PartnerType, id: string) => partyName(type, id)

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export const TXN_TYPE_LABEL: Record<TxnType, string> = {
  wallet_recharge: 'Wallet recharge',
  consultation_debit: 'Consultation debit',
  puja_payment: 'Puja payment',
  store_payment: 'Store payment',
  gift: 'Gift',
  refund: 'Refund',
  payout: 'Payout',
  referral_bonus: 'Referral bonus',
  commission: 'Commission',
  bonus: 'Bonus credit',
  cashback: 'Cashback',
  adjustment: 'Manual adjustment',
  points_redeem: 'Points redeemed',
}

/** Money entering the platform via a payment gateway. */
export const INFLOW_TYPES: TxnType[] = ['wallet_recharge', 'puja_payment', 'store_payment']
/** Money leaving the platform. */
export const OUTFLOW_TYPES: TxnType[] = ['refund', 'payout', 'referral_bonus', 'bonus', 'cashback', 'points_redeem']

/** Merged ledger (wallet rows, consultations, gateway orders/bookings, pandit payouts, commission). */
export const transactionsDb = createRemoteCollection<Transaction>({ list: fetchTransactions, staleMs: 15000 })

/* ------------------------------------------------------------------ */
/* Payouts                                                             */
/* ------------------------------------------------------------------ */

export const PAYOUT_REJECT_REASONS = [
  'Bank details mismatch with KYC',
  'Pending dispute on recent session',
  'KYC documents expired',
  'Amount below minimum withdrawal',
]

/**
 * Astrologer + pandit withdrawals. UI patches map onto the API:
 *   { status: 'processing' }            → approve (no money moves)
 *   { status: 'completed', utr }        → pay (balance settles, partner notified)
 *   { status: 'rejected', rejectReason }→ reject (amount back to withdrawable balance)
 */
export const payoutsDb = createRemoteCollection<Payout>({
  list: fetchPayouts,
  staleMs: 10000,
  update: async (id, patch, current) => {
    if (!current) throw new Error('Payout not loaded')
    if (patch.status === 'processing') await approvePayout(current)
    else if (patch.status === 'completed') await payPayout(current, patch.utr ?? '')
    else if (patch.status === 'rejected') await rejectPayout(current, patch.rejectReason ?? '')
    const fresh = (await fetchPayouts()).find(p => p.id === id)
    return fresh ?? { ...current, ...patch }
  },
})


/* ------------------------------------------------------------------ */
/* Refunds                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Refund policy (mirrors website refund & cancellation pages)         */
/* ------------------------------------------------------------------ */

export const SOURCE_LABEL: Record<RefundSource, string> = { consultation: 'Consultation', puja: 'Puja booking', store: 'Store order' }

export type PolicyResult = { tier: string; percent: number; credit: number; amount: number; detail: string }

export function suggestRefund(r: Pick<Refund, 'context' | 'amountPaid'> & { amountRequested?: number }): PolicyResult {
  const c = r.context
  if (!c) {
    // Refund already in the ledger (no request / policy facts recorded).
    const amount = r.amountRequested ?? r.amountPaid
    const percent = r.amountPaid ? Math.round((amount / r.amountPaid) * 100) : 100
    return { tier: 'Refunded (ledger)', percent, credit: 0, amount, detail: 'Refund credited without a request (cancellation, billing or admin refund)' }
  }
  const make = (tier: string, percent: number, detail: string, credit = 0): PolicyResult => ({
    tier,
    percent,
    credit,
    amount: Math.round((r.amountPaid * percent) / 100),
    detail,
  })
  if (c.kind === 'consultation') {
    if (c.scenario === 'no_show') return make('Astrologer no-show', 100, 'Astrologer did not join', 50)
    if (c.minutesBefore > 30) return make('Cancelled > 30 min before', 100, `Cancelled ${c.minutesBefore} min before`)
    if (c.minutesBefore >= 15)
      return make('Cancelled 15–30 min before', 75, `Cancelled ${c.minutesBefore} min before`, Math.round(r.amountPaid * 0.1))
    return make('Cancelled < 15 min before', 50, `Cancelled ${c.minutesBefore} min before`)
  }
  if (c.kind === 'puja') {
    const d = `Cancelled ${c.hoursBefore}h before puja`
    if (c.hoursBefore > 72) return make('Pandit: > 72h before', 100, d)
    if (c.hoursBefore >= 24) return make('Pandit: 24–72h before', 70, d)
    if (c.hoursBefore >= 12) return make('Pandit: < 24h before', 50, d)
    return make('Pandit: same day', 0, d)
  }
  const d = `Return raised ${c.daysSinceDelivery} day${c.daysSinceDelivery === 1 ? '' : 's'} after delivery`
  return c.daysSinceDelivery <= 7 ? make('Store: within 7-day return', 100, d) : make('Store: outside return window', 0, d)
}

export const POLICY_TIERS: { source: RefundSource; title: string; rows: [string, string][] }[] = [
  {
    source: 'consultation',
    title: 'Consultations',
    rows: [
      ['Cancelled > 30 min before', '100% refund'],
      ['Cancelled 15–30 min before', '75% + 10% wallet credit'],
      ['Cancelled < 15 min before', '50% refund'],
      ['Astrologer no-show', '100% + ₹50 credit'],
    ],
  },
  {
    source: 'puja',
    title: 'Pandit / Puja bookings',
    rows: [
      ['> 72 hours before', '100% refund'],
      ['24–72 hours before', '70% refund'],
      ['< 24 hours before', '50% refund'],
      ['Same day (< 12h)', 'No refund'],
    ],
  },
  {
    source: 'store',
    title: 'AstroVati store',
    rows: [
      ['Within 7 days of delivery', '100% on return'],
      ['After 7 days', 'Not eligible'],
      ['Shipping', 'Free above ₹999'],
    ],
  },
]

/**
 * Refund-request queue + refunds already in the ledger. UI patches map onto the API:
 *   { status: 'approved', approvedAmount, creditAmount, destination, adminNote } → approve
 *   { status: 'rejected', rejectReason } → reject
 *   { status: 'processed' }              → process (the only step that moves money)
 */
export const refundsDb = createRemoteCollection<Refund>({
  list: fetchRefunds,
  staleMs: 10000,
  update: async (_id, patch, current) => {
    if (!current) throw new Error('Refund not loaded')
    if (patch.status === 'approved')
      return approveRefund(current, {
        amount: patch.approvedAmount ?? 0,
        credit: patch.creditAmount ?? 0,
        destination: patch.destination ?? current.destination,
        note: patch.adminNote,
      })
    if (patch.status === 'rejected') return rejectRefund(current, patch.rejectReason ?? '')
    if (patch.status === 'processed') return processRefund(current)
    throw new Error('Unsupported refund change')
  },
})

/* ------------------------------------------------------------------ */
/* Pricing & fees config                                               */
/* ------------------------------------------------------------------ */

export const FINANCE_CONFIG_ID = 'default'

/** Pricing & fees: Settings (commission default, recharge/payout limits, cycle) + the finance config document. */
export const financeConfigDb = createRemoteCollection<FinanceConfig>({
  list: async () => [toConfig(await fetchPricing())],
  update: async (_id, patch) => toConfig(await savePricing(patch)),
})

export const rechargePacksDb = createRemoteCollection<RechargePack>({
  list: async () => (await fetchPricing()).rechargePacks,
  create: async ({ id: _id, ...pack }) => createPack(pack),
  update: async (id, patch) => updatePack(id, patch),
  remove: async id => {
    await deletePack(id)
  },
})
