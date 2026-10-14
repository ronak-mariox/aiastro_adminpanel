import { useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Clock, Flame, Laptop, Pencil, Plus, Star, Trash2, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, SearchInput, Segmented, StatCard, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatINR, formatNumber, newId } from '@/lib/utils'
import { pujasDb } from './data'
import PujaModal, { type PujaDraft } from './PujaModal'
import { CATEGORIES } from './pricing'
import type { Puja, PujaCategory } from './types'

type CatFilter = 'All' | PujaCategory

export default function PujasPage() {
  const { items, loading, create, update, remove } = useCollection(pujasDb)
  const [cat, setCat] = useState<CatFilter>('All')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Puja | 'new' | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(p => (cat === 'All' || p.category === cat) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)))
  }, [items, cat, query])

  const kpi = {
    active: items.filter(p => p.active).length,
    online: items.filter(p => p.onlineAvailable && p.active).length,
    avg: items.length ? Math.round(items.reduce((s, p) => s + p.basePrice, 0) / items.length) : 0,
    top: [...items].sort((a, b) => b.bookings - a.bookings)[0],
  }

  const save = async (d: PujaDraft) => {
    if (editing === 'new') {
      await create({ ...d, id: newId('PJA'), rating: 0, bookings: 0 })
      toast(`${d.name} added to the catalogue`)
    } else if (editing) {
      await update(editing.id, d)
      toast(`${d.name} updated`)
    }
    setEditing(null)
  }

  const del = async (p: Puja) => {
    const ok = await confirm({ title: `Delete ${p.name}?`, message: 'It is archived: removed from the app, the website and this list. Existing bookings are not affected. Consider deactivating instead.', confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(p.id)
    toast(`${p.name} deleted`)
  }

  return (
    <div>
      <PageHeader
        title="Puja Catalogue"
        subtitle="Puja types & e-pujas available for booking"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            New puja
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active pujas" value={`${kpi.active} / ${items.length}`} icon={CheckCircle2} tone="green" />
        <StatCard label="Online available" value={kpi.online} icon={Laptop} tone="blue" hint="e-puja via video" />
        <StatCard label="Avg price" value={formatINR(kpi.avg)} icon={BookOpen} tone="gold" hint="all-inclusive" />
        <StatCard label="Most booked" value={<span className="text-lg">{kpi.top?.name ?? '—'}</span>} icon={Flame} tone="brand" hint={kpi.top ? `${formatNumber(kpi.top.bookings)} bookings` : undefined} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput className="lg:w-72" placeholder="Search pujas…" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="overflow-x-auto">
          <Segmented<CatFilter> value={cat} onChange={setCat} options={(['All', ...CATEGORIES] as CatFilter[]).map(c => ({ key: c, label: c }))} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No pujas found" text="Try another category or search term." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(p => (
            <Card key={p.id} className={cn('flex flex-col p-5', !p.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="gray">{p.category}</Badge>
                    {p.badge && <Badge tone="brand">{p.badge}</Badge>}
                    {p.popular && <Badge tone="amber">Popular</Badge>}
                    {p.onlineAvailable && <Badge tone="blue">Online</Badge>}
                  </div>
                  <h3 className="truncate text-base font-semibold">{p.name}</h3>
                  <p className="text-sm text-muted">{p.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {p.duration}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {p.people}
                </span>
                {p.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {p.rating} · {formatNumber(p.bookings)} booked
                  </span>
                )}
              </div>
              <ul className="mt-3 flex-1 space-y-1 text-sm">
                {p.benefits.map(b => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xl font-semibold text-brand-600">{formatINR(p.basePrice)}</p>
                  <p className="text-xs text-muted">{p.timeSlots.length} slots · {p.maxPerSlot}/slot</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <Toggle
                  checked={p.active}
                  onChange={async v => {
                    await update(p.id, { active: v })
                    toast(`${p.name} ${v ? 'activated' : 'deactivated'}`, 'info')
                  }}
                  label={p.active ? 'Active' : 'Inactive'}
                />
                <div className="flex">
                  <IconButton aria-label="Edit" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton aria-label="Delete" className="hover:text-red-600" onClick={() => del(p)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <PujaModal puja={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}
