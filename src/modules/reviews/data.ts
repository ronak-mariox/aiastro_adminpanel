import { createRemoteCollection } from '@/lib/store'
import { deleteReview, listReviews, updateReview } from './api'
import type { Review } from './types'

/** Reviews from /admin/review-moderation (consultations, pujas, products). */
export const reviewsDb = createRemoteCollection<Review>({
  list: listReviews,
  update: async (_id, patch, current) => {
    if (!current) throw new Error('Review not loaded')
    return updateReview(current, patch)
  },
  remove: async id => {
    const [kind, reviewId] = id.split(':')
    await deleteReview({ kind, reviewId } as Review)
  },
})
