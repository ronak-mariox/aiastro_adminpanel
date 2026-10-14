import { BookOpen, CalendarCheck } from 'lucide-react'
import { WithApiErrors } from '@/lib/RemoteErrors'
import type { AdminModule } from '../types'
import BookingDetail from './BookingDetail'
import BookingsPage from './BookingsPage'
import { bookingsDb } from './data'
import { toDateKey } from './pricing'
import PujasPage from './PujasPage'

export { bookingsDb, pujasDb } from './data'
export type { Booking, Puja } from './types'

const module: AdminModule = {
  nav: [
    {
      label: 'Puja Bookings',
      path: '/bookings',
      icon: CalendarCheck,
      group: 'Operations',
      // Pujas happening today that are still open.
      badge: () => bookingsDb.snapshot().filter(b => b.date === toDateKey(new Date()) && b.status !== 'cancelled' && b.status !== 'completed').length,
    },
    { label: 'Puja Catalogue', path: '/pujas', icon: BookOpen, group: 'Operations' },
  ],
  routes: [
    { path: 'bookings', element: <WithApiErrors><BookingsPage /></WithApiErrors> },
    { path: 'bookings/:id', element: <WithApiErrors><BookingDetail /></WithApiErrors> },
    { path: 'pujas', element: <WithApiErrors><PujasPage /></WithApiErrors> },
  ],
}

export default module
