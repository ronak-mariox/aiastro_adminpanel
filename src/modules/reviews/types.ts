export type ReviewTargetType = 'astrologer' | 'pandit' | 'product' | 'consultation'
export type ReviewStatus = 'published' | 'hidden' | 'flagged'

/** The backend has no standalone astrologer review — a consultation's review is the astrologer's. */
export const REVIEW_TARGET_TYPES: ReviewTargetType[] = ['consultation', 'pandit', 'product']

/** Where the review lives in the API (GET/PATCH /admin/review-moderation/:kind/:id). */
export type ReviewKind = 'consultation' | 'puja' | 'product'

export interface Review {
  /** `${kind}:${reviewId}` — unique across the three review sources. */
  id: string
  kind: ReviewKind
  reviewId: string
  /** Short display reference, e.g. REV-3F9A21. */
  ref: string
  customerName: string
  pinned: boolean
  targetType: ReviewTargetType
  /** AST… / PND… / PRD… — consultation reviews point at the astrologer. */
  targetId: string
  targetName: string
  /** Puja name for pandit reviews, session id for consultation reviews. */
  context?: string
  customerId: string
  rating: number // 1–5
  /** Puja reviews only (UserApp rate-puja screen). */
  subRatings?: { punctuality: number; knowledge: number; professionalism: number }
  text: string
  photos: number
  partnerReply?: { text: string; at: string }
  adminReply?: { text: string; at: string }
  status: ReviewStatus
  reportedReason?: string
  reportedBy?: 'astrologer' | 'pandit' | 'customer' | 'system'
  hiddenReason?: string
  createdAt: string
}

export const typeLabel = (t: ReviewTargetType) => t.charAt(0).toUpperCase() + t.slice(1)
