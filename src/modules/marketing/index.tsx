import { BellRing, Image, TicketPercent } from 'lucide-react'
import { WithApiErrors } from '@/lib/RemoteErrors'
import type { AdminModule } from '../types'
import BannersPage from './BannersPage'
import CouponsPage from './CouponsPage'
import NotificationsPage from './NotificationsPage'
import { campaignsDb } from './data'

const module: AdminModule = {
  nav: [
    { label: 'Coupons & Rewards', path: '/coupons', icon: TicketPercent, group: 'Growth' },
    { label: 'Banners', path: '/banners', icon: Image, group: 'Growth' },
    { label: 'Notifications', path: '/notifications', icon: BellRing, group: 'Growth', badge: () => campaignsDb.snapshot().filter(c => c.status === 'scheduled').length },
  ],
  routes: [
    { path: 'coupons', element: <WithApiErrors><CouponsPage /></WithApiErrors> },
    { path: 'banners', element: <WithApiErrors><BannersPage /></WithApiErrors> },
    { path: 'notifications', element: <WithApiErrors><NotificationsPage /></WithApiErrors> },
  ],
}

export default module
