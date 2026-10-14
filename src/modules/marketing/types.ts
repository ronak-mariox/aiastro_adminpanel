export type CouponTag = 'NEW USER' | 'PREMIUM' | 'LIMITED' | 'BRAND'
export type DiscountType = 'percent' | 'flat' | 'points'
export type CouponScope = 'consultation' | 'puja' | 'store' | 'all'
export type PaymentMethod = 'any' | 'UPI' | 'Card' | 'Wallet' | 'COD'

export interface Coupon {
  id: string
  code: string
  title: string
  description: string
  tag: CouponTag
  type: DiscountType
  /** % for percent, ₹ for flat, points for points. */
  value: number
  /** Cap in ₹ for percent coupons (0 = no cap). */
  maxDiscount: number
  minOrder: number
  appliesTo: CouponScope
  usageLimit: number
  perUserLimit: number
  usedCount: number
  /** Total ₹ discount given so far. */
  discountGiven: number
  validFrom: string
  validTo: string
  autoApply: boolean
  paymentMethod: PaymentMethod
  active: boolean
  createdAt: string
}

/** Loyalty rules — `settings.loyalty` in the API. Earning is points per ₹100 spent. */
export interface RewardRules {
  id: string
  enabled: boolean
  pointsPerChat: number
  pointsPerCall: number
  pointsPerPuja: number
  pointsPerOrder: number
  /** Flat points on sign-up. */
  signupBonus: number
  /** Flat points to the referrer when a referral pays out. */
  pointsPerReferral: number
  /** ₹ value of a single point at redemption. */
  rupeePerPoint: number
  minRedeemPoints: number
  redeemEnabled: boolean
  /** Tier cashback on consultations (tiers' cashback %). */
  cashbackEnabled: boolean
  updatedAt: string
}

/** Refer-a-friend — `settings.referral` (only the referrer gets `rewardAmount`, on the friend's first consultation ≥ min spend) + the share message. */
export interface ReferralSettings {
  id: string
  enabled: boolean
  referrerReward: number
  refereeReward: number
  refereeRewardType: 'wallet' | 'points' | 'coupon'
  minFirstTransaction: number
  maxReferralsPerUser: number
  shareMessage: string
  updatedAt: string
}

export interface ReferralStat {
  id: string
  customerId: string
  name: string
  phone: string
  code: string
  invited: number
  converted: number
  earned: number
  lastReferralAt: string
}

export type BannerPlacement = 'userapp_home_hero' | 'festival_modal' | 'pandit_carousel' | 'store_ticker' | 'website_hero'

export interface Banner {
  id: string
  title: string
  placement: BannerPlacement
  imageUrl: string
  ctaText: string
  deepLink: string
  startDate: string
  endDate: string
  /** Lower number shows first within a placement. */
  priority: number
  active: boolean
  impressions: number
  clicks: number
  createdAt: string
}

export type Channel = 'push' | 'sms' | 'inapp'
export type Audience = 'all' | 'customers' | 'astrologers' | 'pandits' | 'city'
export type NotificationType = 'offer' | 'reminder' | 'booking' | 'order' | 'points' | 'referral'
export type CampaignStatus = 'sent' | 'scheduled' | 'draft' | 'failed' | 'cancelled'

export interface Campaign {
  id: string
  title: string
  body: string
  channels: Channel[]
  audience: Audience
  /** Customer segment when audience = customers. */
  segment?: string
  /** Target city when audience = city. */
  city?: string
  type: NotificationType
  deepLink: string
  status: CampaignStatus
  scheduledAt: string
  sentAt?: string
  recipients: number
  delivered: number
  opened: number
  createdBy: string
  createdAt: string
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channel: Channel
  title: string
  body: string
  deepLink: string
  /** System templates are triggered by app events (booking confirmed…). */
  trigger: 'manual' | 'automatic'
  active: boolean
  usage: number
}
