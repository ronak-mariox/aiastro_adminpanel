import { ArrowLeftRight, Banknote, Percent, Undo2 } from 'lucide-react'
import type { AdminModule } from '../types'
import { payoutsDb, refundsDb } from './data'
import PayoutsPage from './PayoutsPage'
import PricingPage from './PricingPage'
import RefundsPage from './RefundsPage'
import TransactionsPage from './TransactionsPage'

// The nav badges read the loaded snapshots; load each list once so the counts show before the page is opened.
const primed = new Set<string>()
const prime = (key: string, load: () => Promise<unknown>) => {
  if (primed.has(key)) return
  primed.add(key)
  load().catch(() => primed.delete(key))
}

const module: AdminModule = {
  nav: [
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight, group: 'Finance', permission: 'payments.view' },
    {
      label: 'Payouts',
      path: '/payouts',
      icon: Banknote,
      group: 'Finance',
      permission: ['wallets.view', 'payouts.approve'],
      badge: () => {
        prime('payouts', () => payoutsDb.list())
        return payoutsDb.snapshot().filter(p => p.status === 'pending').length
      },
    },
    {
      label: 'Refunds',
      path: '/refunds',
      icon: Undo2,
      group: 'Finance',
      permission: ['payments.view', 'payments.refund'],
      badge: () => {
        prime('refunds', () => refundsDb.list())
        return refundsDb.snapshot().filter(r => r.status === 'pending').length
      },
    },
    { label: 'Pricing & Fees', path: '/pricing', icon: Percent, group: 'Finance', permission: 'settings.view' },
  ],
  routes: [
    { path: 'transactions', element: <TransactionsPage /> },
    { path: 'payouts', element: <PayoutsPage /> },
    { path: 'refunds', element: <RefundsPage /> },
    { path: 'pricing', element: <PricingPage /> },
  ],
}

export default module
