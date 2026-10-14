import { Gem, Package } from 'lucide-react'
import { WithApiErrors } from '@/lib/RemoteErrors'
import type { AdminModule } from '../types'
import { pendingOrderCount, productStatus, productsDb } from './data'
import OrderDetailPage from './orders/OrderDetailPage'
import OrdersPage from './orders/OrdersPage'
import ProductEditorPage from './products/ProductEditorPage'
import ProductsPage from './products/ProductsPage'

// Shared data for other modules (dashboard, reviews, finance…) — live API collections.
export { categoriesDb, ordersDb, productsDb, purposesDb, productStatus, totalStock } from './data'
export type { Order, OrderStatus, PaymentMethod, PaymentStatus, Product, Taxonomy } from './types'

const module: AdminModule = {
  nav: [
    { label: 'Products', path: '/products', icon: Gem, group: 'Store', badge: () => productsDb.snapshot().filter(p => productStatus(p) === 'out of stock').length },
    { label: 'Orders', path: '/orders', icon: Package, group: 'Store', badge: pendingOrderCount },
  ],
  routes: [
    { path: 'products', element: <WithApiErrors><ProductsPage /></WithApiErrors> },
    { path: 'products/new', element: <WithApiErrors><ProductEditorPage key="new" /></WithApiErrors> },
    { path: 'products/:id', element: <WithApiErrors><ProductEditorPage /></WithApiErrors> },
    { path: 'orders', element: <WithApiErrors><OrdersPage /></WithApiErrors> },
    { path: 'orders/:id', element: <WithApiErrors><OrderDetailPage /></WithApiErrors> },
  ],
}

export default module
