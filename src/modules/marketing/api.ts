// Growth ↔ Shree Astro admin API.
//   coupons      GET/POST /admin/coupons, PUT /admin/coupons/:id, PATCH …/status, DELETE (only unused codes)
//   rewards      GET/PATCH /admin/settings → loyalty.{enabled, pointsPer100, signupBonusPoints, referralBonusPoints, redeem, cashbackEnabled}
//   referral     GET/PATCH /admin/settings → referral.{enabled, rewardAmount, minFirstSpend}; share text in site-content `referral-program`
//   referrers    GET /admin/referrals (aggregated per referrer here)
//   banners      GET/POST /admin/banners, PUT/DELETE /admin/banners/:id
//   campaigns    GET/POST /admin/campaigns, PATCH/DELETE /admin/campaigns/:id, POST …/send
//   templates    GET/PUT /admin/site-content/notification-templates

import { api } from '@/lib/api'
import { createContentListCollection, createRemoteCollection, fetchAll, siteContent } from '@/lib/remoteCollection'
import type { Banner, BannerPlacement, Campaign, Coupon, CouponScope, CouponTag, NotificationTemplate, PaymentMethod, ReferralSettings, ReferralStat, RewardRules } from './types'

// ---------------------------------------------------------------- coupons

type SCoupon = {
  id: string
  code: string
  title: string
  description?: string | null
  kind: 'percent' | 'flat'
  value: number
  maxDiscount?: number | null
  minAmount?: number
  appliesTo: ('order' | 'puja' | 'topup')[]
  validFrom?: string | null
  validTo?: string | null
  usageLimit?: number | null
  perUserLimit?: number
  usedCount?: number
  discountGiven?: number
  status: 'active' | 'paused' | 'expired'
  isPublic?: boolean
  tag?: string | null
  tone?: string
  autoApply?: boolean
  paymentMethod?: PaymentMethod
  createdAt: string
}

const SCOPE_FROM: Record<string, CouponScope> = { order: 'store', puja: 'puja', topup: 'consultation' }
const SCOPE_TO: Record<CouponScope, SCoupon['appliesTo']> = { store: ['order'], puja: ['puja'], consultation: ['topup'], all: ['order', 'puja', 'topup'] }
const TAG_TONE: Record<CouponTag, string> = { 'NEW USER': 'green', PREMIUM: 'purple', LIMITED: 'orange', BRAND: 'blue' }
const TAGS: CouponTag[] = ['NEW USER', 'PREMIUM', 'LIMITED', 'BRAND']

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

export function toCoupon(c: SCoupon): Coupon {
  const scopes = c.appliesTo ?? []
  const appliesTo: CouponScope = scopes.length >= 3 ? 'all' : (SCOPE_FROM[scopes[0] ?? 'order'] ?? 'all')
  const tag = (c.tag ?? '').toUpperCase()
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description ?? '',
    tag: (TAGS as string[]).includes(tag) ? (tag as CouponTag) : 'LIMITED',
    type: c.kind,
    value: c.value,
    maxDiscount: c.maxDiscount ?? 0,
    minOrder: c.minAmount ?? 0,
    appliesTo,
    usageLimit: c.usageLimit ?? 0,
    perUserLimit: c.perUserLimit ?? 1,
    usedCount: c.usedCount ?? 0,
    discountGiven: c.discountGiven ?? 0,
    validFrom: day(c.validFrom),
    validTo: day(c.validTo),
    autoApply: !!c.autoApply,
    paymentMethod: c.paymentMethod ?? 'any',
    active: c.status === 'active',
    createdAt: c.createdAt,
  }
}

function couponPayload(c: Coupon) {
  if (c.type !== 'percent' && c.type !== 'flat') throw new Error('Coupons are a percentage or a flat amount.')
  return {
    code: c.code,
    title: c.title,
    description: c.description || null,
    kind: c.type,
    value: Math.round(c.value),
    maxDiscount: c.type === 'percent' && c.maxDiscount > 0 ? Math.round(c.maxDiscount) : null,
    minAmount: Math.max(0, Math.round(c.minOrder)),
    appliesTo: SCOPE_TO[c.appliesTo],
    validFrom: c.validFrom ? new Date(`${c.validFrom}T00:00:00`).toISOString() : null,
    // Valid through the whole end day.
    validTo: c.validTo ? new Date(`${c.validTo}T23:59:59`).toISOString() : null,
    usageLimit: c.usageLimit > 0 ? Math.round(c.usageLimit) : null,
    perUserLimit: Math.max(1, Math.round(c.perUserLimit)),
    status: c.active ? 'active' : 'paused',
    tag: c.tag,
    tone: TAG_TONE[c.tag],
    autoApply: c.autoApply,
    paymentMethod: c.paymentMethod,
  }
}

export const couponsDb = createRemoteCollection<Coupon>({
  list: async () => (await fetchAll<SCoupon>('/admin/coupons')).map(toCoupon),
  create: async c => toCoupon((await api.post<{ coupon: SCoupon }>('/admin/coupons', couponPayload(c))).coupon),
  update: async (id, patch, current) => {
    const keys = Object.keys(patch)
    if (keys.length === 1 && keys[0] === 'active') {
      return toCoupon((await api.patch<{ coupon: SCoupon }>(`/admin/coupons/${id}/status`, { status: patch.active ? 'active' : 'paused' })).coupon)
    }
    const saved = toCoupon((await api.put<{ coupon: SCoupon }>(`/admin/coupons/${id}`, couponPayload({ ...current, ...patch }))).coupon)
    return { ...saved, discountGiven: current.discountGiven }
  },
  remove: async id => {
    await api.del(`/admin/coupons/${id}`)
  },
})

// ------------------------------------------------- settings-backed records

type SSettings = {
  updatedAt?: string
  loyalty?: {
    enabled?: boolean
    pointsPer100?: { chat?: number; call?: number; order?: number; puja?: number }
    referralBonusPoints?: number
    signupBonusPoints?: number
    cashbackEnabled?: boolean
    redeem?: { enabled?: boolean; pointValue?: number; minPoints?: number }
  }
  referral?: { enabled?: boolean; rewardAmount?: number; minFirstSpend?: number }
}

const getSettings = async () => (await api.get<{ settings: SSettings }>('/admin/settings')).settings
const patchSettings = async (body: SSettings) => (await api.patch<{ settings: SSettings }>('/admin/settings', body)).settings

const toRules = (s: SSettings): RewardRules => {
  const l = s.loyalty ?? {}
  return {
    id: 'default',
    enabled: l.enabled !== false,
    pointsPerChat: l.pointsPer100?.chat ?? 10,
    pointsPerCall: l.pointsPer100?.call ?? 12,
    pointsPerPuja: l.pointsPer100?.puja ?? 8,
    pointsPerOrder: l.pointsPer100?.order ?? 8,
    signupBonus: l.signupBonusPoints ?? 50,
    pointsPerReferral: l.referralBonusPoints ?? 100,
    rupeePerPoint: l.redeem?.pointValue ?? 1,
    minRedeemPoints: l.redeem?.minPoints ?? 100,
    redeemEnabled: l.redeem?.enabled !== false,
    cashbackEnabled: !!l.cashbackEnabled,
    updatedAt: s.updatedAt ?? new Date(0).toISOString(),
  }
}

export const rewardRulesDb = createRemoteCollection<RewardRules>({
  list: async () => [toRules(await getSettings())],
  update: async (_id, patch, current) => {
    const r = { ...current, ...patch }
    const saved = await patchSettings({
      loyalty: {
        enabled: r.enabled,
        pointsPer100: { chat: r.pointsPerChat, call: r.pointsPerCall, order: r.pointsPerOrder, puja: r.pointsPerPuja },
        signupBonusPoints: r.signupBonus,
        referralBonusPoints: r.pointsPerReferral,
        cashbackEnabled: r.cashbackEnabled,
        redeem: { enabled: r.redeemEnabled, pointValue: r.rupeePerPoint, minPoints: r.minRedeemPoints },
      },
    })
    return toRules(saved)
  },
})

const DEFAULT_SHARE = 'Get guidance from India’s top astrologers on Shree Astro! Use my code {{code}} when you sign up.'
type ReferralProgram = { shareMessage?: string }

const toReferral = (s: SSettings, program: ReferralProgram | null): ReferralSettings => ({
  id: 'default',
  enabled: s.referral?.enabled !== false,
  referrerReward: s.referral?.rewardAmount ?? 200,
  refereeReward: s.referral?.rewardAmount ?? 200,
  refereeRewardType: 'wallet',
  minFirstTransaction: s.referral?.minFirstSpend ?? 100,
  maxReferralsPerUser: 0,
  shareMessage: program?.shareMessage || DEFAULT_SHARE,
  updatedAt: s.updatedAt ?? new Date(0).toISOString(),
})

export const referralSettingsDb = createRemoteCollection<ReferralSettings>({
  list: async () => {
    const [s, program] = await Promise.all([getSettings(), siteContent.get<ReferralProgram>('referral-program')])
    return [toReferral(s, program)]
  },
  update: async (_id, patch, current) => {
    const r = { ...current, ...patch }
    const [s, program] = await Promise.all([
      patchSettings({ referral: { enabled: r.enabled, rewardAmount: r.referrerReward, minFirstSpend: r.minFirstTransaction } }),
      r.shareMessage !== current.shareMessage ? siteContent.save<ReferralProgram>('referral-program', { shareMessage: r.shareMessage }) : Promise.resolve({ shareMessage: current.shareMessage }),
    ])
    return toReferral(s, program)
  },
})

type SReferral = {
  id: string
  referrer?: { id: string; name?: string; phone?: string; email?: string } | null
  code?: string
  status: 'signed_up' | 'rewarded' | string
  rewardAmount?: number
  rewardedAt?: string
  createdAt: string
}

/** Top referrers, from every referral row grouped by who referred. */
export const referralStatsDb = createRemoteCollection<ReferralStat>({
  list: async () => {
    const rows = await fetchAll<SReferral>('/admin/referrals')
    const byReferrer = new Map<string, ReferralStat>()
    for (const r of rows) {
      const id = r.referrer?.id ?? 'unknown'
      const stat = byReferrer.get(id) ?? {
        id,
        customerId: id,
        name: r.referrer?.name || 'Customer',
        phone: r.referrer?.phone ?? '',
        code: r.code ?? '',
        invited: 0,
        converted: 0,
        earned: 0,
        lastReferralAt: r.createdAt,
      }
      stat.invited += 1
      if (r.status === 'rewarded') {
        stat.converted += 1
        stat.earned += r.rewardAmount ?? 0
      }
      if (r.createdAt > stat.lastReferralAt) stat.lastReferralAt = r.createdAt
      byReferrer.set(id, stat)
    }
    return [...byReferrer.values()]
  },
})

// ---------------------------------------------------------------- banners

type SBanner = {
  id: string
  title: string
  subtitle?: string
  ctaLabel?: string
  imageUrl?: string
  link?: { screen?: string; id?: string; url?: string }
  placement?: string
  sortOrder?: number
  isActive?: boolean
  startsAt?: string
  endsAt?: string
  createdAt: string
}

const PLACEMENT_FROM: Record<string, BannerPlacement> = { home: 'userapp_home_hero' }
const PLACEMENT_TO = (p: BannerPlacement) => (p === 'userapp_home_hero' ? 'home' : p)

/** "vedrashi://store/abc" → { screen: 'store', id: 'abc' } so the apps can route; the raw link is kept as `url`. */
const linkFrom = (deepLink: string) => {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)(?:\/([^/?#]+))?/i.exec(deepLink.trim())
  return { url: deepLink.trim() || undefined, ...(m ? { screen: m[1], ...(m[2] ? { id: m[2] } : {}) } : {}) }
}

export function toBanner(b: SBanner): Banner {
  return {
    id: b.id,
    title: b.title,
    placement: PLACEMENT_FROM[b.placement ?? 'home'] ?? ((b.placement as BannerPlacement) || 'userapp_home_hero'),
    imageUrl: b.imageUrl ?? '',
    ctaText: b.ctaLabel ?? '',
    deepLink: b.link?.url || (b.link?.screen ? `vedrashi://${b.link.screen}${b.link.id ? `/${b.link.id}` : ''}` : ''),
    startDate: day(b.startsAt),
    endDate: day(b.endsAt),
    priority: b.sortOrder ?? 0,
    active: b.isActive !== false,
    impressions: 0,
    clicks: 0,
    createdAt: b.createdAt,
  }
}

const bannerPayload = (b: Partial<Banner>) => ({
  ...(b.title !== undefined ? { title: b.title } : {}),
  ...(b.placement !== undefined ? { placement: PLACEMENT_TO(b.placement) } : {}),
  ...(b.imageUrl !== undefined ? { imageUrl: b.imageUrl } : {}),
  ...(b.ctaText !== undefined ? { ctaLabel: b.ctaText } : {}),
  ...(b.deepLink !== undefined ? { link: linkFrom(b.deepLink) } : {}),
  ...(b.startDate !== undefined ? { startsAt: b.startDate ? new Date(`${b.startDate}T00:00:00`).toISOString() : '' } : {}),
  ...(b.endDate !== undefined ? { endsAt: b.endDate ? new Date(`${b.endDate}T23:59:59`).toISOString() : '' } : {}),
  ...(b.priority !== undefined ? { sortOrder: b.priority } : {}),
  ...(b.active !== undefined ? { isActive: b.active } : {}),
})

export const bannersDb = createRemoteCollection<Banner>({
  list: async () => (await api.get<{ items: SBanner[] }>('/admin/banners')).items.map(toBanner),
  create: async b => toBanner((await api.post<{ banner: SBanner }>('/admin/banners', bannerPayload(b))).banner),
  update: async (id, patch) => toBanner((await api.put<{ banner: SBanner }>(`/admin/banners/${id}`, bannerPayload(patch))).banner),
  remove: async id => {
    await api.del(`/admin/banners/${id}`)
  },
})

// -------------------------------------------------------------- campaigns

type SCampaign = Omit<Campaign, 'scheduledAt' | 'sentAt' | 'createdBy' | 'status'> & {
  status: Campaign['status'] | 'sending'
  scheduledAt?: string
  sentAt?: string
  createdByName?: string
  createdAt: string
}

export const toCampaign = (c: SCampaign): Campaign => ({
  ...c,
  // "sending" lasts a moment; the page shows it as scheduled until the next refresh.
  status: c.status === 'sending' ? 'scheduled' : c.status,
  scheduledAt: c.scheduledAt ?? c.createdAt,
  sentAt: c.sentAt,
  createdBy: c.createdByName || 'Admin',
})

const campaignBody = (c: Partial<Campaign>) => ({
  ...(c.title !== undefined ? { title: c.title } : {}),
  ...(c.body !== undefined ? { body: c.body } : {}),
  ...(c.channels !== undefined ? { channels: c.channels } : {}),
  ...(c.audience !== undefined ? { audience: c.audience } : {}),
  ...(c.segment !== undefined ? { segment: c.segment } : {}),
  ...(c.city !== undefined ? { city: c.city } : {}),
  ...(c.type !== undefined ? { type: c.type } : {}),
  ...(c.deepLink !== undefined ? { deepLink: c.deepLink } : {}),
  ...(c.scheduledAt ? { scheduledAt: new Date(c.scheduledAt).toISOString() } : {}),
})

export const campaignsDb = createRemoteCollection<Campaign>({
  list: async () => (await fetchAll<SCampaign>('/admin/campaigns')).map(toCampaign),
  // `status` decides: draft keeps it, scheduled waits, sent sends now.
  create: async c => toCampaign((await api.post<{ campaign: SCampaign }>('/admin/campaigns', { ...campaignBody(c), status: c.status })).campaign),
  update: async (id, patch) => {
    if (patch.status === 'sent') return toCampaign((await api.post<{ campaign: SCampaign }>(`/admin/campaigns/${id}/send`)).campaign)
    return toCampaign((await api.patch<{ campaign: SCampaign }>(`/admin/campaigns/${id}`, { ...campaignBody(patch), ...(patch.status ? { status: patch.status } : {}) })).campaign)
  },
  remove: async id => {
    await api.del(`/admin/campaigns/${id}`)
  },
})

// -------------------------------------------------------------- templates

export const createTemplatesDb = (seed: () => NotificationTemplate[]) => createContentListCollection<NotificationTemplate>('notification-templates', seed)
