export type PujaCategory = 'Prosperity' | 'Health' | 'Marriage' | 'Planets' | 'Housewarming'

/** Puja type / e-puja offered on the app and website. */
export interface Puja {
  id: string
  name: string
  description: string
  imageUrl: string
  /** Bookable start times, e.g. "8:00 AM". */
  timeSlots: string[]
  maxPerSlot: number
  category: PujaCategory
  duration: string // "2 hours"
  people: string // "1–10 people"
  benefits: string[]
  basePrice: number
  samagriPrice: number
  badge?: string
  popular: boolean
  onlineAvailable: boolean
  active: boolean
  rating: number
  bookings: number
}

export type BookingStatus = 'upcoming' | 'en route' | 'arrived' | 'in progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'paid' | 'pending' | 'refunded' | 'partially refunded' | 'failed'
export type BookingMode = 'home' | 'online'

export interface PriceBreakdown {
  base: number
  materials: number
  travel: number
  gst: number
}

export interface BookingCancellation {
  reason: string
  by: 'customer' | 'pandit' | 'admin'
  at: string
  refundPct: number
  refundAmount: number
}

export interface BookingEvent {
  label: string
  at: string
  note?: string
}

export interface Booking {
  id: string // API id
  /** Human booking number, e.g. PJB-8FA21C. */
  reference: string
  customerId: string
  customerName: string
  customerPhone: string
  panditId: string | null
  panditName: string
  panditPhone: string
  pujaId: string
  puja: string
  date: string // yyyy-mm-dd
  slot: string // "09:00 AM"
  mode: BookingMode
  address: string
  city: string
  pincode: string
  price: PriceBreakdown
  total: number
  discount: number
  coupon?: string
  paymentMethod: 'UPI' | 'Card' | 'Wallet' | 'Net Banking'
  paymentStatus: PaymentStatus
  status: BookingStatus
  createdAt: string
  cancellation?: BookingCancellation
  rating?: number
  review?: string
  gotra?: string
  notes?: string
  streamUrl?: string
  adminNote?: string
  /** The pandit's own progress (requested → accepted → en route → …), when a pandit holds it. */
  panditStatus?: string
  history: BookingEvent[]
}

/** A pandit as the assign dialog lists them (GET /admin/pandits). */
export interface AssignablePandit {
  id: string
  name: string
  phone: string
  city: string
  serviceRadiusKm: number
  rating: number
  reviews: number
  experienceYears: number
  baseFee: number
  onlinePuja: boolean
  acceptingBookings: boolean
  /** Puja ids they perform; empty = every active puja. */
  pujaIds: string[]
  timeSlots: string[]
}
