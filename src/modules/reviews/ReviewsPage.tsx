import { useEffect, useMemo, useState } from 'react'
import { Camera, EyeOff, Flag, MessageSquare, Star } from 'lucide-react'
import { Badge, DataTable, PageHeader, StatCard, StatusBadge, Tabs, useToast, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { formatDate, formatNumber } from '@/lib/utils'
import { reviewsDb } from './data'
import RatingChart from './RatingChart'
import ReviewDrawer from './ReviewDrawer'
import { Stars } from './Stars'
import { REVIEW_TARGET_TYPES, typeLabel, type Review } from './types'

type Tab = 'all' | 'flagged' | 'hidden'

export default function ReviewsPage() {
  const { items, loading, error } = useCollection(reviewsDb)
  const toast = useToast()
  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])
  const [tab, setTab] = useState<Tab>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const published = items.filter(r => r.status === 'published')
    return {
      avg: published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0,
      flagged: items.filter(r => r.status === 'flagged').length,
      hidden: items.filter(r => r.status === 'hidden').length,
      unreplied: items.filter(r => r.rating <= 2 && !r.partnerReply && !r.adminReply).length,
    }
  }, [items])

  const rows = tab === 'all' ? items : items.filter(r => r.status === tab)

  const columns: Column<Review>[] = [
    {
      key: 'target',
      header: 'Review for',
      sortValue: r => r.targetName,
      render: r => (
        <div className="min-w-44">
          <p className="font-medium">{r.targetName}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge tone="purple">{typeLabel(r.targetType)}</Badge>
            {r.context && <span className="text-xs text-muted">{r.context}</span>}
          </div>
        </div>
      ),
    },
    { key: 'customer', header: 'Customer', sortValue: r => r.customerName, render: r => <span className="whitespace-nowrap">{r.customerName}</span> },
    { key: 'rating', header: 'Rating', sortValue: r => r.rating, render: r => <Stars value={r.rating} /> },
    {
      key: 'text',
      header: 'Review',
      render: r => (
        <div className="max-w-80">
          <p className="line-clamp-2 text-muted">{r.text}</p>
          <div className="mt-1 flex gap-2 text-xs text-muted">
            {r.photos > 0 && <span className="inline-flex items-center gap-1"><Camera className="size-3" /> {r.photos}</span>}
            {(r.partnerReply || r.adminReply) && <span className="text-emerald-600">Replied</span>}
            {r.reportedReason && <span className="inline-flex items-center gap-1 text-amber-700"><Flag className="size-3" /> {r.reportedReason}</span>}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: r => r.status, render: r => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Date', sortValue: r => r.createdAt, render: r => <span className="text-xs whitespace-nowrap text-muted">{formatDate(r.createdAt)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Moderate astrologer, pandit, product and consultation reviews" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Average rating" value={stats.avg.toFixed(2)} icon={Star} tone="gold" hint={`${formatNumber(items.length)} reviews`} />
        <StatCard label="Flagged for review" value={stats.flagged} icon={Flag} hint="Reported by partners / users" />
        <StatCard label="Hidden" value={stats.hidden} icon={EyeOff} tone="purple" />
        <StatCard label="Low ratings unanswered" value={stats.unreplied} icon={MessageSquare} tone="blue" hint="1–2★ without any reply" />
      </div>
      <RatingChart reviews={items} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'flagged', label: 'Flagged', count: stats.flagged },
          { key: 'hidden', label: 'Hidden', count: stats.hidden },
        ]}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={r => r.id}
        loading={loading}
        searchText={r => `${r.ref} ${r.reviewId} ${r.targetName} ${r.context ?? ''} ${r.customerName} ${r.text}`}
        searchPlaceholder="Search review, partner, product, customer…"
        filters={[
          { key: 'type', label: 'Type', options: REVIEW_TARGET_TYPES.map(typeLabel), match: (r, v) => r.targetType === v.toLowerCase() },
          { key: 'rating', label: 'Rating', options: ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★'], match: (r, v) => r.rating === Number(v[0]) },
          { key: 'reply', label: 'Reply', options: ['Replied', 'No reply'], match: (r, v) => !!(r.partnerReply || r.adminReply) === (v === 'Replied') },
        ]}
        onRowClick={r => setOpenId(r.id)}
      />
      <ReviewDrawer review={items.find(r => r.id === openId)} onClose={() => setOpenId(null)} />
    </div>
  )
}
