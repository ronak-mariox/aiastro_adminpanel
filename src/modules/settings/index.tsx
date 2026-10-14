import { Settings, UserCog } from 'lucide-react'
import { WithApiErrors } from '@/lib/RemoteErrors'
import type { AdminModule } from '../types'
import AdminsPage from './AdminsPage'
import SettingsPage from './SettingsPage'

const module: AdminModule = {
  nav: [
    { label: 'Settings', path: '/settings', icon: Settings, group: 'System' },
    { label: 'Admin Users', path: '/admins', icon: UserCog, group: 'System' },
  ],
  routes: [
    { path: 'settings', element: <WithApiErrors><SettingsPage /></WithApiErrors> },
    { path: 'admins', element: <WithApiErrors><AdminsPage /></WithApiErrors> },
  ],
}

export default module
