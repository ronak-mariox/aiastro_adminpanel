import type { OrderEvent, OrderStatus, Product, ProductStatus } from './types'
import { ordersDb } from './api'

// Live collections (Shree Astro admin API) — see ./api.ts.
export { categoriesDb, ordersDb, productsDb, purposesDb } from './api'

// ---------- Constants (mirror the UserApp shop screens and the API's pricing) ----------

export const PLANETS = ['Sun (Surya)', 'Moon (Chandra)', 'Mars (Mangal)', 'Mercury (Budh)', 'Jupiter (Guru)', 'Venus (Shukra)', 'Saturn (Shani)', 'Rahu', 'Ketu']
export const ZODIACS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
export const MOOLANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const BADGES = ['Bestseller', 'Certified', 'New', 'Lab Tested', 'Energised', 'Limited Stock', 'Trending']
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const COURIERS = ['Delhivery', 'Blue Dart', 'Ekart', 'DTDC', 'Xpressbees', 'Shadowfax', 'India Post']
/** Same arithmetic as the API (models/Order.js totalsFor): 18% tax, ₹49 shipping under ₹999. */
export const GST_RATE = 0.18
export const FREE_SHIPPING_ABOVE = 999
export const SHIPPING_FEE = 49

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  processing: 'Processing',
  packed: 'Packed',
  transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

// ---------- Helpers ----------

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const discountPct = (price: number, mrp: number) => (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0)

export const totalStock = (p: Product) => p.stock

export const productStatus = (p: Product): ProductStatus => (!p.published ? 'draft' : totalStock(p) <= 0 ? 'out of stock' : 'active')

export const orderEvent = (label: string, by: OrderEvent['by'] = 'admin', note?: string): OrderEvent => ({ at: new Date().toISOString(), label, by, note })

/** Orders awaiting dispatch (sidebar pill). */
export const pendingOrderCount = () => ordersDb.snapshot().filter(o => o.status === 'processing' || o.returnRequest?.status === 'requested').length
