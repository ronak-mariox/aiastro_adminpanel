import { astrologersDb, panditsDb, patchAstrologer, patchPandit } from '@/data'
import { api } from '@/lib/api'
import { approvalsDb } from '../approvals/data'
import { astroProfiles, panditProfiles } from './data'
import type { BankInfo, DaySchedule } from './types'

// Partner mutations shared by the partner pages and the approvals queue, so an action
// has the same effect (and refreshes the same views) wherever the admin performs it.

export type PartnerType = 'astrologer' | 'pandit'
export type Decision = 'approved' | 'rejected'
export type ServiceRate = { type: 'chat' | 'call' | 'video'; ratePerMinute: number; isEnabled: boolean }

/** Re-fetch everything that shows this partner: detail stores, the shared row, the approvals queue. */
export async function refreshPartner(type: PartnerType, id: string) {
  if (type === 'astrologer') {
    await astroProfiles.fetch(id, true).catch(() => undefined)
    await astrologersDb.load?.(id).catch(() => undefined)
  } else {
    await panditProfiles.fetch(id, true).catch(() => undefined)
    await panditsDb.load?.(id).catch(() => undefined)
  }
  void approvalsDb.refresh?.().catch(() => undefined)
}

// ---------- onboarding ----------

/** POST /admin/astrologers/:id/approve — mints the astro code and sets the opening rates. */
export async function approveAstrologer(id: string, body: { commissionPercent: number; services: ServiceRate[] }) {
  await api.post(`/admin/astrologers/${id}/approve`, body)
  await refreshPartner('astrologer', id)
}

/** POST /admin/pandits/:id/approve — listed in the directory from now on. */
export async function approvePandit(id: string) {
  await api.post(`/admin/pandits/${id}/approve`, {})
  await refreshPartner('pandit', id)
}

export async function rejectOnboarding(type: PartnerType, id: string, reason?: string) {
  await api.post(`/admin/${type === 'astrologer' ? 'astrologers' : 'pandits'}/${id}/reject`, { reason: reason || undefined })
  await refreshPartner(type, id)
}

/** Moves a rejected application back to "under review". */
export async function reopenApplication(type: PartnerType, id: string) {
  if (type === 'astrologer') await patchAstrologer(id, { applicationStatus: 'under_review' })
  else await patchPandit(id, { applicationStatus: 'under_review' })
  await refreshPartner(type, id)
}

/** Suspend (block) / reactivate an account. */
export async function setPartnerSuspended(type: PartnerType, id: string, suspended: boolean, reason?: string) {
  if (type === 'astrologer') {
    await api.patch(`/admin/astrologers/${id}/status`, { status: suspended ? 'blocked' : 'active', reason: reason || undefined })
  } else {
    const current = panditsDb.snapshot().find(p => p.id === id)
    await patchPandit(id, {
      status: suspended ? 'blocked' : 'active',
      ...(suspended ? { acceptingBookings: false } : current?.applicationStatus === 'suspended' ? { applicationStatus: 'approved' } : {}),
    })
  }
  await refreshPartner(type, id)
}

// ---------- documents / certificates ----------

/** Approve or reject one filed document (KYC scan or certificate). */
export async function reviewDocument(type: PartnerType, id: string, documentId: string, decision: Decision | 'pending', reason?: string) {
  const base = type === 'astrologer' ? 'astrologers' : 'pandits'
  await api.patch(`/admin/${base}/${id}/documents/${documentId}`, { status: decision, reason: decision === 'rejected' ? reason || undefined : undefined })
  await refreshPartner(type, id)
}

// ---------- pricing ----------

/** PATCH /admin/astrologers/:id/price-changes/:reqId — approving writes the new rate. */
export async function reviewPriceChange(id: string, requestId: string, decision: Decision, reason?: string) {
  await api.patch(`/admin/astrologers/${id}/price-changes/${requestId}`, { status: decision, reason: reason || undefined })
  await refreshPartner('astrologer', id)
}

/** Admin rate/service edit (PATCH /admin/panel/astrologers/:id). */
export async function setAstroServices(id: string, services: ServiceRate[]) {
  await patchAstrologer(id, { services })
  await refreshPartner('astrologer', id)
}

export async function setCommission(id: string, commissionPercent: number) {
  await patchAstrologer(id, { commissionPercent })
  await refreshPartner('astrologer', id)
}

const DAY_TO_API: Record<DaySchedule['day'], string> = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' }

export async function setSchedule(id: string, schedule: DaySchedule[]) {
  await patchAstrologer(id, { availability: schedule.map(d => ({ day: DAY_TO_API[d.day], enabled: d.enabled, from: d.from, to: d.to })) })
  await refreshPartner('astrologer', id)
}

// ---------- bank ----------

/** Approve/reject an astrologer's filed payout account; an approved change becomes the primary account. */
export async function reviewAstroBank(id: string, accountId: string, decision: Decision, reason?: string) {
  await api.patch(`/admin/astrologers/${id}/bank-accounts/${accountId}`, { status: decision, reason: reason || undefined })
  if (decision === 'approved') await patchAstrologer(id, { primaryBankAccountId: accountId })
  await refreshPartner('astrologer', id)
}

/** Approve/reject a pandit's pending bank change (POST /admin/pandits/:id/bank-account/approve|reject). */
export async function reviewPanditBank(id: string, decision: Decision, reason?: string) {
  await api.post(`/admin/pandits/${id}/bank-account/${decision === 'approved' ? 'approve' : 'reject'}`, { reason: reason || undefined })
  await refreshPartner('pandit', id)
}

/** The admin enters a payout account themselves (filed as verified). */
export async function setBank(type: PartnerType, id: string, bank: BankInfo & { upi?: string; accountNumber: string }) {
  if (type === 'astrologer') {
    await api.put(`/admin/panel/astrologers/${id}/bank-account`, {
      holderName: bank.holder,
      bankName: bank.bank,
      accountNumber: bank.accountNumber,
      ifsc: bank.ifsc,
      upiId: bank.upi || undefined,
    })
  } else {
    await patchPandit(id, { bankAccount: { holderName: bank.holder, bankName: bank.bank, accountNumber: bank.accountNumber, ifsc: bank.ifsc } })
  }
  await refreshPartner(type, id)
}

// ---------- pandit calendar ----------

export async function setPanditBlocked(id: string, blocked: { date: string; reason: string }[]) {
  await patchPandit(id, { blocked })
  await refreshPartner('pandit', id)
}
