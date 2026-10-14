import { useEffect, useSyncExternalStore } from 'react'
import { loadAstrologerDetail, loadPanditDetail } from '@/data'
import { ASTRO_EXPERTISE, ASTRO_LANGUAGE_IDS, titleCase, type Row } from '@/data/adapters'
import { fileUrl } from '@/lib/api'
import type { AstrologerProfile, AstroSession, BankAccount, DaySchedule, DocStatus, KycDocument, PanditProfile, PriceChange, Weekday } from './types'

// ---------- option lists (match the backend's enums) ----------

/** models/constants.js EXPERTISE, as labels. */
export const ASTRO_SKILLS = Object.values(ASTRO_EXPERTISE)

/** models/constants.js LANGUAGES, as labels (the astrologer app's language list). */
export const ASTRO_LANGUAGES = ASTRO_LANGUAGE_IDS.map(titleCase)

export const PUJA_TYPES = [
  'Satyanarayan Puja', 'Griha Pravesh', 'Lakshmi Puja', 'Navgraha Puja', 'Rudrabhishek', 'Vastu Puja',
  'Kaal Sarp Dosh', 'Vivah Puja', 'Namkaran', 'Mundan', 'Havan', 'Vedic Rituals',
]

export const CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Indore',
  'Varanasi', 'Lucknow', 'Ujjain', 'Haridwar',
]

export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda']

export const BADGES = ['Celebrity', 'Top Choice', 'Rising Star'] as const

export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---------- API → panel adapters ----------

const DOC_LABELS: Record<string, string> = {
  id_proof: 'ID proof',
  aadhaar_front: 'Aadhaar (front)',
  aadhaar_back: 'Aadhaar (back)',
  pan_card: 'PAN',
  passport: 'Passport',
  certificate: 'Certificate',
  award: 'Award proof',
  bank_proof: 'Bank proof',
  photo: 'Photo',
  other: 'Other document',
}
export const docLabel = (type: string) => DOC_LABELS[type] ?? titleCase(type)
export const docStatus = (s?: string): DocStatus => (s === 'approved' || s === 'verified' ? 'verified' : s === 'rejected' ? 'rejected' : 'pending')
const iso = (d?: string | null) => (d ? new Date(d).toISOString() : '')

export function toKycDocument(d: Row): KycDocument {
  return {
    id: String(d.id ?? d._id),
    type: d.title || docLabel(d.type),
    rawType: d.type,
    number: d.idNumber || '—',
    fileName: d.file?.fileName || (d.file?.url ? String(d.file.url).split('/').pop() : '') || 'No file attached',
    fileUrl: d.file?.url ? fileUrl(d.file.url) : null,
    mimeType: d.file?.mimeType ?? null,
    uploadedAt: iso(d.uploadedAt ?? d.updatedAt ?? d.createdAt),
    status: docStatus(d.status),
    reason: d.rejectionReason || undefined,
    issuer: d.issuer || undefined,
    year: d.year || undefined,
    note: d.updateNote || undefined,
  }
}

export function toBankAccount(b: Row): BankAccount {
  return {
    id: String(b.id),
    bank: b.bankName || (b.upiId ? 'UPI only' : '—'),
    accountLast4: b.accountLast4 ?? '',
    ifsc: b.ifsc ?? '',
    holder: b.holderName ?? '',
    upi: b.upiId ?? '',
    status: docStatus(b.status),
    isPrimary: !!b.isPrimary,
    proofUrl: b.proof?.url ? fileUrl(b.proof.url) : null,
    proofFile: b.proof?.fileName || (b.proof?.url ? 'Passbook / cheque' : undefined),
    proofMime: b.proof?.mimeType ?? null,
    reason: b.rejectionReason || undefined,
    submittedAt: iso(b.submittedAt),
  }
}

const DAY_FROM_API: Record<string, Weekday> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export function toSchedule(slots: Row[] | undefined): DaySchedule[] {
  return WEEKDAYS.map(day => {
    const s = (slots ?? []).find(x => DAY_FROM_API[x.day] === day)
    return { day, enabled: !!s?.enabled, from: s?.from ?? '10:00', to: s?.to ?? '19:00' }
  })
}

const SESSION_TYPES = ['chat', 'call', 'video'] as const

export function toAstroProfile(d: Row): AstrologerProfile {
  const a = d.astrologer ?? {}
  const accounts = (d.bankAccounts ?? []).map(toBankAccount) as BankAccount[]
  const primary = accounts.find(x => x.isPrimary) ?? accounts.find(x => x.status === 'verified') ?? accounts[0]
  const e = d.earnings ?? {}
  return {
    id: String(a.id),
    bio: a.about ?? '',
    documents: (d.documents ?? []).map(toKycDocument),
    bank: primary
      ? { id: primary.id, bank: primary.bank, accountLast4: primary.accountLast4, ifsc: primary.ifsc, holder: primary.holder, upi: primary.upi, status: primary.status }
      : { bank: '', accountLast4: '', ifsc: '', holder: '', upi: '' },
    bankAccounts: accounts,
    priceChanges: (d.priceChangeRequests ?? []).map(
      (r: Row): PriceChange => ({
        id: String(r.id),
        service: r.service,
        oldRate: r.oldRate,
        requestedRate: r.requestedRate,
        status: r.status,
        requestedAt: iso(r.requestedAt),
        note: r.reason || undefined,
        reason: r.rejectionReason || undefined,
      }),
    ),
    schedule: toSchedule(a.availability),
    availabilityNote: a.availabilityNote ?? '',
    commissionPct: a.commissionPercent ?? 25,
    sessions: (d.sessions ?? []).map(
      (s: Row): AstroSession => ({
        id: String(s.id),
        customerId: s.customerId ?? '',
        customerName: s.customerName || 'Customer',
        type: (SESSION_TYPES as readonly string[]).includes(s.channel) ? s.channel : 'chat',
        minutes: s.minutes ?? 0,
        amount: s.amount ?? 0,
        rating: s.rating ?? undefined,
        status: s.status,
        startedAt: iso(s.startedAt),
      }),
    ),
    earnings: {
      gross: e.gross ?? 0,
      net: e.net ?? 0,
      sessions: e.sessions ?? 0,
      balance: e.balance ?? 0,
      pendingWithdrawal: e.pendingWithdrawal ?? 0,
      withdrawn: e.withdrawn ?? 0,
      monthly: (e.monthly ?? []).map((m: Row) => ({ month: m.month, amount: m.gross ?? 0 })),
    },
    rejectionReason: a.rejectionReason || undefined,
    blockedReason: a.blockedReason || undefined,
  }
}

export function toPanditProfile(d: Row): PanditProfile {
  const p = d.pandit ?? d
  const pending = p.pendingBank
  return {
    id: String(p.id),
    about: p.about ?? '',
    street: p.address?.street ?? '',
    pin: p.address?.pin ?? '',
    state: p.state ?? '',
    serviceArea: p.serviceArea ?? '',
    address: [p.address?.street, p.serviceArea, p.city, p.state, p.address?.pin].filter(Boolean).join(', '),
    blockedDates: (p.blocked ?? (p.blockedDates ?? []).map((date: string) => ({ date, reason: '' }))).map((b: Row) => ({ date: b.date, reason: b.reason ?? '' })),
    completedBookings: p.stats?.completed ?? 0,
    cancelledBookings: p.stats?.cancelled ?? 0,
    upcomingBookings: p.stats?.upcoming ?? 0,
    documents: (p.documents ?? []).map(toKycDocument),
    pendingBank: pending
      ? { bank: pending.bankName ?? '', accountLast4: pending.accountLast4 ?? '', ifsc: pending.ifsc ?? '', holder: pending.holderName ?? '', submittedAt: iso(pending.submittedAt) }
      : null,
    earnings: {
      balance: p.earnings?.balance ?? 0,
      lifetime: p.earnings?.lifetime ?? 0,
      pendingWithdrawal: p.earnings?.pendingWithdrawal ?? 0,
      withdrawn: p.earnings?.withdrawn ?? 0,
    },
    rejectionReason: p.rejectionReason || undefined,
  }
}

// ---------- per-id detail stores (shared by every tab/card on a partner page) ----------

function createDetailStore<T>(load: (id: string, fresh: boolean) => Promise<T>) {
  const data = new Map<string, T>()
  const errors = new Map<string, unknown>()
  const listeners = new Set<() => void>()
  let version = 0
  const emit = () => {
    version++
    listeners.forEach(l => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
  const fetch = async (id: string, fresh = false) => {
    try {
      const value = await load(id, fresh)
      data.set(id, value)
      errors.delete(id)
      emit()
      return value
    } catch (e) {
      errors.set(id, e)
      emit()
      throw e
    }
  }
  function use(id: string | undefined) {
    useSyncExternalStore(subscribe, () => version)
    useEffect(() => {
      if (id) fetch(id).catch(() => undefined)
    }, [id])
    return { record: id ? data.get(id) : undefined, error: id ? errors.get(id) : undefined, loading: !!id && !data.has(id) && !errors.has(id) }
  }
  return { fetch, use }
}

/** Astro-app-only profile data (KYC docs, bank accounts, price changes, schedule, sessions, earnings). */
export const astroProfiles = createDetailStore(async (id, fresh) => toAstroProfile(await loadAstrologerDetail(id, fresh)))
export const useAstroProfile = (id: string | undefined) => astroProfiles.use(id)

/** Pandit-app-only profile data (address, blocked dates, booking split, documents, pending bank). */
export const panditProfiles = createDetailStore(async (id, fresh) => toPanditProfile(await loadPanditDetail(id, fresh)))
export const usePanditProfile = (id: string | undefined) => panditProfiles.use(id)
