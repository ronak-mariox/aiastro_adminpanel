import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, IconButton, Input, Modal, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection, type Collection } from '@/lib/store'
import { newId } from '@/lib/utils'
import { categoriesDb, productsDb, purposesDb } from '../data'
import type { Product, Taxonomy } from '../types'

type Kind = 'category' | 'purpose'

export default function CategoriesPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TaxonomyList kind="category" title="Shop by category" collection={categoriesDb} />
      <TaxonomyList kind="purpose" title="Shop by purpose" collection={purposesDb} />
    </div>
  )
}

function TaxonomyList({ kind, title, collection }: { kind: Kind; title: string; collection: Collection<Taxonomy> }) {
  const { items, update, create, remove } = useCollection(collection)
  const { items: products } = useCollection(productsDb)
  const [editing, setEditing] = useState<Taxonomy | 'new' | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  const sorted = [...items].sort((a, b) => a.order - b.order)
  const uses = (p: Product, name: string) => (kind === 'category' ? p.category === name : p.purposes.includes(name))
  const count = (name: string) => products.filter(p => uses(p, name)).length

  const move = async (t: Taxonomy, dir: -1 | 1) => {
    const idx = sorted.findIndex(x => x.id === t.id)
    const other = sorted[idx + dir]
    if (!other) return
    await Promise.all([update(t.id, { order: other.order }), update(other.id, { order: t.order })])
  }

  const del = async (t: Taxonomy) => {
    const n = count(t.name)
    if (kind === 'category' && n > 0) {
      toast(`Move the ${n} product(s) out of "${t.name}" before deleting it`, 'error')
      return
    }
    const ok = await confirm({
      title: `Delete "${t.name}"?`,
      message: n ? `It will be removed from ${n} product(s).` : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (ok === false) return
    if (n) await Promise.all(products.filter(p => uses(p, t.name)).map(p => productsDb.update(p.id, { purposes: p.purposes.filter(x => x !== t.name) })))
    await remove(t.id)
    toast(`${kind === 'category' ? 'Category' : 'Purpose'} deleted`)
  }

  const save = async (draft: Taxonomy, previous?: Taxonomy) => {
    if (previous) {
      await update(draft.id, draft)
      // Renames cascade to products so filters keep working.
      if (previous.name !== draft.name) {
        const affected = products.filter(p => uses(p, previous.name))
        await Promise.all(
          affected.map(p =>
            productsDb.update(p.id, kind === 'category' ? { category: draft.name } : { purposes: p.purposes.map(x => (x === previous.name ? draft.name : x)) }),
          ),
        )
      }
      toast('Saved')
    } else {
      await create({ ...draft, order: Math.max(0, ...items.map(i => i.order)) + 1 })
      toast(`${draft.name} added`)
    }
    setEditing(null)
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`${items.length} entries · shown on the UserApp shop home`}
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setEditing('new')}>
            Add
          </Button>
        }
      />
      <ul className="divide-y divide-line">
        {sorted.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex flex-col">
              <button type="button" disabled={i === 0} onClick={() => move(t, -1)} className="text-muted hover:text-ink disabled:opacity-30" aria-label="Move up">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" disabled={i === sorted.length - 1} onClick={() => move(t, 1)} className="text-muted hover:text-ink disabled:opacity-30" aria-label="Move down">
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-muted">
                {count(t.name)} products{t.description && ` · ${t.description}`}
              </p>
            </div>
            <Toggle
              checked={t.active}
              onChange={async v => {
                await update(t.id, { active: v })
                toast(`${t.name} ${v ? 'visible' : 'hidden'} in app`, 'info')
              }}
            />
            <IconButton aria-label="Edit" onClick={() => setEditing(t)}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton aria-label="Delete" onClick={() => del(t)} className="hover:text-red-600">
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      {editing && (
        <TaxonomyModal
          kind={kind}
          initial={editing === 'new' ? undefined : editing}
          existing={items}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Card>
  )
}

function TaxonomyModal({
  kind,
  initial,
  existing,
  onClose,
  onSave,
}: {
  kind: Kind
  initial?: Taxonomy
  existing: Taxonomy[]
  onClose: () => void
  onSave: (t: Taxonomy, previous?: Taxonomy) => Promise<void>
}) {
  const [draft, setDraft] = useState<Taxonomy>(initial ?? { id: newId(kind === 'category' ? 'CAT' : 'PUR'), name: '', description: '', active: true, order: 0 })
  const [saving, setSaving] = useState(false)
  const name = draft.name.trim()
  const duplicate = existing.some(e => e.id !== draft.id && e.name.toLowerCase() === name.toLowerCase())
  const error = !name ? undefined : duplicate ? 'Already exists' : undefined

  const submit = async () => {
    if (!name || duplicate) return
    setSaving(true)
    await onSave({ ...draft, name }, initial)
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`${initial ? 'Edit' : 'Add'} ${kind}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!name || duplicate} onClick={submit}>
            Save
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Input label="Name" value={draft.name} error={error} onChange={e => setDraft({ ...draft, name: e.target.value })} autoFocus />
        <Textarea label="Description" rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
        <Toggle checked={draft.active} onChange={v => setDraft({ ...draft, active: v })} label="Visible in app" />
        {initial && initial.name !== name && name && <p className="text-xs text-amber-700">Renaming updates every product that uses “{initial.name}”.</p>}
      </div>
    </Modal>
  )
}
