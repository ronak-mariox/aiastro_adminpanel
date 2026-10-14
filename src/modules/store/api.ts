// Store ↔ Shree Astro admin API.
//   products   GET/POST /admin/products, PUT /admin/products/:id, PATCH …/status, DELETE (archives)
//   orders     GET /admin/orders[/:id], PATCH /admin/orders/:id/status, PATCH /admin/orders/:id/shipment
//   shelves    GET/PUT /admin/site-content/shop-categories | shop-purposes
// The pages keep their own shapes (./types.ts); everything API-shaped stays in this file.

import { api } from '@/lib/api'
import { createContentListCollection, createRemoteCollection, fetchAll } from '@/lib/remoteCollection'
import type { Order, OrderEvent, OrderStatus, PaymentMethod, PaymentStatus, Product, Taxonomy } from './types'

// ---------------------------------------------------------------- API shapes

type SProduct = {
  id: string
  slug: string
  name: string
  category: string
  badge?: string | null
  badges?: string[]
  description?: string | null
  shortDescription?: string | null
  highlights?: string[]
  imageUrl?: string | null
  images?: string[]
  price: number
  oldPrice?: number | null
  stock: number
  sku?: string | null
  rating?: number
  ratingCount?: number
  isFeatured?: boolean
  stoneName?: string | null
  planet?: string | null
  zodiac?: string[]
  moolank?: number[]
  purposes?: string[]
  benefitTags?: string[]
  options?: { types?: string[]; sizes?: string[]; materials?: string[] }
  infoSections?: { title: string; items: string[] }[]
  specifications?: { key: string; value: string }[]
  faqs?: { question: string; answer: string }[]
  videoUrl?: string | null
  extraOffPct?: number
  offerEndsAt?: string | null
  soldCount?: number
  status: 'active' | 'hidden' | 'archived'
  lowStockAt?: number
  seoTitle?: string | null
  seoDescription?: string | null
  createdAt: string
  updatedAt: string
}

type SOrder = {
  id: string
  reference: string
  user?: { id: string; name?: string; phone?: string; email?: string } | string | null
  items: { product?: { id: string; slug?: string; name?: string; imageUrl?: string } | string; name: string; imageUrl?: string; price: number; qty: number; lineTotal: number; options?: { type?: string; size?: string; material?: string } }[]
  subtotal: number
  tax: number
  shippingFee: number
  discount?: number
  couponCode?: string | null
  total: number
  status: 'pending_payment' | 'placed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
  payment?: { method?: 'wallet' | 'razorpay' | 'cod'; status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'; collectedAt?: string; gateway?: { method?: string } }
  shipping?: { fullName?: string; phone?: string; email?: string; address?: string; city?: string; state?: string; pincode?: string }
  shipment?: { courier?: string; awb?: string; updatedAt?: string }
  tracking?: { status: SOrder['status']; note?: string; at: string }[]
  cancelledAt?: string
  deliveredAt?: string
  createdAt: string
}

// ---------------------------------------------------------- vocabularies

export const slugKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const titleCase = (key: string) =>
  key
    .split('-')
    .filter(Boolean)
    .map(w => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')

/** API planet key ↔ the panel's label ("venus" ↔ "Venus (Shukra)"). */
const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun (Surya)',
  moon: 'Moon (Chandra)',
  mars: 'Mars (Mangal)',
  mercury: 'Mercury (Budh)',
  jupiter: 'Jupiter (Guru)',
  venus: 'Venus (Shukra)',
  saturn: 'Saturn (Shani)',
  rahu: 'Rahu',
  ketu: 'Ketu',
}
const planetLabel = (key?: string | null) => (key ? (PLANET_LABELS[key.toLowerCase()] ?? titleCase(key)) : '')
const planetKey = (label: string) => label.split(' ')[0]!.toLowerCase()

const WEAR_TITLE = 'How to wear'
const BEST_DAY = /^best day(?: to wear)?:\s*/i

// --------------------------------------------------------------- shelves

const seedShelves = (names: string[]): Taxonomy[] => names.map((name, i) => ({ id: slugKey(name), name, description: '', active: true, order: i + 1 }))

type STaxonomy = Partial<Taxonomy> & { key?: string; name: string }
const fromStoredShelf = (rows: STaxonomy[]): Taxonomy[] =>
  rows.map((r, i) => ({ id: r.key ?? r.id ?? slugKey(r.name), name: r.name, description: r.description ?? '', active: r.active !== false, order: r.order ?? i + 1 }))

/**
 * Category / purpose shelves. Stored as `[{ id (the API key), name, description, active, order }]`
 * (the server's default list uses `key`); a shelf added in the panel gets the key of its name.
 */
const shelfCollection = (key: 'shop-categories' | 'shop-purposes', fallback: string[]) =>
  createContentListCollection<Taxonomy>(key, () => seedShelves(fallback), {
    normalise: rows => fromStoredShelf(rows as STaxonomy[]),
    prepare: t => ({ ...t, id: slugKey(t.name) || t.id }),
  })

export const categoriesDb = shelfCollection('shop-categories', [])
export const purposesDb = shelfCollection('shop-purposes', ['Love', 'Money', 'Career', 'Evil Eye', 'Health', 'Gifting'])

const shelfName = (rows: Taxonomy[], key: string) => rows.find(r => r.id === key)?.name ?? titleCase(key)
const shelfKey = (rows: Taxonomy[], name: string) => rows.find(r => r.name.toLowerCase() === name.toLowerCase())?.id ?? slugKey(name)

/** Shelves are needed to label products; load them once before the first product list. */
async function shelves() {
  const [cats, purposes] = await Promise.all([
    categoriesDb.snapshot().length ? categoriesDb.snapshot() : categoriesDb.list(),
    purposesDb.snapshot().length ? purposesDb.snapshot() : purposesDb.list(),
  ])
  return { cats, purposes }
}

// -------------------------------------------------------------- products

export function toProduct(p: SProduct, cats: Taxonomy[], purposes: Taxonomy[]): Product {
  const info = p.infoSections ?? []
  const wear = info.find(s => s.title.toLowerCase() === WEAR_TITLE.toLowerCase())
  const bestDay = wear?.items.find(i => BEST_DAY.test(i))?.replace(BEST_DAY, '') ?? ''
  const images = [...new Set([p.imageUrl, ...(p.images ?? [])].filter((x): x is string => !!x))]
  const badges = p.badges?.length ? p.badges : p.badge ? [p.badge] : []
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: shelfName(cats, p.category),
    purposes: (p.purposes ?? []).map(k => shelfName(purposes, k)),
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    price: p.price,
    mrp: p.oldPrice ?? p.price,
    sku: p.sku ?? '',
    stock: p.stock ?? 0,
    lowStockAt: p.lowStockAt ?? 10,
    variants: [],
    options: { types: p.options?.types ?? [], sizes: p.options?.sizes ?? [], materials: p.options?.materials ?? [] },
    benefits: p.highlights ?? [],
    specs: (p.specifications ?? []).map(s => ({ key: s.key, value: s.value })),
    howToWear: wear ? wear.items.filter(i => !BEST_DAY.test(i)).join('\n') : '',
    bestDay,
    faqs: (p.faqs ?? []).map(f => ({ q: f.question, a: f.answer })),
    planet: planetLabel(p.planet),
    zodiac: (p.zodiac ?? []).map(titleCase),
    moolank: p.moolank ?? [],
    stoneName: p.stoneName ?? '',
    badges,
    benefitTags: p.benefitTags ?? [],
    infoSections: info.filter(s => s !== wear).map(s => ({ title: s.title, items: s.items ?? [] })),
    images,
    videoUrl: p.videoUrl ?? '',
    extraOffPct: p.extraOffPct ?? 0,
    offerEndsAt: p.offerEndsAt ?? '',
    featured: !!p.isFeatured,
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    published: p.status === 'active',
    rating: p.rating ?? 0,
    reviews: p.ratingCount ?? 0,
    sold: p.soldCount ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

const cleanList = (list: string[]) => list.map(s => s.trim()).filter(Boolean)

function toPayload(p: Product, cats: Taxonomy[], purposes: Taxonomy[]) {
  const wearItems = [...cleanList(p.howToWear.split('\n')), ...(p.bestDay && p.howToWear.trim() ? [`Best day: ${p.bestDay}`] : [])]
  const infoSections = [
    ...(wearItems.length ? [{ title: WEAR_TITLE, items: wearItems }] : []),
    ...p.infoSections.map(s => ({ title: s.title.trim(), items: cleanList(s.items) })).filter(s => s.title && s.items.length),
  ]
  const [cover] = p.images
  return {
    name: p.name.trim(),
    ...(p.slug ? { slug: p.slug } : {}),
    category: shelfKey(cats, p.category),
    purposes: p.purposes.map(name => shelfKey(purposes, name)),
    shortDescription: p.shortDescription.trim() || null,
    description: p.description.trim(),
    price: Math.round(p.price),
    oldPrice: p.mrp > p.price ? Math.round(p.mrp) : null,
    sku: p.sku.trim() || null,
    stock: Math.max(0, Math.round(p.stock)),
    lowStockAt: Math.max(0, Math.round(p.lowStockAt)),
    highlights: cleanList(p.benefits),
    specifications: p.specs.map(s => ({ key: s.key.trim(), value: s.value.trim() })).filter(s => s.key && s.value),
    faqs: p.faqs.map(f => ({ question: f.q.trim(), answer: f.a.trim() })).filter(f => f.question && f.answer),
    infoSections,
    planet: p.planet ? planetKey(p.planet) : null,
    zodiac: p.zodiac.map(z => z.toLowerCase()),
    moolank: p.moolank,
    stoneName: p.stoneName.trim() || null,
    badges: p.badges,
    badge: p.badges[0] ?? null,
    benefitTags: cleanList(p.benefitTags),
    options: { types: cleanList(p.options.types), sizes: cleanList(p.options.sizes), materials: cleanList(p.options.materials) },
    videoUrl: p.videoUrl.trim() || null,
    extraOffPct: Math.max(0, Math.min(90, Math.round(p.extraOffPct || 0))),
    offerEndsAt: p.offerEndsAt ? new Date(p.offerEndsAt).toISOString() : null,
    isFeatured: p.featured,
    seoTitle: p.seoTitle.trim() || null,
    seoDescription: p.seoDescription.trim() || null,
    status: p.published ? 'active' : 'hidden',
    // The cover is the first image; `keepImages` is the whole gallery in order (cover included),
    // replacing the stored one — so removing every image really clears it.
    imageUrl: cover ?? '',
    keepImages: p.images,
  }
}

export const productsDb = createRemoteCollection<Product>({
  list: async () => {
    const [{ cats, purposes }, rows] = await Promise.all([shelves(), fetchAll<SProduct>('/admin/products')])
    return rows.filter(p => p.status !== 'archived').map(p => toProduct(p, cats, purposes))
  },
  create: async item => {
    const { cats, purposes } = await shelves()
    const { product } = await api.post<{ product: SProduct }>('/admin/products', toPayload(item, cats, purposes))
    return toProduct(product, cats, purposes)
  },
  update: async (id, patch, current) => {
    const { cats, purposes } = await shelves()
    // Publishing alone is a status switch.
    const keys = Object.keys(patch).filter(k => k !== 'updatedAt')
    if (keys.length === 1 && keys[0] === 'published') {
      const { product } = await api.patch<{ product: SProduct }>(`/admin/products/${id}/status`, { status: patch.published ? 'active' : 'hidden' })
      return toProduct(product, cats, purposes)
    }
    const { product } = await api.put<{ product: SProduct }>(`/admin/products/${id}`, toPayload({ ...current, ...patch }, cats, purposes))
    return toProduct(product, cats, purposes)
  },
  remove: async id => {
    await api.del(`/admin/products/${id}`)
  },
})

// ---------------------------------------------------------------- orders

const ORDER_STATUS: Record<SOrder['status'], OrderStatus> = {
  pending_payment: 'processing',
  placed: 'processing',
  packed: 'packed',
  shipped: 'transit',
  out_for_delivery: 'transit',
  delivered: 'delivered',
  cancelled: 'cancelled',
}
/** What the panel's status means to the API when moving an order forward. */
export const API_ORDER_STATUS: Partial<Record<OrderStatus, SOrder['status']>> = { packed: 'packed', transit: 'shipped', delivered: 'delivered', cancelled: 'cancelled' }

const EVENT_LABEL: Record<SOrder['status'], string> = {
  pending_payment: 'Awaiting online payment',
  placed: 'Order placed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Order cancelled',
}

function paymentOf(o: SOrder): { method: PaymentMethod; status: PaymentStatus } {
  const m = o.payment?.method ?? 'wallet'
  const gw = (o.payment?.gateway?.method ?? '').toLowerCase()
  const method: PaymentMethod = m === 'cod' ? 'COD' : m === 'wallet' ? 'Wallet' : gw === 'upi' ? 'UPI' : 'Card'
  const status = (o.payment?.status ?? 'paid') as PaymentStatus
  return { method, status }
}

export function toOrder(o: SOrder): Order {
  const user = o.user && typeof o.user === 'object' ? o.user : null
  const pay = paymentOf(o)
  const tracking = [...(o.tracking ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  const at = (s: SOrder['status']) => o.tracking?.find(t => t.status === s)?.at
  const cancelled = o.tracking?.find(t => t.status === 'cancelled')
  const activity: OrderEvent[] = tracking.map(t => ({ at: t.at, label: EVENT_LABEL[t.status] ?? t.status, note: t.note, by: t.status === 'placed' ? 'customer' : 'admin' }))
  if (!o.tracking?.some(t => t.status === 'placed' || t.status === 'pending_payment')) activity.push({ at: o.createdAt, label: 'Order placed', by: 'customer', note: pay.method })
  if (o.shipment?.awb) activity.unshift({ at: o.shipment.updatedAt ?? o.createdAt, label: 'Courier assigned', by: 'admin', note: `${o.shipment.courier} · AWB ${o.shipment.awb}` })
  activity.sort((a, b) => b.at.localeCompare(a.at))
  const s = o.shipping ?? {}
  return {
    id: o.id,
    reference: o.reference,
    customerId: user?.id ?? (typeof o.user === 'string' ? o.user : ''),
    customerName: user?.name || s.fullName || 'Customer',
    customerPhone: user?.phone || s.phone || '',
    customerEmail: user?.email || s.email || '',
    items: o.items.map(i => {
      const product = i.product && typeof i.product === 'object' ? i.product : null
      const variant = [i.options?.type, i.options?.size, i.options?.material].filter(Boolean).join(' · ')
      return {
        productId: product?.id ?? (typeof i.product === 'string' ? i.product : ''),
        imageUrl: i.imageUrl || product?.imageUrl,
        name: i.name,
        variant: variant || undefined,
        qty: i.qty,
        price: i.price,
      }
    }),
    subtotal: o.subtotal,
    discount: o.discount ?? 0,
    coupon: o.couponCode ?? undefined,
    shipping: o.shippingFee,
    gst: o.tax,
    total: o.total,
    paymentMethod: pay.method,
    paymentStatus: pay.status,
    status: ORDER_STATUS[o.status] ?? 'processing',
    courier: o.shipment?.courier,
    awb: o.shipment?.awb,
    address: { name: s.fullName ?? '', phone: s.phone ?? '', line1: s.address ?? '', line2: '', city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '', tag: 'Home' },
    placedAt: o.createdAt,
    packedAt: at('packed'),
    shippedAt: at('shipped') ?? at('out_for_delivery'),
    deliveredAt: o.deliveredAt ?? at('delivered'),
    cancelledAt: o.cancelledAt ?? cancelled?.at,
    cancelReason: cancelled?.note,
    refundAmount: pay.status === 'refunded' ? o.total : undefined,
    activity,
  }
}

/**
 * Order changes the pages make, in API terms: a courier/AWB goes to the
 * shipment endpoint first, then a status move (forward only, or cancelled —
 * which refunds what was paid and restocks). Anything else in the patch is
 * derived from the server's answer.
 */
export const ordersDb = createRemoteCollection<Order>({
  list: async () => (await fetchAll<SOrder>('/admin/orders')).map(toOrder),
  get: async id => toOrder((await api.get<{ order: SOrder }>(`/admin/orders/${id}`)).order),
  update: async (id, patch, current) => {
    let latest: SOrder | null = null
    if (patch.awb && patch.courier && (patch.awb !== current.awb || patch.courier !== current.courier)) {
      latest = (await api.patch<{ order: SOrder }>(`/admin/orders/${id}/shipment`, { courier: patch.courier, awb: patch.awb })).order
    }
    if (patch.status && patch.status !== current.status) {
      const status = API_ORDER_STATUS[patch.status]
      if (!status) throw new Error('That status change is not supported.')
      const note = patch.status === 'cancelled' ? patch.cancelReason : patch.activity?.find(e => e.label === 'Note')?.note
      latest = (await api.patch<{ order: SOrder }>(`/admin/orders/${id}/status`, { status, ...(note ? { note } : {}) })).order
    }
    if (!latest) latest = (await api.get<{ order: SOrder }>(`/admin/orders/${id}`)).order
    return toOrder(latest)
  },
})
