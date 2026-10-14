import { Flame, Sparkles } from 'lucide-react'
import type { AdminModule } from '../types'
import AstrologerDetail from './astrologers/AstrologerDetail'
import AstrologersPage from './astrologers/AstrologersPage'
import PanditDetail from './pandits/PanditDetail'
import PanditsPage from './pandits/PanditsPage'

const module: AdminModule = {
  nav: [
    { label: 'Astrologers', path: '/astrologers', icon: Sparkles, group: 'Partners', permission: 'astrologers.view' },
    { label: 'Pandits', path: '/pandits', icon: Flame, group: 'Partners', permission: 'astrologers.view' },
  ],
  routes: [
    { path: 'astrologers', element: <AstrologersPage /> },
    { path: 'astrologers/:id', element: <AstrologerDetail /> },
    { path: 'pandits', element: <PanditsPage /> },
    { path: 'pandits/:id', element: <PanditDetail /> },
  ],
}

export default module
