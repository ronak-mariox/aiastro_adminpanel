import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, FileText, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, IconButton, Input, Segmented, StatusBadge, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatDate, formatDateTime, newId } from '@/lib/utils'
import { moveItem, nowIso } from '../marketing/utils'
import { legalPagesDb } from './data'
import type { LegalPage } from './types'

export function LegalTab() {
  const { items } = useCollection(legalPagesDb)
  const [activeId, setActiveId] = useState('privacy')
  const page = items.find(p => p.id === activeId)

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Legal pages" subtitle="vedrashi.com/legal/…" />
        <ul className="p-2">
          {items.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setActiveId(p.id)}
                className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition', p.id === activeId ? 'bg-brand-50' : 'hover:bg-gray-50')}>
                <FileText className={cn('mt-0.5 size-4 shrink-0', p.id === activeId ? 'text-brand-600' : 'text-muted')} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', p.id === activeId && 'text-brand-600')}>{p.title}</p>
                  <p className="text-xs text-muted">Updated {formatDate(p.updatedAt)}</p>
                </div>
                {!p.published && <StatusBadge status="draft" />}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {page ? <LegalEditor key={`${page.id}-${page.updatedAt}`} page={page} /> : <Card className="h-96 animate-pulse" />}
    </div>
  )
}

function LegalEditor({ page }: { page: LegalPage }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [d, setD] = useState(page)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(page)

  const setSection = (id: string, patch: Partial<LegalPage['sections'][number]>) => setD(x => ({ ...x, sections: x.sections.map(s => (s.id === id ? { ...s, ...patch } : s)) }))
  const invalid = !d.title.trim() || d.sections.some(s => !s.title.trim() || !s.body.trim())

  const save = async () => {
    setSaving(true)
    try {
      await legalPagesDb.update(page.id, { ...d, updatedAt: nowIso(), updatedBy: 'Admin' })
      toast(`${d.title} saved · “Last updated” refreshed`)
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const removeSection = async (id: string, title: string) => {
    const ok = await confirm({ title: 'Remove section?', message: title || 'Untitled section', confirmLabel: 'Remove', tone: 'danger' })
    if (ok === false) return
    setD(x => ({ ...x, sections: x.sections.filter(s => s.id !== id) }))
  }

  return (
    <Card>
      <CardHeader
        title={d.title}
        subtitle={`Last updated ${formatDateTime(page.updatedAt)} by ${page.updatedBy}`}
        action={
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { key: 'edit', label: 'Edit' },
              { key: 'preview', label: 'Preview' },
            ]}
          />
        }
      />
      <CardBody className="space-y-5">
        {mode === 'edit' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Page title" value={d.title} onChange={e => setD({ ...d, title: e.target.value })} />
              <Input label="Subtitle" value={d.subtitle} onChange={e => setD({ ...d, subtitle: e.target.value })} />
            </div>
            <Toggle checked={d.published} onChange={v => setD({ ...d, published: v })} label="Published on website" />
            <div className="space-y-3">
              {d.sections.map((s, i) => (
                <div key={s.id} className="rounded-xl border border-line p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">{i + 1}</span>
                    <div className="flex-1">
                      <Input aria-label="Section title" value={s.title} placeholder="Section title" onChange={e => setSection(s.id, { title: e.target.value })} />
                    </div>
                    <IconButton aria-label="Move up" disabled={i === 0} onClick={() => setD(x => ({ ...x, sections: moveItem(x.sections, i, -1) }))}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton aria-label="Move down" disabled={i === d.sections.length - 1} onClick={() => setD(x => ({ ...x, sections: moveItem(x.sections, i, 1) }))}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton aria-label="Remove section" onClick={() => removeSection(s.id, s.title)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <Textarea aria-label="Section body" rows={3} value={s.body} onChange={e => setSection(s.id, { body: e.target.value })} />
                </div>
              ))}
            </div>
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setD(x => ({ ...x, sections: [...x.sections, { id: newId('SEC'), title: '', body: '' }] }))}>
              Add section
            </Button>
          </>
        ) : (
          <article className="rounded-2xl border border-line">
            <div className="rounded-t-2xl bg-brand-gradient px-6 py-8 text-center text-white">
              <h2 className="text-2xl font-bold">{d.title}</h2>
              <p className="mt-1 text-sm opacity-90">{d.subtitle}</p>
              <p className="mt-3 text-xs opacity-80">Last updated: {formatDate(dirty ? nowIso() : page.updatedAt)}</p>
            </div>
            <div className="space-y-5 p-6">
              {d.sections.map(s => (
                <section key={s.id}>
                  <h3 className="mb-1 font-semibold text-brand-600">{s.title}</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-ink">{s.body}</p>
                </section>
              ))}
            </div>
          </article>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {dirty && <span className="mr-auto text-xs text-amber-700">Unsaved changes</span>}
          {mode === 'edit' && (
            <Button variant="ghost" icon={<Eye className="size-4" />} onClick={() => setMode('preview')}>
              Preview
            </Button>
          )}
          {mode === 'preview' && (
            <Button variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setMode('edit')}>
              Edit
            </Button>
          )}
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
