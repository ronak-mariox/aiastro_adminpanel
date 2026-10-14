// Core entities shared by every admin module. Field names follow what the
// UserApp / astroApp / website screens show, so the backend contract can mirror them.

/** '' when the person has not said (real accounts often have no gender on file yet). */
export type Gender = 'Male' | 'Female' | 'Other' | ''
export type AccountStatus = 'active' | 'blocked' | 'suspended'

export interface Customer {
  id: string // USR…
  name: string
  phone: string
  email: string
  gender: Gender
  dob: string // ISO date
  tob: string // "05:30 AM" or "Unknown"
  birthPlace: string
  city: string
  state: string
  walletBalance: number
  rewardPoints: number
  referralCode: string
  totalSpent: number
  consultations: number
  orders: number
  bookings: number
  status: AccountStatus
  joinedAt: string
  lastActiveAt: string
  /** API extras (absent on mock rows). */
  userCode?: string | null
  avatarUrl?: string | null
  blockedReason?: string | null
  loyaltyTier?: string | null
}

export type PartnerStatus = 'active' | 'pending' | 'suspended' | 'rejected'
export type KycStatus = 'verified' | 'pending' | 'rejected'
export type Availability = 'online' | 'busy' | 'offline'

/** Astrologer from the Astro (consultation) app — chat / call / video per-minute. */
export interface Astrologer {
  id: string // AST…
  code: string // "Astro Code" shown on profile, e.g. 2024031009
  name: string
  phone: string
  email: string
  gender: Gender
  experienceYears: number
  languages: string[]
  skills: string[]
  pricing: { chat: number; call: number; video: number } // ₹/min
  rating: number
  reviews: number
  sessions: number
  followers: number
  earnings: number // lifetime gross ₹
  walletBalance: number // withdrawable ₹
  badge?: 'Celebrity' | 'Top Choice' | 'Rising Star'
  availability: Availability
  services: { chat: boolean; call: boolean; video: boolean; live: boolean }
  status: PartnerStatus
  kyc: KycStatus
  city: string
  joinedAt: string
  /** API extras. */
  photoUrl?: string | null
  commissionPct?: number
  /** Raw backend states, for screens that need more than the panel's 4-way status. */
  applicationStatus?: string
  accountStatus?: string
}

/** Pandit from the Pandit (puja booking) app. */
export interface Pandit {
  id: string // PND…
  name: string
  phone: string
  email: string
  city: string
  serviceRadiusKm: number
  experienceYears: number
  languages: string[]
  expertise: string[] // puja types
  baseFee: number
  onlinePuja: boolean
  rating: number
  reviews: number
  bookings: number
  earnings: number
  walletBalance: number
  acceptingBookings: boolean
  status: PartnerStatus
  kyc: KycStatus
  certificates: { name: string; status: 'verified' | 'under review' | 'rejected' }[]
  bank: { bank: string; accountLast4: string; ifsc: string; holder: string }
  joinedAt: string
  /** API extras. */
  photoUrl?: string | null
  code?: string
  applicationStatus?: string
  accountStatus?: string
}
