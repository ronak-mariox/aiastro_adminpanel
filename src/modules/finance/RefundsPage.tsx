import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, Download, Hourglass, Scale, Undo2 } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
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
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { POLICY_TIERS, SOURCE_LABEL, partyName, refundsDb, suggestRefund, transactionsDb } from './data'
import { ApproveRefundModal, PolicyChip, RefundDrawer, type ApprovePayload } from './RefundDrawer'
import type { Refund, RefundSource, RefundStatus } from './types'
import { downloadCSV, isThisMonth } from './utils'

type Tab = RefundStatus | 'all'
const TABS: Tab[] = ['pending', 'approved', 'processed', 'rejected', 'all']
const sourceByLabel = Object.fromEntries(Object.entries(SOURCE_LABEL).map(([k, v]) => [v, k])) as Record<string, RefundSource>
const customerName = (id: string) => partyName('customer', id)

export default function RefundsPage() {
  const { items, loading, error, update } = useCollection(refundsDb)
  const confirm = useConfirm()
  const toast = useToast()
  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])
  const [tab, setTab] = useState<Tab>('pending')
  const [openId, setOpenId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [showPolicy, setShowPolicy] = useState(false)

  const rows = useMemo(() => (tab === 'all' ? items : items.filter(r => r.status === tab)), [items, tab])
  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t, t === 'all' ? items.length : items.filter(r => r.status === t).length])), [items])

  const kpis = useMemo(() => {
    const pending = items.filter(r => r.status === 'pending')
    const approved = items.filter(r => r.status === 'approved')
    const processed = items.filter(r => r.status === 'processed' && r.decidedAt && isThisMonth(r.decidedAt))
    const decided = items.filter(r => r.status !== 'pending')
    const accepted = decided.filter(r => r.status !== 'rejected')
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amountRequested, 0),
      approvedAmount: approved.reduce((s, r) => s + (r.approvedAmount ?? 0) + (r.creditAmount ?? 0), 0),
      approvedCount: approved.length,
      refunded: processed.reduce((s, r) => s + (r.approvedAmount ?? 0) + (r.creditAmount ?? 0), 0),
      processedCount: processed.length,
      rate: decided.length ? Math.round((accepted.length / decided.length) * 100) : 0,
    }
  }, [items])

  const approve = async ({ amount, credit, destination, note }: ApprovePayload) => {
    if (!approvingId) return
    try {
      await update(approvingId, {
        status: 'approved',
        approvedAmount: amount,
        creditAmount: credit,
        destination,
        adminNote: note || undefined,
        decidedAt: new Date().toISOString(),
      })
      toast(`Refund of ${formatINR(amount)} approved`)
      setApprovingId(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const reject = async (r: Refund) => {
    const reason = await confirm({
      title: 'Reject refund request?',
      message: `${customerName(r.customerId)} will be notified that their ${SOURCE_LABEL[r.source].toLowerCase()} refund (${formatINR(r.amountRequested)}) was declined.`,
      confirmLabel: 'Reject',
      tone: 'danger',
      withReason: true,
      reasonLabel: 'Reason (shown to customer)',
    })
    if (reason === false) return
    try {
      await update(r.id, { status: 'rejected', rejectReason: reason, decidedAt: new Date().toISOString() })
      toast(`${r.id} rejected`, 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const processRefund = async (r: Refund) => {
    const amount = r.approvedAmount ?? 0
    const credit = r.creditAmount ?? 0
    const toWallet = r.destination === 'wallet'
    const ok = await confirm({
      title: 'Process refund?',
      message: toWallet
        ? `${formatINR(amount + credit)} will be credited instantly to ${customerName(r.customerId)}'s VedRashi wallet.`
        : `Refund ${formatINR(amount)} to the original ${r.paidVia} payment from the payment gateway dashboard, then confirm here to record it${credit ? `; ${formatINR(credit)} will be credited to the wallet` : ''}.`,
      confirmLabel: 'Process refund',
      tone: 'success',
    })
    if (ok === false) return
    try {
      // The only step that moves money (backend: one transaction, wallet.service post()).
      await update(r.id, { status: 'processed', decidedAt: new Date().toISOString() })
    } catch (e) {
      toast(errorMessage(e), 'error')
      return
    }
    if (transactionsDb.snapshot().length) void transactionsDb.refresh?.().catch(() => undefined)
    toast(`${r.id} processed`)
  }

  const exportCSV = () =>
    downloadCSV(
      `vedrashi-refunds-${tab}.csv`,
      ['ID', 'Source', 'Reference', 'Customer ID', 'Customer', 'Paid', 'Requested', 'Policy tier', 'Suggested', 'Approved', 'Credit', 'Destination', 'Status', 'Requested at'],
      rows.map(r => {
        const p = suggestRefund(r)
        return [r.id, r.source, r.referenceId, r.customerId, customerName(r.customerId), r.amountPaid, r.amountRequested, p.tier, p.amount, r.approvedAmount, r.creditAmount, r.destination, r.status, r.requestedAt]
      }),
    )

  const columns: Column<Refund>[] = [
    {
      key: 'id',
      header: 'Refund',
      sortValue: r => r.requestedAt,
      render: r => (
        <div>
          <p className="font-medium">{r.id}</p>
          <p className="text-xs text-muted">{formatDateTime(r.requestedAt)}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: r => r.source,
      render: r => (
        <div>
          <Badge tone={r.source === 'consultation' ? 'brand' : r.source === 'puja' ? 'orange' : 'blue'}>{SOURCE_LABEL[r.source]}</Badge>
          <p className="mt-1 text-xs text-muted">{r.referenceId}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: r => customerName(r.customerId),
      render: r => (
        <div className="flex items-center gap-2.5">
          <Avatar name={customerName(r.customerId)} size={30} />
          <div className="min-w-0">
            <p className="truncate font-medium">{customerName(r.customerId)}</p>
            <p className="max-w-56 truncate text-xs text-muted">{r.reason}</p>
          </div>
        </div>
      ),
    },
    { key: 'requested', header: 'Requested', align: 'right', sortValue: r => r.amountRequested, render: r => <span className="font-semibold">{formatINR(r.amountRequested)}</span> },
    {
      key: 'policy',
      header: 'Policy suggests',
      sortValue: r => suggestRefund(r).amount,
      render: r => {
        const p = suggestRefund(r)
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatINR(p.amount)}</span>
              <PolicyChip refund={r} />
            </div>
            <p className="text-xs text-muted">{p.tier}</p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: r => r.status,
      render: r => (
        <div>
          <StatusBadge status={r.status} />
          <p className="mt-1 text-[11px] text-muted">{r.destination === 'wallet' ? 'To wallet' : `To ${r.paidVia}`}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: r => (
        <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => reject(r)}>
                Reject
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setApprovingId(r.id)}>
                Approve
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button size="sm" variant="success" onClick={() => processRefund(r)}>
              Process
            </Button>
          )}
        </div>
      ),
    },
  ]

  const filters: Filter<Refund>[] = [
    { key: 'source', label: 'Source', options: Object.values(SOURCE_LABEL), match: (r, v) => r.source === sourceByLabel[v] },
    { key: 'destination', label: 'Refund to', options: ['wallet', 'original'], match: (r, v) => r.destination === v },
  ]

  const open = items.find(r => r.id === openId) ?? null
  const approving = items.find(r => r.id === approvingId)

  return (
    <>
      <PageHeader
        title="Refunds"
        subtitle="Refund requests from consultations, puja bookings and store orders"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Refunds' }]}
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportCSV}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending requests" value={kpis.pendingCount} icon={Hourglass} hint={`${formatINR(kpis.pendingAmount)} requested`} />
        <StatCard label="Approved, to process" value={formatINR(kpis.approvedAmount)} icon={BadgeCheck} tone="gold" hint={`${kpis.approvedCount} refunds`} />
        <StatCard label="Refunded this month" value={formatINR(kpis.refunded)} icon={Undo2} tone="green" hint={`${kpis.processedCount} processed`} />
        <StatCard label="Approval rate" value={`${kpis.rate}%`} icon={Scale} tone="blue" hint="Of decided requests" />
      </div>

      <Card className="mb-6 overflow-hidden">
        <button type="button" onClick={() => setShowPolicy(s => !s)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <div>
            <p className="font-semibold">Refund policy tiers</p>
            <p className="text-sm text-muted">Suggested amounts are calculated from these rules (website refund & cancellation policy)</p>
          </div>
          <ChevronDown className={cn('size-5 text-muted transition', showPolicy && 'rotate-180')} />
        </button>
        {showPolicy && (
          <div className="grid gap-4 border-t border-line p-5 md:grid-cols-3">
            {POLICY_TIERS.map(g => (
              <div key={g.source} className="rounded-xl bg-canvas p-4">
                <p className="mb-2 text-sm font-semibold">{g.title}</p>
                <ul className="space-y-1.5 text-sm">
                  {g.rows.map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="text-muted">{k}</span>
                      <span className="text-right font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={TABS.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: counts[t] }))}
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={r => r.id}
        loading={loading}
        searchText={r => `${r.id} ${r.referenceId} ${r.customerId} ${customerName(r.customerId)} ${r.reason}`}
        searchPlaceholder="Search refund, order, customer…"
        filters={filters}
        onRowClick={r => setOpenId(r.id)}
      />

      <RefundDrawer
        refund={open}
        onClose={() => setOpenId(null)}
        onApprove={r => setApprovingId(r.id)}
        onReject={reject}
        onProcess={processRefund}
      />
      {approving && <ApproveRefundModal key={approving.id} refund={approving} onClose={() => setApprovingId(null)} onSubmit={approve} />}
    </>
  )
}
