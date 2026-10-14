import { MessagesSquare } from 'lucide-react'
import type { AdminModule } from '../types'
import ConsultationDetail from './ConsultationDetail'
import ConsultationsPage from './ConsultationsPage'
import { consultationsDb } from './data'

export { consultationsDb, giftsDb } from './data'
export type { Consultation, Gift } from './types'

const module: AdminModule = {
  nav: [
    {
      label: 'Consultations',
      path: '/consultations',
      icon: MessagesSquare,
      group: 'Operations',
      permission: 'consultations.view',
      badge: () => consultationsDb.snapshot().filter(c => c.status === 'ongoing').length,
    },
  ],
  routes: [
    { path: 'consultations', element: <ConsultationsPage /> },
    { path: 'consultations/:id', element: <ConsultationDetail /> },
  ],
}

export default module
