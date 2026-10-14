import type { Tone } from '@/components/ui'
import { createTemplatesDb } from './api'
import type { Audience, BannerPlacement, CampaignStatus, Channel, Coupon, CouponScope, CouponTag, DiscountType, NotificationTemplate, NotificationType, PaymentMethod } from './types'

// Live collections (Shree Astro admin API) — see ./api.ts.
export { bannersDb, campaignsDb, couponsDb, referralSettingsDb, referralStatsDb, rewardRulesDb } from './api'

// ---------- Labels shared by pages ----------

export const COUPON_TAGS: CouponTag[] = ['NEW USER', 'PREMIUM', 'LIMITED', 'BRAND']
export const TAG_TONES: Record<CouponTag, Tone> = { 'NEW USER': 'green', PREMIUM: 'purple', LIMITED: 'orange', BRAND: 'blue' }
export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'flat', label: 'Flat (₹)' },
]
export const COUPON_SCOPES: { value: CouponScope; label: string }[] = [
  { value: 'all', label: 'All services' },
  { value: 'consultation', label: 'Wallet recharge (consultations)' },
  { value: 'puja', label: 'Puja booking' },
  { value: 'store', label: 'Store orders' },
]
export const PAYMENT_METHODS: PaymentMethod[] = ['any', 'UPI', 'Card', 'Wallet', 'COD']

export const PLACEMENTS: { value: BannerPlacement; label: string; size: string }[] = [
  { value: 'userapp_home_hero', label: 'UserApp · Home hero', size: '1080 × 480' },
  { value: 'festival_modal', label: 'UserApp · Festival offer modal', size: '800 × 1000' },
  { value: 'pandit_carousel', label: 'UserApp · Pandit carousel', size: '1080 × 400' },
  { value: 'store_ticker', label: 'UserApp · Store ticker', size: 'Text strip' },
  { value: 'website_hero', label: 'Website · Hero', size: '1920 × 720' },
]
export const placementLabel = (p: BannerPlacement) => PLACEMENTS.find(x => x.value === p)?.label ?? p

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'sms', label: 'SMS' },
  { value: 'inapp', label: 'In-app' },
]
export const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'customers', label: 'Customer segment' },
  { value: 'astrologers', label: 'Astrologers' },
  { value: 'pandits', label: 'Pandits' },
  { value: 'city', label: 'By city' },
]
export const SEGMENTS = ['All customers', 'New users (last 7 days)', 'Low wallet balance (< ₹50)', 'Inactive 30+ days', 'High spenders (> ₹5,000)', 'Puja customers', 'Store buyers']
export const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Varanasi', 'Ahmedabad', 'Indore']
export const NOTIFICATION_TYPES: NotificationType[] = ['offer', 'reminder', 'booking', 'order', 'points', 'referral']

// ---------- Coupons ----------

/** Derived lifecycle status shown in tables. */
export function couponStatus(c: Coupon, today = new Date().toISOString().slice(0, 10)): 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted' {
  if (!c.active) return 'inactive'
  if (c.validTo < today) return 'expired'
  if (c.validFrom > today) return 'scheduled'
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return 'exhausted'
  return 'active'
}

export const discountLabel = (c: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>) =>
  c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}` : c.type === 'flat' ? `₹${c.value} off` : `${c.value} pts`

export const campaignStatusLabel: Record<CampaignStatus, string> = { sent: 'Sent', scheduled: 'Scheduled', draft: 'Draft', failed: 'Failed', cancelled: 'Cancelled' }

export const templatesSeed: NotificationTemplate[] = [
  { id: 'TPL101', name: 'Booking confirmed', type: 'booking', channel: 'push', title: 'Puja booked ✅', body: 'Hi {{name}}, your {{puja}} with {{pandit}} is confirmed for {{date}}.', deepLink: 'vedrashi://bookings/{{bookingId}}', trigger: 'automatic', active: true, usage: 18420 },
  { id: 'TPL102', name: 'Consultation reminder', type: 'reminder', channel: 'push', title: 'Your consultation starts in 15 min', body: '{{astrologer}} will be ready at {{time}}. Keep your birth details handy.', deepLink: 'vedrashi://consultations', trigger: 'automatic', active: true, usage: 9310 },
  { id: 'TPL103', name: 'Rate your experience', type: 'reminder', channel: 'inapp', title: 'How was your session?', body: 'Rate {{astrologer}} and earn 20 reward points.', deepLink: 'vedrashi://rate/{{sessionId}}', trigger: 'automatic', active: true, usage: 26880 },
  { id: 'TPL104', name: 'Order shipped', type: 'order', channel: 'sms', title: 'Order shipped', body: 'VedRashi: Your order {{orderId}} has been shipped. Track: {{link}}', deepLink: 'vedrashi://orders/{{orderId}}', trigger: 'automatic', active: true, usage: 7420 },
  { id: 'TPL105', name: 'Points earned', type: 'points', channel: 'push', title: 'You earned {{points}} points 🎉', body: 'Points added for your {{activity}}. Balance: {{balance}} pts.', deepLink: 'vedrashi://rewards', trigger: 'automatic', active: true, usage: 31200 },
  { id: 'TPL106', name: 'Referral reward', type: 'referral', channel: 'push', title: '₹500 referral reward credited', body: '{{friend}} joined using your code. ₹500 added to your wallet.', deepLink: 'vedrashi://wallet', trigger: 'automatic', active: true, usage: 3810 },
  { id: 'TPL107', name: 'Festival offer', type: 'offer', channel: 'push', title: '{{festival}} special offer', body: 'Get {{discount}} off with code {{code}}. Valid till {{date}}.', deepLink: 'vedrashi://coupons/{{code}}', trigger: 'manual', active: true, usage: 42 },
  { id: 'TPL108', name: 'Low balance', type: 'offer', channel: 'push', title: 'Low wallet balance', body: 'Recharge now and get up to 50% extra on popular packs.', deepLink: 'vedrashi://wallet/recharge', trigger: 'manual', active: true, usage: 18 },
  { id: 'TPL109', name: 'Booking cancelled', type: 'booking', channel: 'sms', title: 'Booking cancelled', body: 'VedRashi: Your booking {{bookingId}} is cancelled. Refund of ₹{{amount}} initiated.', deepLink: 'vedrashi://bookings/{{bookingId}}', trigger: 'automatic', active: true, usage: 1290 },
  { id: 'TPL110', name: 'Win-back', type: 'offer', channel: 'sms', title: 'We miss you', body: 'VedRashi: {{name}}, your stars have news! 50% off your next chat. Code BACK50', deepLink: 'vedrashi://astrologers', trigger: 'manual', active: false, usage: 6 },
]
/** Message templates for the composer — stored under site-content `notification-templates` (these until first saved). */
export const templatesDb = createTemplatesDb(() => templatesSeed)
