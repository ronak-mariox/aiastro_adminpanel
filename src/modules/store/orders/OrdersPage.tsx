import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, IndianRupee, PackageOpen, ShoppingBag, Undo2 } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, StatCard, Tabs, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDateTime, formatINR, formatNumber } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ordersDb } from '../data'
import { OrderStatusBadge, PaymentBadge } from '../shared'
import { downloadCsv } from '../lib'
import type { Order, OrderStatus } from '../types'

type TabKey = 'all' | OrderStatus | 'returns'

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()
const hasOpenReturn = (o: Order) => o.returnRequest?.status === 'requested'
const itemCount = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0)

export default function OrdersPage() {
  const navigate = useNavigate()
  const { items, loading } = useCollection(ordersDb)
  const [tab, setTab] = useState<TabKey>('all')
  const [visibleRows, setVisibleRows] = useState<Order[]>([])
  const [now] = useState(() => Date.now())

  const stats = useMemo(() => {
    const today = items.filter(o => isToday(o.placedAt))
    const live = (o: Order) => o.status !== 'cancelled' && o.status !== 'returned'
    return {
      todayCount: today.length,
      todayRevenue: today.filter(live).reduce((s, o) => s + o.total, 0),
      pendingDispatch: items.filter(o => o.status === 'processing' || o.status === 'packed').length,
      openReturns: items.filter(hasOpenReturn).length,
      returned: items.filter(o => o.status === 'returned').length,
    }
  }, [items])

  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (13 - i))
      return d
    })
    return days.map(d => {
      const list = items.filter(o => new Date(o.placedAt).toDateString() === d.toDateString() && o.status !== 'cancelled')
      return { day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), revenue: list.reduce((s, o) => s + o.total, 0), orders: list.length }
    })
  }, [items, now])

  const rows = useMemo(() => {
    if (tab === 'all') return items
    if (tab === 'returns') return items.filter(o => o.returnRequest)
    return items.filter(o => o.status === tab)
  }, [items, tab])

  const count = (k: TabKey) => (k === 'all' ? items.length : k === 'returns' ? items.filter(o => o.returnRequest).length : items.filter(o => o.status === k).length)
  const tabKeys: TabKey[] = ['all', 'processing', 'packed', 'transit', 'delivered', 'cancelled', 'returns']

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Order',
      sortValue: o => o.placedAt,
      render: o => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-ink">#{o.reference}</p>
          <p className="text-xs text-muted">{formatDateTime(o.placedAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: o => o.customerName,
      render: o => (
        <div className="whitespace-nowrap">
          <p>{o.customerName}</p>
          <p className="text-xs text-muted">{o.address.city}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      sortValue: itemCount,
      render: o => (
        <div className="max-w-56">
          <p className="truncate">{o.items[0]?.name}</p>
          <p className="text-xs text-muted">
            {itemCount(o)} item{itemCount(o) > 1 ? 's' : ''}
            {o.coupon && ` · ${o.coupon}`}
          </p>
        </div>
      ),
    },
    { key: 'total', header: 'Total', align: 'right', sortValue: o => o.total, render: o => <span className="font-medium">{formatINR(o.total)}</span> },
    {
      key: 'payment',
      header: 'Payment',
      sortValue: o => o.paymentMethod,
      render: o => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xs font-medium text-muted">{o.paymentMethod}</span>
          <PaymentBadge status={o.paymentStatus} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: o => o.status,
      render: o => (
        <div className="flex flex-col items-start gap-1">
          <OrderStatusBadge status={o.status} />
          {hasOpenReturn(o) && <Badge tone="orange">Return requested</Badge>}
        </div>
      ),
    },
    {
      key: 'courier',
      header: 'Courier / AWB',
      render: o => (o.awb ? <div className="text-xs whitespace-nowrap"><p className="font-medium">{o.courier}</p><p className="text-muted">{o.awb}</p></div> : <span className="text-xs text-muted">—</span>),
    },
  ]

  const exportCsv = () =>
    downloadCsv(`astrovati-orders-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, visibleRows, [
      { header: 'Order', value: o => o.reference },
      { header: 'Placed At', value: o => o.placedAt },
      { header: 'Customer ID', value: o => o.customerId },
      { header: 'Customer', value: o => o.customerName },
      { header: 'City', value: o => o.address.city },
      { header: 'Items', value: o => o.items.map(i => `${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.qty}`).join(' | ') },
      { header: 'Subtotal', value: o => o.subtotal },
      { header: 'Discount', value: o => o.discount },
      { header: 'Coupon', value: o => o.coupon },
      { header: 'Shipping', value: o => o.shipping },
      { header: 'GST', value: o => o.gst },
      { header: 'Total', value: o => o.total },
      { header: 'Payment Method', value: o => o.paymentMethod },
      { header: 'Payment Status', value: o => o.paymentStatus },
      { header: 'Status', value: o => ORDER_STATUS_LABEL[o.status] },
      { header: 'Courier', value: o => o.courier },
      { header: 'AWB', value: o => o.awb },
    ])

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="AstroVati store orders — dispatch, tracking, cancellations & returns"
        actions={
          <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's orders" value={formatNumber(stats.todayCount)} icon={ShoppingBag} hint={`${items.length} orders in total`} />
        <StatCard label="Today's revenue" value={formatINR(stats.todayRevenue)} icon={IndianRupee} tone="green" />
        <StatCard label="Pending dispatch" value={formatNumber(stats.pendingDispatch)} icon={PackageOpen} tone="gold" hint="Processing + packed" />
        <StatCard label="Returns" value={formatNumber(stats.openReturns)} icon={Undo2} tone="purple" hint={`awaiting review · ${stats.returned} returned`} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Revenue — last 14 days" subtitle="Excludes cancelled orders" />
        <CardBody className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="ordRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8102e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#c8102e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${Number(v) / 1000}k`} />
              <Tooltip formatter={(v, n) => (n === 'revenue' ? formatINR(Number(v)) : v)} />
              <Area type="monotone" dataKey="revenue" stroke="#c8102e" strokeWidth={2} fill="url(#ordRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={tabKeys.map(k => ({ key: k, label: k === 'all' ? 'All' : k === 'returns' ? 'Returns' : ORDER_STATUS_LABEL[k], count: count(k) }))}
      />

      <DataTable
        key={tab}
        rows={rows}
        columns={columns}
        rowKey={o => o.id}
        loading={loading}
        searchText={o => `${o.reference} ${o.customerName} ${o.customerPhone} ${o.address.phone} ${o.awb ?? ''} ${o.items.map(i => i.name).join(' ')}`}
        searchPlaceholder="Order ID, customer, phone, AWB…"
        onRowClick={o => navigate(`/orders/${o.id}`)}
        onVisibleRowsChange={setVisibleRows}
        filters={[
          { key: 'method', label: 'Payment', options: ['COD', 'UPI', 'Card', 'Wallet'], match: (o, v) => o.paymentMethod === v },
          { key: 'pstatus', label: 'Pay status', options: ['Paid', 'Pending', 'Refunded', 'Failed', 'Cancelled'], match: (o, v) => o.paymentStatus === v.toLowerCase() },
          { key: 'coupon', label: 'Coupon', options: ['With coupon', 'No coupon'], match: (o, v) => (v === 'With coupon') === !!o.coupon },
        ]}
      />
    </>
  )
}
