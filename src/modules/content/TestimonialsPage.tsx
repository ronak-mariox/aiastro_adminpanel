import { useMemo, useState } from 'react'
import { Download, Eye, Pencil, Plus, Quote, Star, Trash2, TrendingUp } from 'lucide-react'
import { Avatar, Badge, Button, DataTable, DetailList, Drawer, Input, Label, Modal, PageHeader, Select, StatCard, StatusBadge, Textarea, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatDate, newId } from '@/lib/utils'
import { downloadCsv, nowIso } from '../marketing/utils'
import { SURFACES, testimonialsDb } from './data'
import type { Testimonial, TestimonialSurface } from './types'

const SERVICES: Testimonial['service'][] = ['Consultation', 'Puja', 'Store', 'General']
const surfaceLabel = (s: TestimonialSurface) => SURFACES.find(x => x.value === s)?.label ?? s

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} stars`} className={cn(!onChange && 'cursor-default')}>
          <Star className={cn(onChange ? 'size-6' : 'size-3.5', n <= value ? 'fill-gold-400 text-gold-500' : 'text-gray-300')} />
        </button>
      ))}
    </span>
  )
}

export default function TestimonialsPage() {
  const { items, loading, update, remove } = useCollection(testimonialsDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ t?: Testimonial } | null>(null)
  const selected = items.find(t => t.id === selectedId)

  const stats = useMemo(() => {
    const active = items.filter(t => t.active)
    return {
      active: active.length,
      avg: active.length ? (active.reduce((s, t) => s + t.rating, 0) / active.length).toFixed(1) : '0',
      featured: items.filter(t => t.featured).length,
      website: active.filter(t => t.showOn.includes('website')).length,
    }
  }, [items])

  const patch = async (t: Testimonial, p: Partial<Testimonial>, msg: string) => {
    await update(t.id, p)
    toast(msg)
  }

  const del = async (t: Testimonial) => {
    const ok = await confirm({ title: `Delete testimonial from ${t.name}?`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(t.id)
    setSelectedId(null)
    toast('Testimonial deleted')
  }

  const columns: Column<Testimonial>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortValue: t => t.name,
      render: t => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <Avatar name={t.name} src={t.photoUrl || undefined} size={34} />
          <div>
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-muted">{t.city}</p>
          </div>
        </div>
      ),
    },
    { key: 'text', header: 'Testimonial', render: t => <p className="line-clamp-2 min-w-64 text-xs text-muted">“{t.text}”</p> },
    { key: 'rating', header: 'Rating', sortValue: t => t.rating, render: t => <Stars value={t.rating} /> },
    { key: 'service', header: 'Service', render: t => <Badge>{t.service}</Badge> },
    {
      key: 'showOn',
      header: 'Shown on',
      render: t => (
        <div className="flex flex-wrap gap-1">
          {t.showOn.map(s => (
            <Badge key={s} tone="brand">
              {surfaceLabel(s)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'featured',
      header: 'Featured',
      align: 'center',
      sortValue: t => Number(t.featured),
      render: t => (
        <button
          type="button"
          aria-label="Toggle featured"
          className="rounded-lg p-1.5 hover:bg-gray-100"
          onClick={e => {
            e.stopPropagation()
            patch(t, { featured: !t.featured }, t.featured ? 'Unfeatured' : 'Featured')
          }}>
          <Star className={cn('size-4', t.featured ? 'fill-gold-400 text-gold-500' : 'text-gray-300')} />
        </button>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      align: 'center',
      render: t => (
        <span onClick={e => e.stopPropagation()}>
          <Toggle checked={t.active} onChange={v => patch(t, { active: v }, v ? 'Testimonial shown' : 'Testimonial hidden')} />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Testimonials"
        subtitle="Customer stories shown on the app home, store and website"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setForm({})}>
            Add testimonial
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active" value={stats.active} icon={Quote} hint={`of ${items.length}`} />
        <StatCard label="Average rating" value={`${stats.avg} ★`} icon={TrendingUp} tone="gold" />
        <StatCard label="Featured" value={stats.featured} icon={Star} tone="purple" />
        <StatCard label="On website" value={stats.website} icon={Eye} tone="blue" />
      </div>
      <DataTable
        rows={items}
        columns={columns}
        rowKey={t => t.id}
        loading={loading}
        searchText={t => `${t.name} ${t.city} ${t.text}`}
        searchPlaceholder="Search name, city, text…"
        onRowClick={t => setSelectedId(t.id)}
        filters={[
          { key: 'surface', label: 'Shown on', options: SURFACES.map(s => s.label), match: (t, v) => t.showOn.some(s => surfaceLabel(s) === v) },
          { key: 'service', label: 'Service', options: SERVICES, match: (t, v) => t.service === v },
          { key: 'rating', label: 'Rating', options: ['5', '4', '3', '2', '1'], match: (t, v) => t.rating === Number(v) },
          { key: 'status', label: 'Status', options: ['active', 'inactive'], match: (t, v) => t.active === (v === 'active') },
        ]}
        toolbar={
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="size-4" />}
            onClick={() => downloadCsv('testimonials.csv', items.map(t => ({ name: t.name, city: t.city, rating: t.rating, service: t.service, text: t.text, showOn: t.showOn.join('+'), featured: t.featured, active: t.active })))}>
            Export
          </Button>
        }
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.city}
        footer={
          selected && (
            <>
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => del(selected)}>
                Delete
              </Button>
              <Button icon={<Pencil className="size-4" />} onClick={() => setForm({ t: selected })}>
                Edit
              </Button>
            </>
          )
        }>
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-gray-50 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} src={selected.photoUrl || undefined} size={48} />
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <Stars value={selected.rating} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">“{selected.text}”</p>
            </div>
            <div className="flex flex-wrap gap-6">
              <Toggle checked={selected.active} onChange={v => patch(selected, { active: v }, v ? 'Testimonial shown' : 'Testimonial hidden')} label="Active" />
              <Toggle checked={selected.featured} onChange={v => patch(selected, { featured: v }, v ? 'Featured' : 'Unfeatured')} label="Featured" />
            </div>
            <DetailList
              items={[
                { label: 'Service', value: selected.service },
                { label: 'Status', value: <StatusBadge status={selected.active ? 'active' : 'inactive'} /> },
                { label: 'Shown on', value: selected.showOn.map(surfaceLabel).join(', ') || '—' },
                { label: 'Added', value: formatDate(selected.createdAt) },
              ]}
            />
          </div>
        )}
      </Drawer>

      {form && <TestimonialForm key={form.t?.id ?? 'new'} t={form.t} onClose={() => setForm(null)} />}
    </>
  )
}

function TestimonialForm({ t, onClose }: { t?: Testimonial; onClose: () => void }) {
  const toast = useToast()
  const [d, setD] = useState({
    name: t?.name ?? '',
    city: t?.city ?? '',
    rating: t?.rating ?? 5,
    text: t?.text ?? '',
    photoUrl: t?.photoUrl ?? '',
    service: t?.service ?? ('Consultation' as Testimonial['service']),
    showOn: t?.showOn ?? (['website'] as TestimonialSurface[]),
    featured: t?.featured ?? false,
    active: t?.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const errors = {
    name: d.name.trim() ? undefined : 'Required',
    city: d.city.trim() ? undefined : 'Required',
    text: d.text.trim().length >= 20 ? undefined : 'At least 20 characters',
  }
  const [touched, setTouched] = useState(false)
  const valid = !errors.name && !errors.city && !errors.text && d.showOn.length > 0

  const save = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    try {
      if (t) await testimonialsDb.update(t.id, d)
      else await testimonialsDb.create({ ...d, id: newId('TST'), createdAt: nowIso() })
      toast(t ? 'Testimonial updated' : 'Testimonial added')
      onClose()
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const toggleSurface = (s: TestimonialSurface) => setD(x => ({ ...x, showOn: x.showOn.includes(s) ? x.showOn.filter(y => y !== s) : [...x.showOn, s] }))

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t ? 'Edit testimonial' : 'New testimonial'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} error={touched ? errors.name : undefined} />
        <Input label="City" value={d.city} onChange={e => setD({ ...d, city: e.target.value })} error={touched ? errors.city : undefined} />
        <div>
          <Label>Rating</Label>
          <Stars value={d.rating} onChange={v => setD({ ...d, rating: v })} />
        </div>
        <Select label="Service" value={d.service} options={SERVICES} onChange={e => setD({ ...d, service: e.target.value as Testimonial['service'] })} />
        <div className="sm:col-span-2">
          <Textarea label="Testimonial" hint={`${d.text.length}/300`} maxLength={300} rows={3} value={d.text} onChange={e => setD({ ...d, text: e.target.value })} error={touched ? errors.text : undefined} />
        </div>
        <div className="flex items-end gap-3 sm:col-span-2">
          <Avatar name={d.name || '?'} src={d.photoUrl || undefined} size={40} />
          <div className="flex-1">
            <Input label="Photo URL" hint="optional" value={d.photoUrl} placeholder="https://…" onChange={e => setD({ ...d, photoUrl: e.target.value })} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Show on</Label>
          <div className="flex flex-wrap gap-2">
            {SURFACES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSurface(s.value)}
                className={cn('rounded-xl border px-3 py-1.5 text-sm font-medium transition', d.showOn.includes(s.value) ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line text-muted')}>
                {s.label}
              </button>
            ))}
          </div>
          {touched && d.showOn.length === 0 && <p className="mt-1 text-xs text-red-600">Pick at least one surface</p>}
        </div>
        <Toggle checked={d.featured} onChange={v => setD({ ...d, featured: v })} label="Featured" />
        <Toggle checked={d.active} onChange={v => setD({ ...d, active: v })} label="Active" />
      </div>
    </Modal>
  )
}
