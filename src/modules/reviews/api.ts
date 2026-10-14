// Reviews module ↔ admin API.
//   GET    /admin/review-moderation                 consultation + puja + product reviews (enriched)
//   PATCH  /admin/review-moderation/:kind/:id       { hidden, hiddenReason, flagged, flagReason, pinned, adminReply }
//   DELETE /admin/review-moderation/:kind/:id       delete permanently (partner / product rating rolled back)
import { api, fetchAll } from '@/lib/api'
import { iso, type Row } from '@/data/adapters'
import type { Review, ReviewKind, ReviewTargetType } from './types'

const TARGET: Record<ReviewKind, ReviewTargetType> = { consultation: 'consultation', puja: 'pandit', product: 'product' }

const reply = (r?: Row | null) => (r?.text ? { text: String(r.text), at: iso(r.at) } : undefined)

export function toReview(r: Row): Review {
  const kind = r.kind as ReviewKind
  const reviewId = String(r.id)
  const flagged = !!r.flagged
  const hidden = !!r.hidden
  let context: string | undefined
  if (kind === 'consultation') context = `${r.channel === 'call' ? 'Call' : 'Chat'} · CNS-${reviewId.slice(-6).toUpperCase()}`
  else if (kind === 'puja') context = r.puja?.name ?? undefined
  return {
    id: `${kind}:${reviewId}`,
    kind,
    reviewId,
    ref: `REV-${reviewId.slice(-6).toUpperCase()}`,
    targetType: TARGET[kind] ?? 'consultation',
    targetId: r.target?.id ?? '',
    targetName: r.target?.name ?? r.astrologer?.name ?? r.product?.name ?? r.puja?.name ?? '—',
    context,
    customerId: r.user?.id ?? '',
    customerName: r.user?.name ?? r.reviewer?.name ?? 'Customer',
    rating: r.rating ?? 0,
    subRatings: r.aspects?.punctuality
      ? { punctuality: r.aspects.punctuality, knowledge: r.aspects.knowledge ?? 0, professionalism: r.aspects.professionalism ?? 0 }
      : undefined,
    text: [r.title, r.comment].filter(Boolean).join(' — '),
    photos: r.photos ?? 0,
    partnerReply: reply(r.partnerReply),
    adminReply: reply(r.adminReply),
    status: flagged ? 'flagged' : hidden ? 'hidden' : 'published',
    reportedReason: flagged ? r.flagReason || 'Reported' : undefined,
    reportedBy: flagged ? (r.flaggedBy ?? 'system') : undefined,
    hiddenReason: hidden ? (r.hiddenReason ?? undefined) : undefined,
    pinned: !!r.pinned,
    createdAt: iso(r.createdAt),
  }
}

export const listReviews = async () => (await fetchAll<Row>('/admin/review-moderation')).map(toReview)

/** Maps a UI patch (status / adminReply / pinned) onto the moderation fields. */
export async function updateReview(current: Review, patch: Partial<Review>) {
  const body: Row = {}
  if (patch.status === 'hidden') Object.assign(body, { hidden: true, flagged: false, hiddenReason: patch.hiddenReason ?? '' })
  // Dismissing a flag only clears the flag; publishing a hidden review un-hides it.
  else if (patch.status === 'published') Object.assign(body, current.status === 'flagged' ? { flagged: false } : { hidden: false })
  else if (patch.status === 'flagged') Object.assign(body, { flagged: true, flagReason: patch.reportedReason ?? '' })
  if ('adminReply' in patch) body.adminReply = patch.adminReply?.text ?? ''
  if (patch.pinned !== undefined) body.pinned = patch.pinned
  const { review } = await api.patch<{ review: Row }>(`/admin/review-moderation/${current.kind}/${current.reviewId}`, body)
  return toReview(review)
}

export const deleteReview = (r: Review) => api.del(`/admin/review-moderation/${r.kind}/${r.reviewId}`)
