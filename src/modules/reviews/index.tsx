import { Star } from 'lucide-react'
import type { AdminModule } from '../types'
import { reviewsDb } from './data'
import ReviewsPage from './ReviewsPage'

const module: AdminModule = {
  nav: [{ label: 'Reviews', path: '/reviews', icon: Star, group: 'Support', permission: 'reviews.view', badge: () => reviewsDb.snapshot().filter(r => r.status === 'flagged').length }],
  routes: [{ path: 'reviews', element: <ReviewsPage /> }],
}

export default module
