import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Download, IndianRupee, UserX, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, DataTable, PageHeader, StatCard, StatusBadge, type Column, type Filter } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDate, formatINR } from '@/lib/utils'
import BookingsChart from './BookingsChart'
import { bookingsDb } from './data'
import { bookingStart, downloadCsv } from './pricing'
import type { Booking } from './types'

const STATUSES = ['Upcoming', 'En route', 'Arrived', 'In progress', 'Completed', 'Cancelled']

export default function BookingsPage() {
  const { items, loading } = useCollection(bookingsDb)
  const navigate = useNavigate()

  const [now] = useState(() => new Date())

  const kpi = useMemo(() => {
    const in7 = now.getTime() + 7 * 86_400_000
    const month = items.filter(b => {
      const d = new Date(b.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const closed = items.filter(b => b.status === 'completed' || b.status === 'cancelled')
    return {
      next7: items.filter(b => b.status === 'upcoming' && bookingStart(b).getTime() <= in7).length,
      active: items.filter(b => ['en route', 'arrived', 'in progress'].includes(b.status)).length,
      unassigned: items.filter(b => !b.panditId && b.status !== 'cancelled' && b.status !== 'completed').length,
      revenue: items.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.total, 0) + items.reduce((s, b) => s + (b.cancellation ? b.total - b.cancellation.refundAmount : 0), 0),
      monthCount: month.length,
      cancelRate: closed.length ? Math.round((items.filter(b => b.status === 'cancelled').length / closed.length) * 100) : 0,
    }
  }, [items, now])

  const columns: Column<Booking>[] = [
    {
      key: 'id',
      header: 'Booking',
      sortValue: b => b.createdAt,
      render: b => (
        <div>
          <p className="font-medium">{b.reference}</p>
          <p className="text-xs text-muted">{b.puja}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: b => b.customerName,
      render: b => (
        <div className="flex items-center gap-2.5">
          <Avatar name={b.customerName} size={30} />
          <div className="min-w-0">
            <p className="truncate font-medium whitespace-nowrap">{b.customerName}</p>
            <p className="text-xs text-muted">{b.customerPhone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'pandit',
      header: 'Pandit',
      sortValue: b => (b.panditId ? b.panditName : ''),
      render: b => (b.panditId ? <span className="whitespace-nowrap">{b.panditName}</span> : <Badge tone="amber">Unassigned</Badge>),
    },
    {
      key: 'date',
      header: 'Schedule',
      sortValue: b => bookingStart(b).getTime(),
      render: b => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{formatDate(b.date)}</p>
          <p className="text-xs text-muted">{b.slot}</p>
        </div>
      ),
    },
    { key: 'mode', header: 'Mode', render: b => <Badge tone={b.mode === 'online' ? 'blue' : 'gray'}>{b.mode === 'online' ? 'Online' : 'Home'}</Badge> },
    { key: 'total', header: 'Amount', align: 'right', sortValue: b => b.total, render: b => <span className="font-medium tabular-nums">{formatINR(b.total)}</span> },
    { key: 'payment', header: 'Payment', render: b => <StatusBadge status={b.paymentStatus} /> },
    { key: 'status', header: 'Status', render: b => <StatusBadge status={b.status} /> },
  ]

  const pujas = [...new Set(items.map(b => b.puja))].sort()
  const filters: Filter<Booking>[] = [
    { key: 'status', label: 'Status', options: STATUSES, match: (b, v) => b.status === v.toLowerCase() },
    { key: 'pandit', label: 'Pandit', options: ['Assigned', 'Unassigned'], match: (b, v) => (v === 'Assigned' ? !!b.panditId : !b.panditId) },
    { key: 'puja', label: 'Puja', options: pujas, match: (b, v) => b.puja === v },
    { key: 'mode', label: 'Mode', options: ['Home', 'Online'], match: (b, v) => b.mode === v.toLowerCase() },
  ]

  const exportCsv = () =>
    downloadCsv(
      'puja-bookings.csv',
      ['Booking', 'Customer', 'Phone', 'Pandit', 'Puja', 'Date', 'Slot', 'Mode', 'Subtotal', 'Discount', 'Coupon', 'Total', 'Payment', 'Status'],
      items.map(b => [b.reference, b.customerName, b.customerPhone, b.panditName, b.puja, b.date, b.slot, b.mode, b.price.base, b.discount, b.coupon ?? '', b.total, b.paymentStatus, b.status]),
    )

  return (
    <div>
      <PageHeader
        title="Puja Bookings"
        subtitle="Puja bookings — performed by Shree Astro (live stream) or by an assigned pandit"
        actions={
          <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Upcoming (7 days)" value={kpi.next7} icon={CalendarClock} tone="blue" hint={`${kpi.active} in progress now`} />
        <StatCard label="No pandit assigned" value={kpi.unassigned} icon={UserX} tone="gold" hint="platform-performed unless assigned" />
        <StatCard label="Booking revenue" value={formatINR(kpi.revenue)} icon={IndianRupee} tone="green" hint="net of refunds" />
        <StatCard label="Cancellation rate" value={`${kpi.cancelRate}%`} icon={XCircle} tone="brand" hint="of closed bookings" />
      </div>

      <div className="mb-6">
        <BookingsChart rows={items} />
      </div>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={b => b.id}
        loading={loading}
        searchText={b => `${b.reference} ${b.customerName} ${b.customerPhone} ${b.panditName} ${b.puja}`}
        searchPlaceholder="Search booking, customer, pandit…"
        filters={filters}
        onRowClick={b => navigate(`/bookings/${b.id}`)}
      />
    </div>
  )
}
