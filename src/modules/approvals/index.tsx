import { ShieldCheck } from 'lucide-react'
import type { AdminModule } from '../types'
import ApprovalsPage from './ApprovalsPage'
import { pendingApprovals } from './data'

const module: AdminModule = {
  nav: [{ label: 'Approvals', path: '/approvals', icon: ShieldCheck, group: 'Partners', badge: pendingApprovals, permission: ['astrologers.view', 'astrologers.approve'] }],
  routes: [{ path: 'approvals', element: <ApprovalsPage /> }],
}

export default module
