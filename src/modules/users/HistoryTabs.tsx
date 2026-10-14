import { useState } from 'react'
import { Star } from 'lucide-react'
import { Badge, Card, DataTable, StatusBadge, Tabs, useToast, type Column } from '@/components/ui'
import { astrologerName, panditName, type Customer } from '@/data'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, formatDate, formatDateTime, formatINR, formatNumber } from '@/lib/utils'
import { customerActions, type CustomerHistory } from './data'
import type { CustomerBooking, CustomerConsultation, CustomerOrder, CustomerReview, PointsTxn, WalletTxn } from './types'

type TabKey = 'consultations' | 'bookings' | 'orders' | 'wallet' | 'points' | 'reviews'

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={cn('size-3.5', i < n ? 'fill-gold-400 text-gold-400' : 'text-gray-300')} />
    ))}
  </span>
)

const nowrap = (v: string) => <span className="whitespace-nowrap">{v}</span>

const consultCols: Column<CustomerConsultation>[] = [
  { key: 'id', header: 'Session', render: r => <span className="font-medium" title={r.id}>#{r.id.slice(-6).toUpperCase()}</span> },
  {
    key: 'astro',
    header: 'Astrologer',
    sortValue: r => r.astrologerName ?? astrologerName(r.astrologerId ?? ''),
    render: r => nowrap(r.astrologerName ?? astrologerName(r.astrologerId ?? '')),
  },
  { key: 'type', header: 'Type', render: r => <Badge tone={r.type === 'chat' ? 'brand' : r.type === 'call' ? 'orange' : 'amber'}>{r.type}</Badge> },
  { key: 'at', header: 'Date', sortValue: r => r.startedAt, render: r => nowrap(formatDateTime(r.startedAt)) },
  { key: 'dur', header: 'Duration', align: 'right', sortValue: r => r.durationMin, render: r => `${r.durationMin} min` },
  { key: 'amt', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => <span title={`₹${r.ratePerMin}/min`}>{formatINR(r.amount)}</span> },
  { key: 'rating', header: 'Rating', render: r => (r.rating ? <Stars n={r.rating} /> : <span className="text-muted">—</span>) },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
]

const bookingCols: Column<CustomerBooking>[] = [
  { key: 'id', header: 'Booking', render: r => <span className="font-medium">{r.reference ?? r.id}</span> },
  { key: 'puja', header: 'Puja', sortValue: r => r.puja, render: r => nowrap(r.puja) },
  { key: 'pandit', header: 'Pandit', render: r => nowrap(r.panditName ?? panditName(r.panditId ?? '')) },
  { key: 'at', header: 'Scheduled', sortValue: r => r.scheduledAt, render: r => nowrap(formatDateTime(r.scheduledAt)) },
  { key: 'mode', header: 'Mode', render: r => <Badge tone={r.mode === 'online' ? 'blue' : 'gray'}>{r.mode === 'online' ? 'Online' : 'At home'}</Badge> },
  { key: 'amt', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => formatINR(r.amount) },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
]

const orderCols: Column<CustomerOrder>[] = [
  { key: 'id', header: 'Order', render: r => <span className="font-medium">{r.reference ?? r.id}</span> },
  { key: 'at', header: 'Placed', sortValue: r => r.placedAt, render: r => nowrap(formatDate(r.placedAt)) },
  { key: 'items', header: 'Items', render: r => <span className="line-clamp-1 max-w-64">{r.items.join(', ')}</span> },
  { key: 'pay', header: 'Payment', render: r => r.payment },
  { key: 'amt', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => formatINR(r.amount) },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
]

const walletCols: Column<WalletTxn>[] = [
  { key: 'at', header: 'Date', sortValue: r => r.at, render: r => nowrap(formatDateTime(r.at)) },
  {
    key: 'desc',
    header: 'Description',
    render: r => (
      <span className="flex items-center gap-2">
        {r.description}
        {r.byAdmin && <Badge tone="purple">Admin</Badge>}
      </span>
    ),
  },
  {
    key: 'amt',
    header: 'Amount',
    align: 'right',
    sortValue: r => (r.kind === 'credit' ? r.amount : -r.amount),
    render: r => (
      <span className={cn('font-medium whitespace-nowrap', r.kind === 'credit' ? 'text-emerald-600' : 'text-red-600')}>
        {r.kind === 'credit' ? '+' : '−'}
        {formatINR(r.amount)}
      </span>
    ),
  },
  { key: 'bal', header: 'Balance after', align: 'right', render: r => (r.balanceAfter !== undefined ? formatINR(r.balanceAfter) : <span className="text-muted">—</span>) },
]

const pointsCols: Column<PointsTxn>[] = [
  { key: 'at', header: 'Date', sortValue: r => r.at, render: r => nowrap(formatDateTime(r.at)) },
  { key: 'reason', header: 'Reason', render: r => r.reason },
  {
    key: 'pts',
    header: 'Points',
    align: 'right',
    render: r => (
      <span className={cn('font-medium', r.kind === 'credit' ? 'text-emerald-600' : 'text-red-600')}>
        {r.kind === 'credit' ? '+' : '−'}
        {formatNumber(r.points)}
      </span>
    ),
  },
]

export default function HistoryTabs({ customer, history, onChanged }: { customer: Customer; history: CustomerHistory; onChanged?: () => void }) {
  const [tab, setTab] = useState<TabKey>('consultations')
  const toast = useToast()
  const { can } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)

  const wallet = history.wallet
  const points = history.points
  const reviews: CustomerReview[] = history.reviews
  const toggleReview = async (r: CustomerReview) => {
    if (!can('reviews.manage')) return toast('You do not have permission to moderate reviews', 'error')
    const hide = r.status === 'published'
    setBusy(r.id)
    try {
      await customerActions.setReviewHidden(r.id, hide)
      onChanged?.()
      toast(hide ? 'Review hidden from public listings' : 'Review published', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const reviewCols: Column<CustomerReview>[] = [
    { key: 'at', header: 'Date', sortValue: r => r.at, render: r => nowrap(formatDate(r.at)) },
    { key: 'target', header: 'For', render: r => <Badge tone={r.target === 'consultation' ? 'brand' : r.target === 'puja' ? 'orange' : 'blue'}>{r.target}</Badge> },
    { key: 'subject', header: 'Subject', render: r => <span className="line-clamp-1 max-w-56">{r.subject}</span> },
    { key: 'rating', header: 'Rating', sortValue: r => r.rating, render: r => <Stars n={r.rating} /> },
    { key: 'comment', header: 'Comment', render: r => <span className="line-clamp-2 max-w-72 text-muted">{r.comment}</span> },
    {
      key: 'status',
      header: 'Status',
      render: r => (
        <button
          type="button"
          title={r.status === 'published' ? 'Hide review' : 'Publish review'}
          disabled={busy === r.id}
          onClick={() => toggleReview(r)}>
          <StatusBadge status={r.status === 'hidden' ? 'inactive' : 'published'} />
        </button>
      ),
    },
  ]

  const tabs = [
    { key: 'consultations' as const, label: 'Consultations', count: history.consultations.length },
    { key: 'bookings' as const, label: 'Puja bookings', count: history.bookings.length },
    { key: 'orders' as const, label: 'Orders', count: history.orders.length },
    { key: 'wallet' as const, label: 'Wallet', count: wallet.length },
    { key: 'points' as const, label: 'Points', count: points.length },
    { key: 'reviews' as const, label: 'Reviews', count: reviews.length },
  ]

  return (
    <Card className="overflow-hidden">
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="px-3" />
      <div className="[&>div]:rounded-none [&>div]:border-0">
        {tab === 'consultations' && <DataTable rows={history.consultations} columns={consultCols} rowKey={r => r.id} pageSize={8} empty="No consultations yet" />}
        {tab === 'bookings' && <DataTable rows={history.bookings} columns={bookingCols} rowKey={r => r.id} pageSize={8} empty="No puja bookings yet" />}
        {tab === 'orders' && <DataTable rows={history.orders} columns={orderCols} rowKey={r => r.id} pageSize={8} empty="No store orders yet" />}
        {tab === 'wallet' && (
          <DataTable
            rows={wallet}
            columns={walletCols}
            rowKey={r => r.id}
            pageSize={8}
            filters={[{ key: 'kind', label: 'Type', options: ['credit', 'debit'], match: (r, v) => r.kind === v }]}
            empty="No wallet transactions"
          />
        )}
        {tab === 'points' && (
          <DataTable rows={points} columns={pointsCols} rowKey={r => r.id} pageSize={8} empty={`${formatNumber(customer.rewardPoints)} pts balance · no points activity yet`} />
        )}
        {tab === 'reviews' && <DataTable rows={reviews} columns={reviewCols} rowKey={r => r.id} pageSize={8} empty="No reviews written" />}
      </div>
    </Card>
  )
}
