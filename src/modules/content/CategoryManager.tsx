import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, IconButton, Input, Modal, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { newId } from '@/lib/utils'
import { blogCategoriesDb, blogsDb, slugify } from './data'
import type { BlogCategory } from './types'

type Draft = { id?: string; name: string; color: string; description: string }

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { items, update, create, remove } = useCollection(blogCategoriesDb)
  const { items: posts } = useCollection(blogsDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')

  const save = async () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return setError('Name is required')
    if (items.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== draft.id)) return setError('Category already exists')
    const payload = { name, slug: slugify(name), color: draft.color, description: draft.description.trim() }
    if (draft.id) {
      const before = items.find(c => c.id === draft.id)
      await update(draft.id, payload)
      // Posts store the category by name: re-save the ones in a renamed category.
      if (before && before.name !== name) await Promise.all(posts.filter(p => p.categoryId === draft.id).map(p => blogsDb.update(p.id, { categoryId: draft.id! })))
    } else await create({ ...payload, id: newId('CAT') })
    toast(draft.id ? 'Category updated' : 'Category added')
    setDraft(null)
    setError('')
  }

  const del = async (c: BlogCategory) => {
    const count = posts.filter(p => p.categoryId === c.id).length
    if (count) {
      toast(`Move ${count} post(s) out of “${c.name}” before deleting`, 'error')
      return
    }
    const ok = await confirm({ title: `Delete “${c.name}”?`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(c.id)
    toast('Category deleted')
  }

  return (
    <Modal open onClose={onClose} title="Blog categories" subtitle="Colours are used for category chips on the website" size="lg">
      <ul className="divide-y divide-line">
        {items.map(c =>
          draft?.id === c.id ? null : (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="size-8 shrink-0 rounded-lg" style={{ background: c.color }} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  /{c.slug} · {posts.filter(p => p.categoryId === c.id).length} posts
                </p>
              </div>
              <IconButton aria-label="Edit" onClick={() => setDraft({ id: c.id, name: c.name, color: c.color, description: c.description })}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton aria-label="Delete" onClick={() => del(c)}>
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ),
        )}
      </ul>

      {draft ? (
        <div className="mt-4 space-y-3 rounded-xl border border-line bg-gray-50 p-4">
          <div className="flex items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Colour</span>
              <input type="color" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white" />
            </label>
            <div className="flex-1">
              <Input label="Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} error={error} hint={draft.name && `/${slugify(draft.name)}`} />
            </div>
          </div>
          <Input label="Description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" icon={<X className="size-4" />} onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" icon={<Check className="size-4" />} onClick={save}>
              {draft.id ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" className="mt-4" icon={<Plus className="size-4" />} onClick={() => setDraft({ name: '', color: '#c8102e', description: '' })}>
          Add category
        </Button>
      )}
    </Modal>
  )
}
