// AstroVati store — product catalogue + customer orders.
// The page shapes; ./api.ts maps them to the Shree Astro admin API (/admin/products, /admin/orders).

export type ProductStatus = 'active' | 'draft' | 'out of stock'

export interface ProductVariant {
  id: string
  name: string // e.g. "Silver", "5.25 Ratti", "18mm - 22mm"
  price: number
  stock: number
}

export interface ProductSpec {
  key: string // e.g. "Material", "Bead Size"
  value: string
}

export interface ProductFaq {
  q: string
  a: string
}

/** Buyer's choices on the product page (none change the price) — `options` in the API. */
export interface ProductOptions {
  types: string[]
  sizes: string[]
  materials: string[]
}

/** A titled list of points on the product page ("Care", "What's in the box"). */
export interface ProductInfoSection {
  title: string
  items: string[]
}

export interface Product {
  id: string // PRD…
  name: string
  slug: string
  category: string
  purposes: string[]
  shortDescription: string
  description: string
  price: number // selling price ₹
  mrp: number // strike-through ₹
  sku: string
  stock: number
  lowStockAt: number
  /** Kept for older call sites; always empty — the store has options, not priced variants. */
  variants: ProductVariant[]
  options: ProductOptions
  benefits: string[]
  specs: ProductSpec[]
  howToWear: string
  bestDay: string
  faqs: ProductFaq[]
  planet: string
  zodiac: string[]
  moolank: number[]
  /** The stone's own name ("Neelam (Blue Sapphire)") — the Stone filter. */
  stoneName: string
  badges: string[]
  /** Short chips on the product page ("Lab certified"). */
  benefitTags: string[]
  infoSections: ProductInfoSection[]
  images: string[]
  videoUrl: string
  /** Display-only promo ("Extra 10% OFF") and its countdown end (ISO or ''). */
  extraOffPct: number
  offerEndsAt: string
  featured: boolean
  seoTitle: string
  seoDescription: string
  published: boolean
  rating: number
  reviews: number
  sold: number
  createdAt: string
  updatedAt: string
}

/** Shop-by-category / shop-by-purpose entries (managed lists). */
export interface Taxonomy {
  /** The API key (lowercase-kebab, e.g. 'evil-eye') products store. */
  id: string
  name: string
  description: string
  active: boolean
  order: number
}

export type OrderStatus = 'processing' | 'packed' | 'transit' | 'delivered' | 'cancelled' | 'returned'
export type PaymentMethod = 'COD' | 'UPI' | 'Card' | 'Wallet'
export type PaymentStatus = 'paid' | 'pending' | 'refunded' | 'failed' | 'cancelled'

export interface OrderItem {
  productId: string
  imageUrl?: string
  name: string
  variant?: string
  qty: number
  price: number // unit price ₹
  gift?: boolean // free gift line (e.g. 5 Mukhi Rudraksha bead)
}

export interface ShippingAddress {
  name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  tag: 'Home' | 'Work'
}

export interface ReturnRequest {
  reason: string
  comment: string
  requestedAt: string
  status: 'requested' | 'approved' | 'rejected'
  resolvedAt?: string
  note?: string
}

export interface OrderEvent {
  at: string
  label: string
  note?: string
  by: 'customer' | 'admin' | 'system' | 'courier'
}

export interface Order {
  id: string // API id
  /** Human order number, e.g. ORD-8FA21C. */
  reference: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  discount: number
  coupon?: string
  shipping: number
  gst: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: OrderStatus
  courier?: string
  awb?: string
  address: ShippingAddress
  placedAt: string
  packedAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelReason?: string
  refundAmount?: number
  returnRequest?: ReturnRequest
  activity: OrderEvent[]
}
