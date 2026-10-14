import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Download, Hourglass, RefreshCw, X, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, DataTable, PageHeader, Segmented, StatCard, StatusBadge, Tabs, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { exportCsv } from '../partners/shared/csv'
import { approvalsDb, KIND_LABELS } from './data'
import { ReviewDrawer } from './ReviewDrawer'
import { daysSince, partnerPath, summarize } from './summary'
import type { Approval, ApprovalKind, ApprovalStatus } from './types'

type TabKey = 'all' | ApprovalKind
type StatusKey = ApprovalStatus | 'all'

const TAB_ORDER: ApprovalKind[] = ['onboarding', 'price', 'bank', 'certificate', 'document']
const TAB_LABELS: Record<ApprovalKind, string> = {
  onboarding: 'Onboarding / KYC',
  price: 'Price changes',
  bank: 'Bank changes',
  certificate: 'Certificates',
  document: 'Documents',
}

export default function ApprovalsPage() {
  const { items, loading, error, refresh } = useCollection(approvalsDb)
  const [params, setParams] = useSearchParams()
  const partner = params.get('partner')
  const [tab, setTab] = useState<TabKey>('all')
  const [status, setStatus] = useState<StatusKey>('pending')
  const [openId, setOpenId] = useState<string | null>(null)

  const pending = items.filter(a => a.status === 'pending')
  const scoped = partner ? items.filter(a => a.partnerId === partner) : items
  const rows = useMemo(
    () => scoped.filter(a => (tab === 'all' || a.kind === tab) && (status === 'all' || a.status === status)),
    [scoped, tab, status],
  )
  const oldest = pending.reduce((m, a) => Math.max(m, daysSince(a.submittedAt)), 0)
  const thirtyDays = items.filter(a => a.reviewedAt && daysSince(a.reviewedAt) <= 30)
  const opened = items.find(a => a.id === openId)

  const tabs = [
    { key: 'all' as TabKey, label: 'All', count: scoped.filter(a => a.status === 'pending').length },
    ...TAB_ORDER.map(k => ({ key: k as TabKey, label: TAB_LABELS[k], count: scoped.filter(a => a.kind === k && a.status === 'pending').length })),
  ]

  const columns: Column<Approval>[] = [
    { key: 'id', header: 'Request', sortValue: a => a.ref, render: a => <span className="font-mono text-xs text-muted">{a.ref}</span> },
    {
      key: 'partner',
      header: 'Requester',
      sortValue: a => a.partnerName,
      render: a => (
        <div className="flex items-center gap-2.5">
          <Avatar name={a.partnerName.replace('Pandit ', '')} src={a.photoUrl ?? undefined} size={32} />
          <div className="min-w-0">
            <Link to={partnerPath(a)} onClick={e => e.stopPropagation()} className="font-medium whitespace-nowrap text-ink hover:text-brand-600 hover:underline">
              {a.partnerName}
            </Link>
            <p className="text-xs text-muted">
              {a.partnerType === 'astrologer' ? 'Astrologer' : 'Pandit'}
              {a.partnerCode ? ` · ${a.partnerCode}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', sortValue: a => a.kind, render: a => <Badge tone={a.kind === 'price' ? 'orange' : a.kind === 'bank' ? 'blue' : a.kind === 'onboarding' ? 'purple' : 'gray'}>{KIND_LABELS[a.kind]}</Badge> },
    { key: 'summary', header: 'Details', render: a => <span className="text-sm text-ink">{summarize(a)}</span> },
    {
      key: 'submitted',
      header: 'Submitted',
      sortValue: a => a.submittedAt,
      render: a => (
        <div className="whitespace-nowrap">
          <p className="text-sm">{formatDateTime(a.submittedAt)}</p>
          {a.status === 'pending' && <p className={daysSince(a.submittedAt) >= 5 ? 'text-xs text-red-600' : 'text-xs text-muted'}>{daysSince(a.submittedAt)}d waiting</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: a => a.status, render: a => <StatusBadge status={a.status} /> },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: a => (
        <Button size="sm" variant={a.status === 'pending' ? 'secondary' : 'ghost'} onClick={e => { e.stopPropagation(); setOpenId(a.id) }}>
          {a.status === 'pending' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ]

  const download = () =>
    exportCsv(`approvals-${tab}-${status}.csv`, rows, [
      { header: 'Request ID', value: a => a.ref },
      { header: 'Partner', value: a => a.partnerName },
      { header: 'Partner ID', value: a => a.partnerCode || a.partnerId },
      { header: 'Partner type', value: a => a.partnerType },
      { header: 'Type', value: a => KIND_LABELS[a.kind] },
      { header: 'Details', value: a => summarize(a) },
      { header: 'Submitted', value: a => a.submittedAt },
      { header: 'Status', value: a => a.status },
      { header: 'Reviewed at', value: a => a.reviewedAt },
      { header: 'Reason', value: a => a.reason },
    ])

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Every partner request that needs an admin decision — onboarding, pricing, payout accounts, documents and certificates."
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void refresh().catch(() => undefined)}>
              Refresh
            </Button>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={download}>
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending requests" value={pending.length} icon={Hourglass} tone="gold" hint={`${pending.filter(a => a.kind === 'onboarding').length} onboarding`} />
        <StatCard label="Oldest pending" value={`${oldest} days`} icon={Clock} tone="brand" hint={`${pending.filter(a => daysSince(a.submittedAt) >= 5).length} older than 5 days`} />
        <StatCard label="Approved (30 days)" value={thirtyDays.filter(a => a.status === 'approved').length} icon={CheckCircle2} tone="green" />
        <StatCard label="Rejected (30 days)" value={thirtyDays.filter(a => a.status === 'rejected').length} icon={XCircle} tone="purple" />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<StatusKey>
          options={[
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'all', label: 'All' },
          ]}
          value={status}
          onChange={setStatus}
        />
        {partner && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1.5 pl-3 text-xs font-medium text-brand-600">
            Partner: {scoped[0]?.partnerName ?? partner}
            <button
              type="button"
              aria-label="Clear partner filter"
              className="rounded-full p-0.5 hover:bg-brand-100"
              onClick={() => {
                params.delete('partner')
                setParams(params)
              }}>
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      <DataTable
        key={`${tab}-${status}-${partner ?? ''}`}
        rows={rows}
        columns={columns}
        rowKey={a => a.id}
        loading={loading}
        searchText={a => `${a.ref} ${a.partnerName} ${a.partnerCode ?? ''} ${summarize(a)}`}
        searchPlaceholder="Search partner, request ID…"
        filters={[{ key: 'ptype', label: 'Partner', options: ['Astrologer', 'Pandit'], match: (a, v) => a.partnerType === v.toLowerCase() }]}
        onRowClick={a => setOpenId(a.id)}
        empty={error ? `Could not load requests — ${errorMessage(error)}` : status === 'pending' ? 'No pending requests — all caught up' : 'No requests found'}
      />

      <ReviewDrawer approval={opened} onClose={() => setOpenId(null)} />
    </>
  )
}
