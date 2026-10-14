import { useEffect, useMemo, useState } from 'react'
import { CheckCheck, Clock, Download, Hourglass, IndianRupee, Loader } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  PageHeader,
  StatCard,
  StatusBadge,
  Tabs,
  useConfirm,
  useToast,
  type Column,
  type Filter,
} from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { formatDateTime, formatINR } from '@/lib/utils'
import { partnerName, payoutsDb, transactionsDb } from './data'
import { MarkPaidModal, PayoutDrawer } from './PayoutDrawer'
import type { Payout, PayoutStatus } from './types'
import { downloadCSV, formatDuration, hoursBetween, isThisMonth } from './utils'

type Tab = PayoutStatus | 'all'
const TABS: Tab[] = ['pending', 'processing', 'completed', 'rejected', 'all']

export default function PayoutsPage() {
  const { items, loading, error, update } = useCollection(payoutsDb)
  const confirm = useConfirm()
  const toast = useToast()
  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])
  const [tab, setTab] = useState<Tab>('pending')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const rows = useMemo(() => (tab === 'all' ? items : items.filter(p => p.status === tab)), [items, tab])
  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t, t === 'all' ? items.length : items.filter(p => p.status === t).length])), [items])

  const kpis = useMemo(() => {
    const pending = items.filter(p => p.status === 'pending')
    const processing = items.filter(p => p.status === 'processing')
    const paid = items.filter(p => p.status === 'completed' && p.completedAt && isThisMonth(p.completedAt))
    const done = items.filter(p => p.status === 'completed' && p.completedAt)
    const avg = done.length ? done.reduce((s, p) => s + hoursBetween(p.requestedAt, p.completedAt!), 0) / done.length : 0
    return {
      pendingAmount: pending.reduce((s, p) => s + p.amount, 0),
      pendingCount: pending.length,
      processingAmount: processing.reduce((s, p) => s + p.amount, 0),
      processingCount: processing.length,
      paidAmount: paid.reduce((s, p) => s + p.amount, 0),
      paidCount: paid.length,
      avg,
    }
  }, [items])

  const pendingInView = rows.filter(p => p.status === 'pending')
  const selectedPending = pendingInView.filter(p => selected.has(p.id))
  const allChecked = pendingInView.length > 0 && selectedPending.length === pendingInView.length

  const toggle = (id: string) =>
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const approve = async (p: Payout) => {
    const ok = await confirm({
      title: 'Approve payout?',
      message: `${formatINR(p.amount)} to ${partnerName(p.partnerType, p.partnerId)} (${p.account}) will move to processing for bank transfer.`,
      confirmLabel: 'Approve',
    })
    if (ok === false) return
    try {
      await update(p.id, { status: 'processing', processedAt: new Date().toISOString() })
      toast(`${p.id} approved — now processing`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const bulkApprove = async () => {
    const list = selectedPending
    const sum = list.reduce((s, p) => s + p.amount, 0)
    const ok = await confirm({
      title: `Approve ${list.length} payouts?`,
      message: `A total of ${formatINR(sum)} will move to processing.`,
      confirmLabel: 'Approve all',
    })
    if (ok === false) return
    setBulkBusy(true)
    const now = new Date().toISOString()
    const results = await Promise.allSettled(list.map(p => update(p.id, { status: 'processing', processedAt: now })))
    setBulkBusy(false)
    setSelected(new Set())
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length) toast(`${list.length - failed.length} approved, ${failed.length} failed: ${errorMessage((failed[0] as PromiseRejectedResult).reason)}`, 'error')
    else toast(`${list.length} payouts approved`)
  }

  const reject = async (p: Payout) => {
    const reason = await confirm({
      title: 'Reject payout?',
      message: `${formatINR(p.amount)} will be returned to ${partnerName(p.partnerType, p.partnerId)}'s withdrawable balance. The partner will see your reason.`,
      confirmLabel: 'Reject',
      tone: 'danger',
      withReason: true,
      reasonLabel: 'Reason (shown to partner)',
    })
    if (reason === false) return
    try {
      // The backend returns the held amount to the partner's withdrawable balance and notifies them.
      await update(p.id, { status: 'rejected', rejectReason: reason, completedAt: new Date().toISOString() })
      setOpenId(null)
      toast(`${p.id} rejected`, 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const markPaid = async (utr: string) => {
    const p = items.find(x => x.id === payingId)
    if (!p) return
    try {
      // Settles the withdrawal (astrologer: ledger debit row; pandit: balance → withdrawn) and notifies the partner.
      await update(p.id, { status: 'completed', utr, completedAt: new Date().toISOString() })
    } catch (e) {
      toast(errorMessage(e), 'error')
      return
    }
    if (transactionsDb.snapshot().length) void transactionsDb.refresh?.().catch(() => undefined)
    setPayingId(null)
    toast(`${p.id} marked paid · UTR ${utr}`)
  }

  const exportCSV = () =>
    downloadCSV(
      `vedrashi-payouts-${tab}.csv`,
      ['ID', 'Partner type', 'Partner ID', 'Partner', 'Amount', 'Method', 'Account', 'IFSC', 'Requested', 'Status', 'UTR', 'Reject reason'],
      rows.map(p => [p.id, p.partnerType, p.partnerId, partnerName(p.partnerType, p.partnerId), p.amount, p.method, p.account, p.ifsc, p.requestedAt, p.status, p.utr, p.rejectReason]),
    )

  const columns: Column<Payout>[] = [
    ...(pendingInView.length > 0
      ? [
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                aria-label="Select all pending"
                className="size-4 accent-brand-600"
                checked={allChecked}
                onChange={() => setSelected(allChecked ? new Set() : new Set(pendingInView.map(p => p.id)))}
              />
            ),
            className: 'w-10',
            render: (p: Payout) =>
              p.status === 'pending' ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${p.id}`}
                  className="size-4 accent-brand-600"
                  checked={selected.has(p.id)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggle(p.id)}
                />
              ) : null,
          },
        ]
      : []),
    {
      key: 'partner',
      header: 'Partner',
      sortValue: p => partnerName(p.partnerType, p.partnerId),
      render: p => {
        const name = partnerName(p.partnerType, p.partnerId)
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} size={32} />
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-xs text-muted">
                {p.partnerCode ?? p.id} · <span className="capitalize">{p.partnerType}</span>
              </p>
            </div>
          </div>
        )
      },
    },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: p => p.amount, render: p => <span className="font-semibold">{formatINR(p.amount)}</span> },
    {
      key: 'method',
      header: 'Destination',
      sortValue: p => p.method,
      render: p => (
        <div>
          <Badge tone={p.method === 'bank' ? 'blue' : 'purple'}>{p.method === 'bank' ? 'Bank' : 'UPI'}</Badge>
          <p className="mt-1 text-xs text-muted">{p.account}</p>
        </div>
      ),
    },
    { key: 'requested', header: 'Requested', sortValue: p => p.requestedAt, render: p => <span className="text-muted">{formatDateTime(p.requestedAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      sortValue: p => p.status,
      render: p => (
        <div>
          <StatusBadge status={p.status} />
          {p.utr && <p className="mt-1 font-mono text-[11px] text-muted">UTR {p.utr}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: p => (
        <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {p.status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => reject(p)}>
                Reject
              </Button>
              <Button size="sm" variant="secondary" onClick={() => approve(p)}>
                Approve
              </Button>
            </>
          )}
          {p.status === 'processing' && (
            <Button size="sm" variant="success" onClick={() => setPayingId(p.id)}>
              Mark paid
            </Button>
          )}
        </div>
      ),
    },
  ]

  const filters: Filter<Payout>[] = [
    { key: 'partnerType', label: 'Partner', options: ['astrologer', 'pandit'], match: (p, v) => p.partnerType === v },
    { key: 'method', label: 'Method', options: ['bank', 'upi'], match: (p, v) => p.method === v },
  ]

  const open = items.find(p => p.id === openId) ?? null
  const paying = items.find(p => p.id === payingId) ?? null

  return (
    <>
      <PageHeader
        title="Payouts"
        subtitle="Withdrawal requests from astrologers and pandits"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Payouts' }]}
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCSV}>
              Export
            </Button>
            <Button icon={<CheckCheck className="size-4" />} disabled={selectedPending.length === 0} loading={bulkBusy} onClick={bulkApprove}>
              Approve selected{selectedPending.length > 0 && ` (${selectedPending.length})`}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending amount" value={formatINR(kpis.pendingAmount)} icon={Hourglass} hint={`${kpis.pendingCount} requests awaiting approval`} />
        <StatCard label="In processing" value={formatINR(kpis.processingAmount)} icon={Loader} tone="gold" hint={`${kpis.processingCount} transfers to settle`} />
        <StatCard label="Paid this month" value={formatINR(kpis.paidAmount)} icon={IndianRupee} tone="green" hint={`${kpis.paidCount} payouts`} />
        <StatCard label="Avg processing time" value={formatDuration(kpis.avg)} icon={Clock} tone="blue" hint="Request → paid" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={t => {
          setTab(t)
          setSelected(new Set())
        }}
        tabs={TABS.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: counts[t] }))}
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={p => p.id}
        loading={loading}
        searchText={p => `${p.id} ${p.partnerId} ${p.partnerCode ?? ''} ${partnerName(p.partnerType, p.partnerId)} ${p.account} ${p.utr ?? ''}`}
        searchPlaceholder="Search partner, id, UTR…"
        filters={filters}
        onRowClick={p => setOpenId(p.id)}
        empty={tab === 'pending' ? 'No pending withdrawal requests' : undefined}
      />

      <PayoutDrawer
        payout={open}
        onClose={() => setOpenId(null)}
        onApprove={approve}
        onReject={reject}
        onMarkPaid={p => setPayingId(p.id)}
      />
      <MarkPaidModal payout={paying} onClose={() => setPayingId(null)} onSubmit={markPaid} />
    </>
  )
}
