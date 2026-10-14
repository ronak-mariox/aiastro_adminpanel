import { Users } from 'lucide-react'
import type { AdminModule } from '../types'
import CustomerDetailPage from './CustomerDetailPage'
import CustomersPage from './CustomersPage'

const module: AdminModule = {
  nav: [{ label: 'Customers', path: '/customers', icon: Users, group: 'Overview' }],
  routes: [
    { path: 'customers', element: <CustomersPage /> },
    { path: 'customers/:id', element: <CustomerDetailPage /> },
  ],
}

export default module
