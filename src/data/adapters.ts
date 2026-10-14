// API row → panel record adapters for the shared entities (customers, astrologers, pandits).
// The panel's types are the source of truth; anything the API does not carry gets a neutral default.
import type { Astrologer, Customer, Gender, KycStatus, Pandit, PartnerStatus } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>

export const titleCase = (s?: string | null) =>
  (s ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()

export const toGender = (g?: string | null): Gender => {
  const v = (g ?? '').toLowerCase()
  return v === 'male' ? 'Male' : v === 'female' ? 'Female' : v === 'other' ? 'Other' : ''
}

export const iso = (d?: string | Date | null) => (d ? new Date(d).toISOString() : '')

// ---------------------------------------------------------------- customers

export function toCustomer(r: Row): Customer {
  return {
    id: String(r.id),
    name: r.name || 'Unnamed customer',
    phone: r.phone ?? '',
    email: r.email ?? '',
    gender: toGender(r.gender),
    dob: r.dob ?? '',
    tob: r.tob ?? 'Unknown',
    birthPlace: r.birthPlace ?? '',
    city: r.city ?? '',
    state: r.state ?? '',
    walletBalance: r.walletBalance ?? r.wallet ?? 0,
    rewardPoints: r.rewardPoints ?? 0,
    referralCode: r.referralCode ?? '',
    totalSpent: r.totalSpent ?? r.spent ?? 0,
    consultations: r.consultations ?? r.consults ?? 0,
    orders: r.orders ?? 0,
    bookings: r.bookings ?? 0,
    status: r.status === 'suspended' ? 'suspended' : r.status === 'blocked' ? 'blocked' : 'active',
    joinedAt: iso(r.joinedAt ?? r.joined),
    lastActiveAt: iso(r.lastActiveAt ?? r.lastActive ?? r.joinedAt ?? r.joined),
    userCode: r.userCode ?? null,
    avatarUrl: r.avatarUrl ?? null,
    blockedReason: r.blockedReason ?? null,
    loyaltyTier: r.loyaltyTier ?? null,
  }
}

// -------------------------------------------------------------- astrologers

const PENDING_APPS = ['registered', 'personal_submitted', 'professional_submitted', 'documents_submitted', 'bank_submitted', 'under_review']

export function partnerStatus(applicationStatus?: string, accountStatus?: string): PartnerStatus {
  if (applicationStatus === 'rejected') return 'rejected'
  if (accountStatus && accountStatus !== 'active') return 'suspended'
  if (applicationStatus === 'suspended') return 'suspended'
  if (applicationStatus === 'approved') return 'active'
  if (applicationStatus && PENDING_APPS.includes(applicationStatus)) return 'pending'
  return 'pending'
}

/** Overall KYC from document statuses (approved/verified · pending · rejected). */
export function kycFrom(docs: { status?: string }[] | undefined, approved: boolean): KycStatus {
  if (!docs?.length) return approved ? 'verified' : 'pending'
  if (docs.some(d => d.status === 'rejected')) return 'rejected'
  if (docs.every(d => d.status === 'approved' || d.status === 'verified')) return 'verified'
  return 'pending'
}

/** Backend expertise ids (models/constants.js EXPERTISE) → the labels the panel shows. */
export const ASTRO_EXPERTISE: Record<string, string> = {
  vedic: 'Vedic',
  'krishnamurti-paddhati': 'KP Astrology',
  nadi: 'Nadi',
  numerology: 'Numerology',
  tarot: 'Tarot',
  palmistry: 'Palmistry',
  'face-reading': 'Face Reading',
  vastu: 'Vastu',
  prashna: 'Prashna',
  horary: 'Horary',
  'lal-kitab': 'Lal Kitab',
  muhurat: 'Muhurat',
  'life-coach': 'Life Coach',
}
/** Backend language ids (models/constants.js LANGUAGES). */
export const ASTRO_LANGUAGE_IDS = ['hindi', 'english', 'marathi', 'gujarati', 'bengali', 'tamil', 'telugu', 'kannada', 'punjabi', 'malayalam', 'odia', 'urdu']

export const expertiseLabel = (id: string) => ASTRO_EXPERTISE[id] ?? titleCase(id)
export const expertiseId = (label: string) => Object.entries(ASTRO_EXPERTISE).find(([, l]) => l === label)?.[0] ?? label.toLowerCase().replace(/\s+/g, '-')
export const languageId = (label: string) => label.trim().toLowerCase()

export const BADGE_LABELS: Record<string, NonNullable<Astrologer['badge']>> = { celebrity: 'Celebrity', 'top-choice': 'Top Choice', 'rising-star': 'Rising Star' }
export const badgeId = (badge?: Astrologer['badge']) => (badge ? Object.entries(BADGE_LABELS).find(([, l]) => l === badge)?.[0] : undefined)

/**
 * Accepts the panel row (/admin/panel/astrologers: services[], walletBalance, busy, kyc, city, badges),
 * the compact /admin/astrologers row (rates: { chat: { was, now } }) or a raw Astrologer document.
 */
export function toAstrologer(r: Row): Astrologer {
  const svc = (type: string) => (Array.isArray(r.services) ? r.services.find((s: Row) => s.type === type) : undefined)
  const rate = (type: 'chat' | 'call' | 'video') => {
    const s = svc(type)
    if (s) return Number(s.ratePerMinute ?? 0)
    const fromRates = r.rates?.[type]
    return fromRates ? Number(fromRates.was ?? fromRates.now ?? 0) : 0
  }
  const enabled = (type: string) => (svc(type) ? !!svc(type).isEnabled : !!r.rates?.[type])
  const presence = r.presence ?? {}
  const online = r.online ?? presence.isOnline
  const busy = r.busy ?? presence.isBusy
  const accountStatus = r.accountStatus ?? r.status
  const approved = r.applicationStatus === 'approved'
  const badge = (r.badges ?? []).map((b: string) => BADGE_LABELS[b]).find(Boolean)
  return {
    id: String(r.id ?? r._id),
    code: r.astroCode ?? r.code ?? '',
    name: r.name || r.email || r.phone?.number || r.phone || 'New astrologer',
    phone: typeof r.phone === 'string' ? r.phone : (r.phone?.number ?? ''),
    email: r.email ?? '',
    gender: toGender(r.gender),
    experienceYears: r.experienceYears ?? 0,
    languages: (r.languages ?? []).map(titleCase),
    skills: (r.expertise ?? []).map(expertiseLabel),
    pricing: { chat: rate('chat'), call: rate('call'), video: rate('video') },
    rating: Number(r.rating ?? r.metrics?.rating ?? 0),
    reviews: r.ratingCount ?? r.metrics?.ratingCount ?? 0,
    sessions: r.consultations ?? r.metrics?.totalConsultations ?? 0,
    followers: r.followers ?? 0,
    earnings: typeof r.earnings === 'number' ? r.earnings : (r.earnings?.lifetime ?? 0),
    walletBalance: r.walletBalance ?? r.earnings?.balance ?? 0,
    badge,
    availability: online ? (busy ? 'busy' : 'online') : 'offline',
    services: { chat: enabled('chat'), call: enabled('call'), video: enabled('video'), live: false },
    status: partnerStatus(r.applicationStatus, accountStatus),
    kyc: (r.kyc as KycStatus) ?? kycFrom(r.documents, approved),
    city: r.city ?? r.address?.city ?? '',
    joinedAt: iso(r.joined ?? r.createdAt),
    photoUrl: r.photoUrl ?? null,
    commissionPct: r.commissionPercent,
    applicationStatus: r.applicationStatus,
    accountStatus,
  }
}

// ------------------------------------------------------------------ pandits

const CERT_STATUS: Record<string, Pandit['certificates'][number]['status']> = { approved: 'verified', pending: 'under review', rejected: 'rejected' }
const IDENTITY_DOCS = ['id_proof', 'aadhaar_front', 'aadhaar_back', 'pan_card', 'passport']

/** Accepts the panel row (/admin/panel/pandits: earnings, bank, stats, kyc) or the compact /admin/pandits row. */
export function toPandit(r: Row): Pandit {
  const docs: Row[] = r.documents ?? []
  const bank = r.bank ?? r.bankAccount ?? {}
  const accountStatus = r.accountStatus ?? r.status
  return {
    id: String(r.id),
    name: r.name || r.phone || 'New pandit',
    phone: r.phone ?? '',
    email: r.email ?? '',
    city: r.city ?? '',
    serviceRadiusKm: r.serviceRadiusKm ?? 0,
    experienceYears: r.experienceYears ?? 0,
    languages: r.languages ?? [],
    expertise: r.specializations ?? [],
    baseFee: r.baseFee ?? 0,
    onlinePuja: !!r.offersOnlinePuja,
    rating: Number(r.rating ?? 0),
    reviews: r.ratingCount ?? 0,
    bookings: r.stats?.bookings ?? r.bookings ?? 0,
    earnings: r.earnings?.lifetime ?? r.earnings?.totalEarned ?? r.totalEarned ?? 0,
    walletBalance: r.walletBalance ?? r.earnings?.balance ?? r.available ?? 0,
    acceptingBookings: r.acceptingBookings !== false,
    status: partnerStatus(r.applicationStatus, accountStatus),
    kyc:
      (r.kyc as KycStatus) ??
      kycFrom(
        docs.filter(d => IDENTITY_DOCS.includes(d.type)),
        r.applicationStatus === 'approved',
      ),
    certificates: docs
      .filter(d => d.type === 'certificate')
      .map(d => ({ name: d.title || d.file?.fileName || d.fileName || 'Certificate', status: CERT_STATUS[d.status] ?? 'under review' })),
    bank: {
      bank: bank.bankName ?? '',
      accountLast4: (bank.accountNumber ?? bank.accountLast4 ?? '').slice(-4),
      ifsc: bank.ifsc ?? '',
      holder: bank.holderName ?? '',
    },
    joinedAt: iso(r.createdAt),
    photoUrl: r.photoUrl ?? null,
    code: r.panditCode ?? '',
    applicationStatus: r.applicationStatus,
    accountStatus,
  }
}
