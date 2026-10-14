import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Star, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, IconButton, Input, Segmented, Textarea, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatDateTime, newId } from '@/lib/utils'
import { moveItem, nowIso } from '../marketing/utils'
import { servicePagesDb } from './data'
import type { ServicePage } from './types'

export function ServicePagesEditor() {
  const { items } = useCollection(servicePagesDb)
  const [slug, setSlug] = useState('talk-to-astrologer')
  const page = items.find(p => p.id === slug)
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Segmented value={slug} onChange={setSlug} options={items.map(p => ({ key: p.id, label: p.title }))} />
      </div>
      {page ? <ServiceForm key={`${page.id}-${page.updatedAt}`} page={page} /> : <Card className="h-64 animate-pulse" />}
    </div>
  )
}

function ServiceForm({ page }: { page: ServicePage }) {
  const toast = useToast()
  const [d, setD] = useState(page)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(page)
  const invalid = d.plans.some(p => !p.name.trim() || !p.price.trim()) || d.faqs.some(f => !f.q.trim() || !f.a.trim())

  const setPlan = (id: string, patch: Partial<ServicePage['plans'][number]>) => setD(x => ({ ...x, plans: x.plans.map(p => (p.id === id ? { ...p, ...patch } : p)) }))
  const setFaq = (id: string, patch: Partial<ServicePage['faqs'][number]>) => setD(x => ({ ...x, faqs: x.faqs.map(f => (f.id === id ? { ...f, ...patch } : f)) }))

  const save = async () => {
    setSaving(true)
    await servicePagesDb.update(page.id, { ...d, updatedAt: nowIso() })
    setSaving(false)
    toast(`${d.title} page saved`)
  }

  return (
    <Card>
      <CardHeader title={`/services/${page.id}`} subtitle={`Last updated ${formatDateTime(page.updatedAt)}`} />
      <CardBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Page title" value={d.title} onChange={e => setD({ ...d, title: e.target.value })} />
          <Input label="Tagline" value={d.tagline} onChange={e => setD({ ...d, tagline: e.target.value })} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Pricing plans</h4>
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} disabled={d.plans.length >= 4} onClick={() => setD(x => ({ ...x, plans: [...x.plans, { id: newId('PL'), name: '', price: '', text: '', popular: false }] }))}>
              Add plan
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {d.plans.map(p => (
              <div key={p.id} className={cn('space-y-2 rounded-xl border p-3', p.popular ? 'border-brand-500 bg-brand-50/40' : 'border-line')}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setD(x => ({ ...x, plans: x.plans.map(pl => ({ ...pl, popular: pl.id === p.id ? !pl.popular : false })) }))}
                    className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', p.popular ? 'bg-brand-600 text-white' : 'bg-gray-100 text-muted')}>
                    <Star className="size-3" /> {p.popular ? 'Most popular' : 'Mark popular'}
                  </button>
                  <IconButton aria-label="Remove plan" onClick={() => setD(x => ({ ...x, plans: x.plans.filter(pl => pl.id !== p.id) }))}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
                <Input aria-label="Plan name" placeholder="Plan name" value={p.name} onChange={e => setPlan(p.id, { name: e.target.value })} />
                <Input aria-label="Price" placeholder="₹15–25/min" value={p.price} onChange={e => setPlan(p.id, { price: e.target.value })} />
                <Textarea aria-label="Description" rows={2} placeholder="Short description" value={p.text} onChange={e => setPlan(p.id, { text: e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">FAQs</h4>
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setD(x => ({ ...x, faqs: [...x.faqs, { id: newId('SF'), q: '', a: '' }] }))}>
              Add FAQ
            </Button>
          </div>
          <div className="space-y-3">
            {d.faqs.map((f, i) => (
              <div key={f.id} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center gap-1">
                  <div className="flex-1">
                    <Input aria-label="Question" placeholder="Question" value={f.q} onChange={e => setFaq(f.id, { q: e.target.value })} />
                  </div>
                  <IconButton aria-label="Move up" disabled={i === 0} onClick={() => setD(x => ({ ...x, faqs: moveItem(x.faqs, i, -1) }))}>
                    <ArrowUp className="size-4" />
                  </IconButton>
                  <IconButton aria-label="Move down" disabled={i === d.faqs.length - 1} onClick={() => setD(x => ({ ...x, faqs: moveItem(x.faqs, i, 1) }))}>
                    <ArrowDown className="size-4" />
                  </IconButton>
                  <IconButton aria-label="Remove" onClick={() => setD(x => ({ ...x, faqs: x.faqs.filter(q => q.id !== f.id) }))}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
                <Textarea aria-label="Answer" rows={2} placeholder="Answer" value={f.a} onChange={e => setFaq(f.id, { a: e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" icon={<RotateCcw className="size-4" />} disabled={!dirty} onClick={() => setD(page)}>
            Discard
          </Button>
          <Button icon={<Save className="size-4" />} disabled={!dirty || invalid} loading={saving} onClick={save}>
            Save page
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
