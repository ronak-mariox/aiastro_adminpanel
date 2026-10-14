import { LayoutDashboard } from 'lucide-react'
import type { AdminModule } from '../types'
import DashboardPage from './DashboardPage'

const module: AdminModule = {
  nav: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Overview' }],
  routes: [{ index: true, element: <DashboardPage /> }],
}

export default module
