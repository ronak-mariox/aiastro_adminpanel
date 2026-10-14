import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Download, Flag, IndianRupee, MessageSquare, PhoneMissed, Radio } from 'lucide-react'
import { Avatar, Button, DataTable, PageHeader, StatCard, StatusBadge, Tabs, useToast, type Column, type Filter } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { formatDateTime, formatINR } from '@/lib/utils'
import { consultationsDb, giftsDb, TOPICS } from './data'
import GiftsCatalogue from './GiftsCatalogue'
import { billing, downloadCsv, formatDuration, isToday, sessionSeconds } from './helpers'
import RevenueChart from './RevenueChart'
import TypeBadge from './TypeBadge'
import type { Consultation } from './types'
import { useNow } from './useNow'

type TabKey = 'all' | 'live' | 'missed' | 'flagged' | 'gifts'

export default function ConsultationsPage() {
  const { items, loading, error } = useCollection(consultationsDb)
  const toast = useToast()
  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])
  const { items: gifts } = useCollection(giftsDb)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey | null) ?? 'all'
  const navigate = useNavigate()
  const now = useNow(5000)

  const kpi = useMemo(() => {
    const today = items.filter(c => isToday(c.startedAt))
    const done = items.filter(c => c.status === 'completed' || c.status === 'refunded')
    const avg = done.length ? Math.round(done.reduce((s, c) => s + c.durationSec, 0) / done.length) : 0
    const missedToday = today.filter(c => c.status === 'missed').length
    return {
      live: items.filter(c => c.status === 'ongoing').length,
      todayCount: today.length,
      todayRevenue: today.filter(c => c.status !== 'missed' && c.status !== 'cancelled').reduce((s, c) => s + billing(c, now).gross - (c.refund?.amount ?? 0), 0),
      avg,
      missedRate: items.length ? Math.round((items.filter(c => c.status === 'missed').length / items.length) * 100) : 0,
      missedToday,
    }
  }, [items, now])

  const rows = useMemo(() => {
    if (tab === 'live') return items.filter(c => c.status === 'ongoing')
    if (tab === 'missed') return items.filter(c => c.status === 'missed')
    if (tab === 'flagged') return items.filter(c => c.flagged)
    return items
  }, [items, tab])

  const columns: Column<Consultation>[] = [
    {
      key: 'id',
      header: 'Session',
      sortValue: c => c.startedAt,
      render: c => (
        <div>
          <p className="flex items-center gap-1.5 font-medium">
            {c.ref}
            {c.flagged && <Flag className="size-3.5 fill-red-500 text-red-500" />}
          </p>
          <p className="text-xs text-muted">{formatDateTime(c.startedAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: c => c.customerName,
      render: c => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.customerName} size={30} />
          <div className="min-w-0">
            <p className="truncate font-medium">{c.customerName}</p>
            {c.customerCode && <p className="text-xs text-muted">{c.customerCode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'astrologer',
      header: 'Astrologer',
      sortValue: c => c.astrologerName,
      render: c => (
        <div>
          <p className="font-medium whitespace-nowrap">{c.astrologerName}</p>
          <p className="text-xs text-muted">{formatINR(c.ratePerMin)}/min</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: c => <TypeBadge type={c.type} /> },
    { key: 'topic', header: 'Topic', render: c => <span className="whitespace-nowrap text-muted">{c.intake.topic}</span> },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      sortValue: c => sessionSeconds(c, now),
      render: c => <span className="tabular-nums">{formatDuration(sessionSeconds(c, now))}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: c => billing(c, now).gross,
      render: c => {
        const b = billing(c, now)
        return (
          <div>
            <p className="font-medium tabular-nums">{formatINR(b.gross)}</p>
            {b.giftsTotal > 0 && <p className="text-xs text-muted">incl. {formatINR(b.giftsTotal)} gifts</p>}
          </div>
        )
      },
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'center',
      sortValue: c => c.rating ?? 0,
      render: c => (c.rating ? <span className="font-medium text-amber-600">★ {c.rating}</span> : <span className="text-muted">—</span>),
    },
    { key: 'status', header: 'Status', render: c => <StatusBadge status={c.status} /> },
  ]

  const filters: Filter<Consultation>[] = [
    { key: 'type', label: 'Type', options: ['Chat', 'Call', 'Video'], match: (c, v) => c.type === v.toLowerCase() },
    { key: 'status', label: 'Status', options: ['Requested', 'Ongoing', 'Completed', 'Missed', 'Cancelled', 'Refunded'], match: (c, v) => c.status === v.toLowerCase() },
    { key: 'topic', label: 'Topic', options: TOPICS, match: (c, v) => c.intake.topic === v },
  ]

  const exportCsv = () =>
    downloadCsv(
      `consultations-${tab}.csv`,
      ['ID', 'Customer', 'Astrologer', 'Type', 'Status', 'Started', 'Duration (s)', 'Rate/min', 'Charges', 'Gifts', 'Commission', 'Astrologer share', 'Refunded', 'Rating', 'Topic'],
      rows.map(c => {
        const b = billing(c)
        return [c.ref, c.customerName, c.astrologerName, c.type, c.status, c.startedAt, b.secs, c.ratePerMin, b.charges, b.giftsTotal, b.commission, b.astrologerShare, b.refunded, c.rating ?? '', c.intake.topic]
      }),
    )

  const setTab = (k: TabKey) => setParams(k === 'all' ? {} : { tab: k }, { replace: true })

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle="Chat, call & video sessions between customers and astrologers"
        actions={
          tab !== 'gifts' && (
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export CSV
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Live now" value={kpi.live} icon={Radio} tone="brand" hint="ongoing sessions" />
        <StatCard label="Today's sessions" value={kpi.todayCount} icon={MessageSquare} tone="blue" hint={`${kpi.missedToday} missed today`} />
        <StatCard label="Today's revenue" value={formatINR(kpi.todayRevenue)} icon={IndianRupee} tone="green" hint="net of refunds" />
        <StatCard label="Avg duration" value={formatDuration(kpi.avg)} icon={Clock} tone="purple" hint="completed sessions" />
        <StatCard label="Missed rate" value={`${kpi.missedRate}%`} icon={PhoneMissed} tone="gold" hint="not accepted in 120s" />
      </div>

      <Tabs<TabKey>
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'live', label: 'Live now', count: kpi.live },
          { key: 'missed', label: 'Missed', count: items.filter(c => c.status === 'missed').length },
          { key: 'flagged', label: 'Flagged', count: items.filter(c => c.flagged).length },
          { key: 'gifts', label: 'Gifts catalogue', count: gifts.length },
        ]}
      />

      {tab === 'gifts' ? (
        <GiftsCatalogue />
      ) : (
        <div className="space-y-6">
          {tab === 'all' && <RevenueChart rows={items} now={now} />}
          <DataTable
            key={tab}
            rows={rows}
            columns={columns}
            rowKey={c => c.id}
            loading={loading}
            searchText={c => `${c.ref} ${c.id} ${c.customerName} ${c.astrologerName} ${c.customerCode ?? ''} ${c.customerId} ${c.astrologerId} ${c.intake.name}`}
            searchPlaceholder="Search by session, customer, astrologer…"
            filters={filters}
            onRowClick={c => navigate(`/consultations/${c.id}`)}
            empty={tab === 'live' ? 'No sessions are live right now' : undefined}
          />
        </div>
      )}
    </div>
  )
}
