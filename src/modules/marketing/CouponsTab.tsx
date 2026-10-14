import { useMemo, useState } from 'react'
import { Copy, Download, IndianRupee, Pencil, Plus, TicketPercent, Trash2, Users, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailList, Drawer, StatCard, StatusBadge, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDate, formatINR, formatNumber, newId } from '@/lib/utils'
import { COUPON_SCOPES, COUPON_TAGS, TAG_TONES, couponStatus, couponsDb, discountLabel } from './data'
import { CouponForm } from './CouponForm'
import { downloadCsv, nowIso, pct } from './utils'
import type { Coupon } from './types'

const scopeLabel = (s: string) => COUPON_SCOPES.find(x => x.value === s)?.label ?? s

export function CouponsTab({ formOpen, setFormOpen }: { formOpen: boolean; setFormOpen: (v: boolean) => void }) {
  const { items, loading, update, remove, create } = useCollection(couponsDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Coupon | undefined>()
  const selected = items.find(c => c.id === selectedId)

  const stats = useMemo(() => {
    const live = items.filter(c => couponStatus(c) === 'active')
    return {
      live: live.length,
      redemptions: items.reduce((s, c) => s + c.usedCount, 0),
      discount: items.reduce((s, c) => s + c.discountGiven, 0),
      auto: live.filter(c => c.autoApply).length,
    }
  }, [items])

  const chart = useMemo(
    () => [...items].sort((a, b) => b.usedCount - a.usedCount).slice(0, 8).map(c => ({ code: c.code, used: c.usedCount })),
    [items],
  )

  const openForm = (c?: Coupon) => {
    setEditing(c)
    setFormOpen(true)
  }

  const toggleActive = async (c: Coupon) => {
    await update(c.id, { active: !c.active })
    toast(`${c.code} ${c.active ? 'deactivated' : 'activated'}`)
  }

  const duplicate = async (c: Coupon) => {
    const code = `${c.code.slice(0, 12)}2`
    await create({ ...c, id: newId('CPN'), code, usedCount: 0, discountGiven: 0, active: false, createdAt: nowIso() })
    toast(`Duplicated as ${code} (inactive)`)
  }

  const del = async (c: Coupon) => {
    const ok = await confirm({ title: `Delete ${c.code}?`, message: `${formatNumber(c.usedCount)} redemptions are kept in order history. Users can no longer apply this code.`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(c.id)
    setSelectedId(null)
    toast(`${c.code} deleted`)
  }

  const exportCsv = () =>
    downloadCsv(
      'coupons.csv',
      items.map(c => ({
        code: c.code,
        title: c.title,
        tag: c.tag,
        discount: discountLabel(c),
        minOrder: c.minOrder,
        appliesTo: c.appliesTo,
        used: c.usedCount,
        limit: c.usageLimit,
        perUser: c.perUserLimit,
        validFrom: c.validFrom,
        validTo: c.validTo,
        autoApply: c.autoApply,
        payment: c.paymentMethod,
        status: couponStatus(c),
        discountGiven: c.discountGiven,
      })),
    )

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Coupon',
      sortValue: c => c.code,
      render: c => (
        <div className="min-w-48">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-dashed border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-600">{c.code}</span>
            {c.autoApply && <Zap className="size-3.5 text-gold-500" aria-label="Auto-apply" />}
          </div>
          <p className="mt-1 truncate text-xs text-muted">{c.title}</p>
        </div>
      ),
    },
    { key: 'tag', header: 'Tag', render: c => <Badge tone={TAG_TONES[c.tag]}>{c.tag}</Badge> },
    { key: 'discount', header: 'Discount', sortValue: c => c.value, render: c => <span className="font-medium whitespace-nowrap">{discountLabel(c)}</span> },
    { key: 'min', header: 'Min order', align: 'right', sortValue: c => c.minOrder, render: c => formatINR(c.minOrder) },
    { key: 'scope', header: 'Applies to', render: c => <span className="whitespace-nowrap">{scopeLabel(c.appliesTo)}</span> },
    {
      key: 'usage',
      header: 'Usage',
      sortValue: c => c.usedCount,
      render: c => (
        <div className="w-32">
          <div className="flex justify-between text-xs">
            <span>{formatNumber(c.usedCount)}</span>
            <span className="text-muted">/ {formatNumber(c.usageLimit)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, pct(c.usedCount, c.usageLimit))}%` }} />
          </div>
        </div>
      ),
    },
    { key: 'validity', header: 'Valid till', sortValue: c => c.validTo, render: c => <span className="whitespace-nowrap">{formatDate(c.validTo)}</span> },
    { key: 'status', header: 'Status', render: c => <StatusBadge status={couponStatus(c)} /> },
    {
      key: 'active',
      header: 'Active',
      align: 'center',
      render: c => (
        <span onClick={e => e.stopPropagation()}>
          <Toggle checked={c.active} onChange={() => toggleActive(c)} />
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live coupons" value={stats.live} icon={TicketPercent} hint={`of ${items.length} total`} />
        <StatCard label="Total redemptions" value={formatNumber(stats.redemptions)} icon={Users} tone="blue" hint="all time" />
        <StatCard label="Discount given" value={formatINR(stats.discount)} icon={IndianRupee} tone="gold" hint="lifetime" />
        <StatCard label="Auto-apply live" value={stats.auto} icon={Zap} tone="purple" hint="applied at checkout" />
      </div>

      <Card>
        <CardHeader title="Top coupons by redemptions" subtitle="All-time usage" />
        <CardBody className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece9ea" />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => formatNumber(Number(v))} />
              <Bar dataKey="used" name="Redemptions" fill="#c8102e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={c => c.id}
        loading={loading}
        searchText={c => `${c.code} ${c.title} ${c.tag}`}
        searchPlaceholder="Search code or title…"
        onRowClick={c => setSelectedId(c.id)}
        filters={[
          { key: 'tag', label: 'Tag', options: COUPON_TAGS, match: (c, v) => c.tag === v },
          { key: 'scope', label: 'Applies to', options: COUPON_SCOPES.map(s => s.label), match: (c, v) => scopeLabel(c.appliesTo) === v },
          { key: 'status', label: 'Status', options: ['active', 'scheduled', 'expired', 'exhausted', 'inactive'], match: (c, v) => couponStatus(c) === v },
        ]}
        toolbar={
          <>
            <Button variant="outline" size="sm" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export
            </Button>
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => openForm()}>
              New coupon
            </Button>
          </>
        }
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.code ?? ''}
        subtitle={selected?.title}
        footer={
          selected && (
            <>
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => del(selected)}>
                Delete
              </Button>
              <Button variant="outline" icon={<Copy className="size-4" />} onClick={() => duplicate(selected)}>
                Duplicate
              </Button>
              <Button icon={<Pencil className="size-4" />} onClick={() => openForm(selected)}>
                Edit
              </Button>
            </>
          )
        }>
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-brand-gradient p-5 text-white">
              <p className="text-xs opacity-80">{selected.tag}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider">{selected.code}</p>
              <p className="mt-1 text-sm">{discountLabel(selected)} · min order {formatINR(selected.minOrder)}</p>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge status={couponStatus(selected)} />
              <Toggle checked={selected.active} onChange={() => toggleActive(selected)} label="Active" />
            </div>
            <DetailList
              items={[
                { label: 'Applies to', value: scopeLabel(selected.appliesTo) },
                { label: 'Payment method', value: selected.paymentMethod === 'any' ? 'Any' : selected.paymentMethod },
                { label: 'Auto-apply', value: selected.autoApply ? 'Yes' : 'No' },
                { label: 'Per-user limit', value: selected.perUserLimit },
                { label: 'Used / limit', value: `${formatNumber(selected.usedCount)} / ${formatNumber(selected.usageLimit)} (${pct(selected.usedCount, selected.usageLimit)}%)` },
                { label: 'Discount given', value: formatINR(selected.discountGiven) },
                { label: 'Valid from', value: formatDate(selected.validFrom) },
                { label: 'Valid to', value: formatDate(selected.validTo) },
              ]}
            />
            <div>
              <p className="text-xs text-muted">Description / terms</p>
              <p className="mt-1 text-sm">{selected.description || '—'}</p>
            </div>
          </div>
        )}
      </Drawer>

      {formOpen && (
        <CouponForm
          open
          key={editing?.id ?? 'new'}
          coupon={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}
