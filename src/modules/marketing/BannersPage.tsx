import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, Eye, Image, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, DataTable, DetailList, Drawer, IconButton, PageHeader, Segmented, StatCard, StatusBadge, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDate, formatNumber } from '@/lib/utils'
import { BannerForm, BannerPreview } from './BannerForm'
import { PLACEMENTS, bannersDb, placementLabel } from './data'
import { pct } from './utils'
import type { Banner, BannerPlacement } from './types'

function bannerStatus(b: Banner, today = new Date().toISOString().slice(0, 10)) {
  if (!b.active) return 'inactive'
  if (b.endDate < today) return 'expired'
  if (b.startDate > today) return 'scheduled'
  return 'live'
}

export default function BannersPage() {
  const { items, loading, update, remove } = useCollection(bannersDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [placement, setPlacement] = useState<BannerPlacement | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ banner?: Banner } | null>(null)
  const selected = items.find(b => b.id === selectedId)

  const rows = useMemo(() => {
    const order = PLACEMENTS.map(p => p.value)
    return items
      .filter(b => placement === 'all' || b.placement === placement)
      .sort((a, b) => order.indexOf(a.placement) - order.indexOf(b.placement) || a.priority - b.priority)
  }, [items, placement])

  const stats = useMemo(() => {
    const live = items.filter(b => bannerStatus(b) === 'live')
    const impressions = items.reduce((s, b) => s + b.impressions, 0)
    const clicks = items.reduce((s, b) => s + b.clicks, 0)
    return { live: live.length, impressions, ctr: pct(clicks, impressions), scheduled: items.filter(b => bannerStatus(b) === 'scheduled').length }
  }, [items])

  /** Swap priority with the neighbour in the same placement. */
  const move = async (b: Banner, dir: -1 | 1) => {
    const group = items.filter(x => x.placement === b.placement).sort((x, y) => x.priority - y.priority)
    const idx = group.findIndex(x => x.id === b.id)
    const other = group[idx + dir]
    if (!other) return
    await Promise.all([update(b.id, { priority: other.priority }), update(other.id, { priority: b.priority })])
    toast(`Moved ${dir < 0 ? 'up' : 'down'} in ${placementLabel(b.placement)}`, 'info')
  }

  const del = async (b: Banner) => {
    const ok = await confirm({ title: 'Delete banner?', message: `“${b.title}” will be removed from ${placementLabel(b.placement)}.`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(b.id)
    // Re-pack priorities in the group so ordering stays 1..n
    const rest = bannersDb.snapshot().filter(x => x.placement === b.placement).sort((x, y) => x.priority - y.priority)
    await Promise.all(rest.map((x, i) => (x.priority !== i + 1 ? update(x.id, { priority: i + 1 }) : null)))
    setSelectedId(null)
    toast('Banner deleted')
  }

  const toggle = async (b: Banner) => {
    await update(b.id, { active: !b.active })
    toast(b.active ? 'Banner hidden' : 'Banner activated')
  }

  const columns: Column<Banner>[] = [
    {
      key: 'order',
      header: 'Order',
      render: b => {
        const group = items.filter(x => x.placement === b.placement)
        const max = Math.max(...group.map(x => x.priority))
        const min = Math.min(...group.map(x => x.priority))
        return (
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <span className="w-5 text-center text-xs font-semibold text-muted">{b.priority}</span>
            <IconButton className="size-7" aria-label="Move up" disabled={b.priority === min} onClick={() => move(b, -1)}>
              <ArrowUp className="size-4" />
            </IconButton>
            <IconButton className="size-7" aria-label="Move down" disabled={b.priority === max} onClick={() => move(b, 1)}>
              <ArrowDown className="size-4" />
            </IconButton>
          </div>
        )
      },
    },
    {
      key: 'banner',
      header: 'Banner',
      render: b => (
        <div className="flex min-w-64 items-center gap-3">
          <div className="w-24 shrink-0">
            <BannerPreview url={b.imageUrl} title="" className="aspect-[12/5]" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium">{b.title}</p>
            <p className="truncate text-xs text-muted">
              {b.ctaText} → {b.deepLink}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'placement', header: 'Placement', sortValue: b => b.placement, render: b => <span className="whitespace-nowrap">{placementLabel(b.placement)}</span> },
    { key: 'dates', header: 'Schedule', sortValue: b => b.startDate, render: b => <span className="text-xs whitespace-nowrap">{formatDate(b.startDate)} – {formatDate(b.endDate)}</span> },
    { key: 'ctr', header: 'CTR', align: 'right', sortValue: b => pct(b.clicks, b.impressions), render: b => `${pct(b.clicks, b.impressions)}%` },
    { key: 'status', header: 'Status', render: b => <StatusBadge status={bannerStatus(b)} /> },
    {
      key: 'active',
      header: 'Active',
      align: 'center',
      render: b => (
        <span onClick={e => e.stopPropagation()}>
          <Toggle checked={b.active} onChange={() => toggle(b)} />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="Hero slides, festival modals, carousels and tickers across UserApp and the website"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setForm({})}>
            New banner
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live banners" value={stats.live} icon={Image} hint={`of ${items.length}`} />
        <StatCard label="Impressions" value={formatNumber(stats.impressions)} icon={Eye} tone="blue" hint="not tracked yet" />
        <StatCard label="Avg. CTR" value={`${stats.ctr}%`} icon={MousePointerClick} tone="gold" />
        <StatCard label="Scheduled" value={stats.scheduled} icon={CalendarClock} tone="purple" hint="starting later" />
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={placement}
          onChange={setPlacement}
          options={[{ key: 'all', label: 'All placements' }, ...PLACEMENTS.map(p => ({ key: p.value, label: p.label.replace('UserApp · ', '') }))]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={b => b.id}
        loading={loading}
        pageSize={20}
        searchText={b => `${b.title} ${b.deepLink} ${b.ctaText}`}
        searchPlaceholder="Search banners…"
        filters={[{ key: 'status', label: 'Status', options: ['live', 'scheduled', 'expired', 'inactive'], match: (b, v) => bannerStatus(b) === v }]}
        onRowClick={b => setSelectedId(b.id)}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Banner details"
        subtitle={selected && placementLabel(selected.placement)}
        footer={
          selected && (
            <>
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => del(selected)}>
                Delete
              </Button>
              <Button icon={<Pencil className="size-4" />} onClick={() => setForm({ banner: selected })}>
                Edit
              </Button>
            </>
          )
        }>
        {selected && (
          <div className="space-y-6">
            {selected.placement === 'store_ticker' ? (
              <div className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-gold-400">✦ {selected.title} · {selected.ctaText}</div>
            ) : (
              <BannerPreview url={selected.imageUrl} title={selected.title} cta={selected.ctaText} />
            )}
            <div className="flex items-center justify-between">
              <StatusBadge status={bannerStatus(selected)} />
              <Toggle checked={selected.active} onChange={() => toggle(selected)} label="Active" />
            </div>
            <DetailList
              items={[
                { label: 'Title', value: selected.title },
                { label: 'Priority', value: `#${selected.priority}` },
                { label: 'CTA', value: selected.ctaText },
                { label: 'Deep link', value: <span className="font-mono text-xs">{selected.deepLink}</span> },
                { label: 'Starts', value: formatDate(selected.startDate) },
                { label: 'Ends', value: formatDate(selected.endDate) },
                { label: 'Impressions', value: formatNumber(selected.impressions) },
                { label: 'Clicks', value: `${formatNumber(selected.clicks)} (${pct(selected.clicks, selected.impressions)}% CTR)` },
              ]}
            />
          </div>
        )}
      </Drawer>

      {form && <BannerForm banner={form.banner} key={form.banner?.id ?? 'new'} onClose={() => setForm(null)} />}
    </>
  )
}
