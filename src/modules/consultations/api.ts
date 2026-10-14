// Consultations module ↔ admin API.
//   GET    /admin/consultation-sessions            list rows (names, intake, billing, ledger, moderation)
//   GET    /admin/consultation-sessions/:id        one session + transcript page + gifts + refunds
//   POST   /admin/consultations/:id/end            admin ends a live session (billed normally)
//   POST   /admin/consultation-sessions/:id/refund full / partial refund to the customer's wallet
//   PATCH  /admin/consultation-sessions/:id/moderation   flag / unflag
//   POST   /admin/consultation-sessions/:id/warn   warn the astrologer (in-app notice)
//   GET    /admin/consultation-gifts               gift catalogue + times sent
//   POST/PUT/DELETE /admin/gifts[/:id]             gift catalogue CRUD (delete archives)
import { api, fetchAll, fileUrl } from '@/lib/api'
import { iso, titleCase, toGender, type Row } from '@/data/adapters'
import type { ChatMessage, Consultation, ConsultationRefund, ConsultationStatus, Gift, GiftSent } from './types'

/** Backend topic slugs → the labels the panel shows. */
const TOPIC_LABELS: Record<string, string> = {
  'love-relationship': 'Love & Relationships',
  marriage: 'Marriage',
  'career-job': 'Career',
  business: 'Business',
  education: 'Education',
  health: 'Health',
  'wealth-finance': 'Finance',
  family: 'Family',
  'kundli-milan': 'Kundli Milan',
  muhurat: 'Muhurat',
  vastu: 'Vastu',
  general: 'General',
}
export const TOPICS = Object.values(TOPIC_LABELS)
export const topicLabel = (slug?: string | null) => (slug ? (TOPIC_LABELS[slug] ?? titleCase(slug)) : 'General')

/** Emoji for the default catalogue keys (the apps draw bundled artwork for these). */
const GIFT_EMOJI: Record<string, string> = {
  rose: '🌹',
  heart: '❤️',
  sweets: '🍬',
  evil_eye: '🧿',
  bracelet: '📿',
  dakshina: '💰',
  pooja_thaali: '🪔',
  laughing_buddha: '🧘',
  laxmi_ganesha: '🪷',
  shivling: '🔱',
  diamond: '💎',
  chocolate: '🍫',
}
export const giftEmoji = (key?: string | null, icon?: string | null) => icon || (key && GIFT_EMOJI[key]) || '🎁'

const shortRef = (id: string) => `CNS-${id.slice(-6).toUpperCase()}`

/** "14:05" → "02:05 PM". */
const to12h = (hhmm?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '')
  if (!m) return 'Unknown'
  const h = Number(m[1])
  return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

function toStatus(r: Row): ConsultationStatus {
  switch (r.status) {
    case 'requested':
      return 'requested'
    case 'active':
      return 'ongoing'
    case 'ended':
      return (r.ledger?.adminRefunded ?? 0) > 0 ? 'refunded' : 'completed'
    case 'missed':
    case 'expired':
      return 'missed'
    default:
      return 'cancelled' // rejected / cancelled
  }
}

function cancelReason(r: Row): string | undefined {
  if (r.status === 'missed' || r.status === 'expired') return r.endReason || 'Astrologer did not accept in time'
  if (r.status === 'rejected') return r.endReason ? `Rejected by astrologer — ${r.endReason}` : 'Rejected by astrologer'
  if (r.status === 'cancelled') return r.endReason || 'Cancelled by customer before accept'
  return undefined
}

function toRefund(r: Row): ConsultationRefund | undefined {
  const l = r.ledger ?? {}
  if (!(l.adminRefunded > 0)) return undefined
  return {
    type: l.adminRefunded >= l.charged ? 'full' : 'partial',
    amount: l.adminRefunded,
    reason: l.lastAdminRefund?.reason ?? '',
    at: iso(l.lastAdminRefund?.at) || iso(r.endedAt),
  }
}

function toMessage(m: Row): ChatMessage {
  const from = m.from === 'user' ? 'customer' : m.from === 'astrologer' ? 'astrologer' : 'system'
  const text = m.kind === 'gift' || m.type === 'gift' ? `🎁 ${m.text}` : m.text
  return { id: m.id, seq: m.seq, from, kind: m.type, text: text ?? '', url: m.url ? fileUrl(m.url) : undefined, at: iso(m.at) }
}

function toGiftSent(g: Row): GiftSent {
  return {
    giftId: String(g.id ?? g.key ?? ''),
    name: g.name ?? 'Gift',
    icon: giftEmoji(g.key, g.icon),
    imageUrl: g.imageUrl ? fileUrl(g.imageUrl) : undefined,
    price: g.price ?? 0,
    at: iso(g.sentAt),
  }
}

export function toConsultation(r: Row): Consultation {
  const id = String(r.id)
  const b = r.billing ?? {}
  const intake = r.intake ?? {}
  const mod = r.moderation ?? {}
  const startedAt = iso(r.startedAt) || iso(r.requestedAt) || iso(r.createdAt)
  return {
    id,
    ref: shortRef(id),
    customerId: r.user?.id ?? '',
    customerName: r.user?.name || 'Customer',
    customerCode: r.user?.userCode ?? undefined,
    astrologerId: r.astrologer?.id ?? '',
    astrologerName: r.astrologer?.name || 'Astrologer',
    type: r.channel === 'call' ? 'call' : r.channel === 'video' ? 'video' : 'chat',
    status: toStatus(r),
    requestedAt: iso(r.requestedAt) || startedAt,
    startedAt,
    endedAt: iso(r.endedAt) || undefined,
    durationSec: r.durationSeconds ?? 0,
    pausedMs: r.pausedMs ?? 0,
    ratePerMin: b.ratePerMinute ?? 0,
    amount: b.amountCharged ?? 0,
    astrologerEarning: b.astrologerEarning ?? 0,
    commissionPct: b.commissionPercent ?? 0,
    giftsAmount: b.giftsAmount ?? 0,
    giftsEarning: b.giftsEarning ?? 0,
    refundable: r.ledger?.refundable ?? 0,
    gifts: Array.isArray(r.gifts) ? r.gifts.map(toGiftSent) : [],
    rating: r.review?.rating ?? undefined,
    review: r.review?.comment ?? undefined,
    intake: {
      name: intake.fullName || r.user?.name || '—',
      gender: toGender(intake.gender),
      dob: intake.dateOfBirth ? String(intake.dateOfBirth).slice(0, 10) : '',
      tob: intake.isBirthTimeKnown === false ? 'Unknown' : to12h(intake.timeOfBirth),
      place: intake.place || '—',
      topic: topicLabel(intake.topic),
      question: intake.question || undefined,
    },
    messages: Array.isArray(r.messages) ? r.messages.map(toMessage) : [],
    hasMoreMessages: r.hasMoreMessages ?? false,
    flagged: !!mod.flagged,
    flagReason: mod.flagReason ?? undefined,
    cancelReason: cancelReason(r),
    endReason: r.endReason ?? undefined,
    refund: toRefund(r),
    warnings: (mod.warnings ?? []).map((w: Row) => ({ reason: w.reason ?? '', at: iso(w.at) })),
  }
}

export const listConsultations = async () => (await fetchAll<Row>('/admin/consultation-sessions')).map(toConsultation)

export async function getConsultation(id: string, current?: Consultation) {
  const { consultation } = await api.get<{ consultation: Row }>(`/admin/consultation-sessions/${id}`)
  const fresh = toConsultation(consultation)
  // Keep any earlier transcript pages already loaded for this session.
  if (current?.messages.length && fresh.messages.length) {
    const firstSeq = fresh.messages[0]!.seq ?? 0
    const earlier = current.messages.filter(m => (m.seq ?? 0) < firstSeq)
    if (earlier.length) fresh.messages = [...earlier, ...fresh.messages]
  }
  return fresh
}

/** Earlier transcript page (before the oldest loaded message). */
export async function loadEarlierMessages(c: Consultation) {
  const beforeSeq = c.messages[0]?.seq
  if (!beforeSeq) return { messages: [] as ChatMessage[], hasMore: false }
  const { consultation } = await api.get<{ consultation: Row }>(`/admin/consultation-sessions/${c.id}`, { beforeSeq, limit: 200 })
  return { messages: (consultation.messages ?? []).map(toMessage) as ChatMessage[], hasMore: !!consultation.hasMoreMessages }
}

export const endConsultation = (id: string, reason?: string) => api.post(`/admin/consultations/${id}/end`, { reason })

export const refundConsultation = (id: string, body: { type: 'full' | 'partial'; amount: number; reason: string }) =>
  api.post<{ amount: number; type: 'full' | 'partial'; astrologerReversed: number; astrologerShortfall: number }>(`/admin/consultation-sessions/${id}/refund`, body)

export const setConsultationFlag = (id: string, flagged: boolean, flagReason?: string) =>
  api.patch(`/admin/consultation-sessions/${id}/moderation`, { flagged, flagReason })

export const warnAstrologer = (id: string, reason: string) => api.post(`/admin/consultation-sessions/${id}/warn`, { reason })

// ---------------------------------------------------------------- gifts

export function toGift(r: Row): Gift {
  return {
    id: String(r.id ?? r._id),
    key: r.key,
    name: r.name ?? '',
    icon: giftEmoji(r.key, r.icon),
    imageUrl: r.imageUrl ? fileUrl(r.imageUrl) : undefined,
    price: r.price ?? 0,
    active: r.isActive !== false,
    sentCount: r.sentCount ?? 0,
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'gift'

export const listGifts = async () => ((await api.get<{ items: Row[] }>('/admin/consultation-gifts')).items ?? []).map(toGift)

export async function createGift(g: Gift) {
  const body = { name: g.name, icon: g.icon, price: g.price, isActive: g.active }
  try {
    const { gift } = await api.post<{ gift: Row }>('/admin/gifts', { ...body, key: slug(g.name) })
    return toGift(gift)
  } catch (e) {
    // Key taken (e.g. an archived gift with the same name) — retry once with a unique suffix.
    if ((e as { status?: number }).status !== 409) throw e
    const { gift } = await api.post<{ gift: Row }>('/admin/gifts', { ...body, key: `${slug(g.name)}_${Date.now().toString(36)}` })
    return toGift(gift)
  }
}

export async function updateGift(id: string, patch: Partial<Gift>, current?: Gift) {
  const body: Row = {}
  if (patch.name !== undefined) body.name = patch.name
  if (patch.icon !== undefined) body.icon = patch.icon
  if (patch.price !== undefined) body.price = patch.price
  if (patch.active !== undefined) body.isActive = patch.active
  const { gift } = await api.put<{ gift: Row }>(`/admin/gifts/${id}`, body)
  return { ...toGift(gift), sentCount: current?.sentCount ?? 0 }
}

export const archiveGift = async (id: string) => {
  await api.del(`/admin/gifts/${id}`)
}
