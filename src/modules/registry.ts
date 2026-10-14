import type { AdminModule } from './types'
import dashboard from './dashboard'
import users from './users'
import partners from './partners'
import approvals from './approvals'
import consultations from './consultations'
import bookings from './bookings'
import store from './store'
import finance from './finance'
import marketing from './marketing'
import content from './content'
import support from './support'
import reviews from './reviews'
import settings from './settings'

// Order here = order inside each sidebar group.
export const modules: AdminModule[] = [dashboard, users, partners, approvals, consultations, bookings, store, finance, marketing, content, support, reviews, settings]
