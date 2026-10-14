import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, IconButton, Input, Modal, SearchInput, Select, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, newId } from '@/lib/utils'
import { FAQ_GROUPS, faqsDb } from './data'
import type { Faq, FaqGroup } from './types'

export function FaqsTab() {
  const { items, update, remove } = useCollection(faqsDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<FaqGroup | 'All'>('All')
  const [editing, setEditing] = useState<{ faq?: Faq; group?: FaqGroup } | null>(null)

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQ_GROUPS.filter(g => group === 'All' || g === group).map(g => ({
      group: g,
      all: items.filter(f => f.group === g).sort((a, b) => a.order - b.order),
      faqs: items
        .filter(f => f.group === g && (!q || `${f.question} ${f.answer}`.toLowerCase().includes(q)))
        .sort((a, b) => a.order - b.order),
    }))
  }, [items, query, group])

  const move = async (list: Faq[], f: Faq, dir: -1 | 1) => {
    const idx = list.findIndex(x => x.id === f.id)
    const other = list[idx + dir]
    if (!other) return
    await Promise.all([update(f.id, { order: other.order }), update(other.id, { order: f.order })])
  }

  const del = async (f: Faq) => {
    const ok = await confirm({ title: 'Delete FAQ?', message: f.question, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(f.id)
    toast('FAQ deleted')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput className="sm:w-72" placeholder="Search questions…" value={query} onChange={e => setQuery(e.target.value)} />
        <Select aria-label="Group" className="sm:w-56" value={group} options={['All', ...FAQ_GROUPS]} onChange={e => setGroup(e.target.value as FaqGroup | 'All')} />
        <Button className="sm:ml-auto" icon={<Plus className="size-4" />} onClick={() => setEditing({ group: group === 'All' ? undefined : group })}>
          Add FAQ
        </Button>
      </div>

      {grouped.map(({ group: g, faqs, all }) => (
        <Card key={g}>
          <CardHeader
            title={g}
            subtitle={`${all.length} questions · ${all.filter(f => f.active).length} live · ${g.startsWith('Website') ? 'shown on website' : 'UserApp › Help'}`}
            action={
              <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setEditing({ group: g })}>
                Add
              </Button>
            }
          />
          {faqs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No questions match.</p>
          ) : (
            <ul className="divide-y divide-line">
              {faqs.map(f => {
                const idx = all.findIndex(x => x.id === f.id)
                return (
                  <li key={f.id} className={cn('flex items-start gap-3 px-5 py-3', !f.active && 'opacity-60')}>
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-muted">{idx + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {f.question} {!f.active && <Badge className="ml-1">Hidden</Badge>}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{f.answer}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                      <Toggle
                        checked={f.active}
                        onChange={async v => {
                          await update(f.id, { active: v })
                          toast(v ? 'FAQ shown' : 'FAQ hidden')
                        }}
                      />
                      <IconButton aria-label="Move up" disabled={idx === 0} onClick={() => move(all, f, -1)}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton aria-label="Move down" disabled={idx === all.length - 1} onClick={() => move(all, f, 1)}>
                        <ArrowDown className="size-4" />
                      </IconButton>
                      <IconButton aria-label="Edit" onClick={() => setEditing({ faq: f })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton aria-label="Delete" onClick={() => del(f)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ))}

      {editing && <FaqForm key={editing.faq?.id ?? 'new'} faq={editing.faq} defaultGroup={editing.group} onClose={() => setEditing(null)} />}
    </div>
  )
}

function FaqForm({ faq, defaultGroup, onClose }: { faq?: Faq; defaultGroup?: FaqGroup; onClose: () => void }) {
  const toast = useToast()
  const [d, setD] = useState({ group: faq?.group ?? defaultGroup ?? FAQ_GROUPS[0]!, question: faq?.question ?? '', answer: faq?.answer ?? '', active: faq?.active ?? true })
  const [saving, setSaving] = useState(false)
  const valid = d.question.trim().length > 5 && d.answer.trim().length > 5

  const save = async () => {
    setSaving(true)
    const lastOrder = Math.max(0, ...faqsDb.snapshot().filter(f => f.group === d.group).map(f => f.order))
    if (faq) {
      await faqsDb.update(faq.id, { ...d, order: faq.group === d.group ? faq.order : lastOrder + 1 })
      toast('FAQ updated')
    } else {
      await faqsDb.create({ ...d, id: newId('FAQ'), order: lastOrder + 1 })
      toast('FAQ added')
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={faq ? 'Edit FAQ' : 'New FAQ'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={saving} onClick={save}>
            Save
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="Group" value={d.group} options={FAQ_GROUPS} onChange={e => setD({ ...d, group: e.target.value as FaqGroup })} />
        <Input label="Question" value={d.question} onChange={e => setD({ ...d, question: e.target.value })} />
        <Textarea label="Answer" rows={4} value={d.answer} onChange={e => setD({ ...d, answer: e.target.value })} />
        <Toggle checked={d.active} onChange={v => setD({ ...d, active: v })} label="Visible" />
      </div>
    </Modal>
  )
}
