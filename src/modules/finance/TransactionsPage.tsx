import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, IndianRupee, Percent, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, DataTable, PageHeader, Segmented, StatCard, StatusBadge, useToast, type Column, type Filter } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { cn, formatDateTime, formatINR, formatNumber } from '@/lib/utils'
import { INFLOW_TYPES, OUTFLOW_TYPES, TXN_TYPE_LABEL, partyName, transactionsDb } from './data'
import { MethodSplit, RevenueChart } from './RevenueChart'
import { TransactionDrawer } from './TransactionDrawer'
import type { PaymentMethod, Transaction, TxnStatus, TxnType } from './types'
import { useFinanceSummary } from './useSummary'
import { daysAgo, downloadCSV, isToday } from './utils'

type Range = 'today' | '7d' | '30d' | 'all'

const METHODS: PaymentMethod[] = ['UPI', 'Card', 'NetBanking', 'Gateway', 'Wallet', 'COD']
const STATUSES: TxnStatus[] = ['success', 'pending', 'failed']
const typeByLabel = Object.fromEntries(Object.entries(TXN_TYPE_LABEL).map(([k, v]) => [v, k])) as Record<string, TxnType>

const total = (t: Transaction) => t.amount + t.gst
const sign = (t: Transaction) => (INFLOW_TYPES.includes(t.type) ? '+' : OUTFLOW_TYPES.includes(t.type) ? '−' : '')

export default function TransactionsPage() {
  const { items, loading, error } = useCollection(transactionsDb)
  const { summary } = useFinanceSummary(30)
  const toast = useToast()
  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])
  const [range, setRange] = useState<Range>('30d')
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [visibleRows, setVisibleRows] = useState<Transaction[]>([])

  const kpis = useMemo(() => {
    const today = items.filter(t => isToday(t.date))
    const ok = (t: Transaction) => t.status === 'success'
    const volume = today.filter(t => ok(t) && INFLOW_TYPES.includes(t.type)).reduce((s, t) => s + total(t), 0)
    const recharges = today.filter(t => ok(t) && t.type === 'wallet_recharge')
    const failedToday = today.filter(t => t.status === 'failed').length
    const failedWeek = items.filter(t => t.status === 'failed' && daysAgo(t.date) < 7).length
    const commission = summary?.month.commission ?? 0
    return { volume, todayCount: today.length, recharges, failedToday, failedWeek, commission }
  }, [items, summary])

  const rows = useMemo(
    () =>
      items.filter(t => {
        if (range === 'today') return isToday(t.date)
        if (range === '7d') return daysAgo(t.date) < 7
        if (range === '30d') return daysAgo(t.date) < 30
        return true
      }),
    [items, range],
  )

  const columns: Column<Transaction>[] = [
    {
      key: 'id',
      header: 'Transaction',
      sortValue: t => t.date,
      render: t => (
        <div>
          <p className="font-medium">{t.id}</p>
          <p className="text-xs text-muted">{formatDateTime(t.date)}</p>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Party',
      sortValue: t => partyName(t.partyType, t.partyId),
      render: t => {
        const name = partyName(t.partyType, t.partyId)
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} size={30} />
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-xs text-muted">
                {t.partyCode ?? t.partyId.slice(-6)} · <span className="capitalize">{t.partyType}</span>
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: t => TXN_TYPE_LABEL[t.type],
      render: t => (
        <Badge tone={INFLOW_TYPES.includes(t.type) ? 'green' : OUTFLOW_TYPES.includes(t.type) ? 'red' : t.type === 'commission' ? 'brand' : 'gray'}>
          {TXN_TYPE_LABEL[t.type]}
        </Badge>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      sortValue: t => t.method,
      render: t => (
        <div>
          <p>{t.method}</p>
          <p className="font-mono text-[11px] text-muted">{t.gatewayRef}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: total,
      render: t => (
        <div>
          <p className={cn('font-semibold', sign(t) === '+' && 'text-emerald-700', sign(t) === '−' && 'text-red-600')}>
            {sign(t)}
            {formatINR(total(t))}
          </p>
          {t.gst > 0 && <p className="text-[11px] text-muted">incl. GST {formatINR(t.gst)}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: t => t.status, render: t => <StatusBadge status={t.status} /> },
  ]

  const filters: Filter<Transaction>[] = [
    { key: 'type', label: 'Type', options: Object.values(TXN_TYPE_LABEL), match: (t, v) => t.type === typeByLabel[v] },
    { key: 'status', label: 'Status', options: STATUSES, match: (t, v) => t.status === v },
    { key: 'method', label: 'Method', options: METHODS, match: (t, v) => t.method === v },
    { key: 'party', label: 'Party', options: ['customer', 'astrologer', 'pandit'], match: (t, v) => t.partyType === v },
  ]

  const exportCSV = () => {
    downloadCSV(
      `vedrashi-transactions-${range}.csv`,
      ['ID', 'Date', 'Party type', 'Party ID', 'Party name', 'Type', 'Method', 'Gateway ref', 'Amount', 'GST', 'Total', 'Status', 'Reference'],
      visibleRows.map(t => [
        t.id,
        t.date,
        t.partyType,
        t.partyId,
        partyName(t.partyType, t.partyId),
        TXN_TYPE_LABEL[t.type],
        t.method,
        t.gatewayRef,
        t.amount,
        t.gst,
        total(t),
        t.status,
        t.referenceId,
      ]),
    )
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Platform-wide ledger of wallet, consultation, puja, store and partner money movements"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Transactions' }]}
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportCSV}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's volume" value={formatINR(kpis.volume)} icon={IndianRupee} hint={`${kpis.todayCount} transactions today`} />
        <StatCard
          label="Wallet recharges today"
          value={formatINR(kpis.recharges.reduce((s, t) => s + total(t), 0))}
          icon={Wallet}
          tone="gold"
          hint={`${formatNumber(kpis.recharges.length)} recharges`}
        />
        <StatCard label="Failed payments" value={kpis.failedToday} icon={AlertTriangle} tone="purple" hint={`${kpis.failedWeek} in last 7 days`} />
        <StatCard label="Platform commission" value={formatINR(kpis.commission)} icon={Percent} tone="green" hint="This month" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <RevenueChart summary={summary} />
        <MethodSplit txns={rows} />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={t => t.id}
        loading={loading}
        searchText={t => `${t.id} ${t.partyId} ${t.partyCode ?? ''} ${partyName(t.partyType, t.partyId)} ${t.gatewayRef} ${t.referenceId ?? ''} ${t.note ?? ''}`}
        searchPlaceholder="Search id, party, gateway ref…"
        filters={filters}
        onRowClick={setSelected}
        onVisibleRowsChange={setVisibleRows}
        toolbar={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { key: 'today', label: 'Today' },
              { key: '7d', label: '7 days' },
              { key: '30d', label: '30 days' },
              { key: 'all', label: 'All' },
            ]}
          />
        }
      />

      <TransactionDrawer txn={selected ? (items.find(t => t.id === selected.id) ?? null) : null} onClose={() => setSelected(null)} />
    </>
  )
}
