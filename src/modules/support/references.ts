import type { Collection } from '@/lib/store'
import { bookingsDb } from '../bookings/data'
import { consultationsDb } from '../consultations/data'
import { payoutsDb, transactionsDb } from '../finance/data'
import { ordersDb } from '../store/data'
import type { RaisedByType, ReferenceType } from './types'

type Source = { db: Collection<{ id: string }>; path: (id: string) => string }

// Where each linked reference lives in the panel.
const SOURCES: Record<ReferenceType, Source> = {
  Booking: { db: bookingsDb, path: id => `/bookings/${id}` },
  Order: { db: ordersDb, path: id => `/orders/${id}` },
  Session: { db: consultationsDb, path: id => `/consultations/${id}` },
  Transaction: { db: transactionsDb, path: () => '/transactions' },
  Withdrawal: { db: payoutsDb, path: () => '/payouts' },
}

/** Route for a ticket's linked record, or null if it no longer exists. */
export function referencePath(ref: { type: ReferenceType; id: string }) {
  const source = SOURCES[ref.type]
  return source.db.snapshot().some(r => r.id === ref.id) ? source.path(ref.id) : null
}

export const requesterPath = (type: RaisedByType, id: string) =>
  type === 'customer' ? `/customers/${id}` : type === 'astrologer' ? `/astrologers/${id}` : `/pandits/${id}`
