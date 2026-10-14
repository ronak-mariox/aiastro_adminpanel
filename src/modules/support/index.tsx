import { Inbox, LifeBuoy } from 'lucide-react'
import type { AdminModule } from '../types'
import { inquiriesDb, needsAttention, ticketsDb } from './data'
import LeadsPage from './LeadsPage'
import TicketDetailPage from './TicketDetailPage'
import TicketsPage from './TicketsPage'

const module: AdminModule = {
  nav: [
    {
      label: 'Support Tickets',
      path: '/support',
      icon: LifeBuoy,
      group: 'Support',
      permission: 'consultations.view',
      badge: () => ticketsDb.snapshot().filter(needsAttention).length,
    },
    { label: 'Leads & Inquiries', path: '/leads', icon: Inbox, group: 'Support', permission: 'users.view', badge: () => inquiriesDb.snapshot().filter(i => i.status === 'new').length },
  ],
  routes: [
    { path: 'support', element: <TicketsPage /> },
    { path: 'support/:id', element: <TicketDetailPage /> },
    { path: 'leads', element: <LeadsPage /> },
  ],
}

export default module
