import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Avatar, Button, Card, CardBody, CardHeader, IconButton, Input, Modal, Segmented, StatusBadge, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { newId } from '@/lib/utils'
import { moveItem } from '../marketing/utils'
import { ServicePagesEditor } from './ServicePagesEditor'
import { homeStatsDb, teamDb, timelineDb } from './data'
import type { HomeStat, TeamMember, TimelineItem } from './types'

type Section = 'home' | 'about' | 'services'

export function WebsiteTab() {
  const [section, setSection] = useState<Section>('home')
  return (
    <div className="space-y-6">
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { key: 'home', label: 'Home hero stats' },
          { key: 'about', label: 'About page' },
          { key: 'services', label: 'Service pages' },
        ]}
      />
      {section === 'home' && <HomeStatsEditor />}
      {section === 'about' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <TimelineEditor />
          <TeamEditor />
        </div>
      )}
      {section === 'services' && <ServicePagesEditor />}
    </div>
  )
}

function HomeStatsEditor() {
  const { items, loading } = useCollection(homeStatsDb)
  if (loading && items.length === 0) return <Card className="h-64 animate-pulse" />
  return <HomeStatsForm key={items.map(i => `${i.id}${i.value}${i.label}${i.order}`).join('|')} stats={[...items].sort((a, b) => a.order - b.order)} />
}

function HomeStatsForm({ stats }: { stats: HomeStat[] }) {
  const toast = useToast()
  const [list, setList] = useState(stats)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(stats)
  const invalid = list.some(s => !s.label.trim() || !s.value.trim())
  const setRow = (id: string, patch: Partial<HomeStat>) => setList(l => l.map(s => (s.id === id ? { ...s, ...patch } : s)))

  const save = async () => {
    setSaving(true)
    const ordered = list.map((s, i) => ({ ...s, order: i + 1 }))
    const existing = homeStatsDb.snapshot()
    await Promise.all(existing.filter(e => !ordered.some(o => o.id === e.id)).map(e => homeStatsDb.remove(e.id)))
    for (const s of ordered) {
      if (existing.some(e => e.id === s.id)) await homeStatsDb.update(s.id, s)
      else await homeStatsDb.create(s)
    }
    setSaving(false)
    toast('Home stats published')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Hero & About stats" subtitle="Shown under the website hero and on the About page" />
        <CardBody className="space-y-3">
          {list.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="w-28 shrink-0 sm:w-36">
                <Input aria-label="Value" value={s.value} placeholder="50,000+" onChange={e => setRow(s.id, { value: e.target.value })} />
              </div>
              <div className="min-w-0 flex-1">
                <Input aria-label="Label" value={s.label} placeholder="Happy Users" onChange={e => setRow(s.id, { label: e.target.value })} />
              </div>
              <IconButton aria-label="Move up" disabled={i === 0} onClick={() => setList(l => moveItem(l, i, -1))}>
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton aria-label="Move down" disabled={i === list.length - 1} onClick={() => setList(l => moveItem(l, i, 1))}>
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton aria-label="Remove" onClick={() => setList(l => l.filter(x => x.id !== s.id))}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
            <Button variant="secondary" icon={<Plus className="size-4" />} disabled={list.length >= 8} onClick={() => setList(l => [...l, { id: newId('HS'), label: '', value: '', order: l.length + 1 }])}>
              Add stat
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!dirty} onClick={() => setList(stats)}>
                Discard
              </Button>
              <Button icon={<Save className="size-4" />} disabled={!dirty || invalid} loading={saving} onClick={save}>
                Publish
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Preview" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-brand-gradient p-4 text-white sm:grid-cols-3 xl:grid-cols-2">
            {list.map(s => (
              <div key={s.id} className="rounded-xl bg-white/15 p-3 text-center">
                <p className="text-lg font-bold">{s.value || '—'}</p>
                <p className="text-[11px] opacity-90">{s.label || 'Label'}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function TimelineEditor() {
  const { items, update, create, remove } = useCollection(timelineDb)
  const toast = useToast()
  const confirm = useConfirm()
  const [edit, setEdit] = useState<TimelineItem | null>(null)
  const sorted = [...items].sort((a, b) => a.year.localeCompare(b.year))
  const valid = !!edit && /^\d{4}$/.test(edit.year) && edit.text.trim().length > 5

  const save = async () => {
    if (!edit || !valid) return
    if (items.some(i => i.id === edit.id)) await update(edit.id, edit)
    else await create(edit)
    toast('Timeline updated')
    setEdit(null)
  }

  return (
    <Card>
      <CardHeader
        title="Our journey (timeline)"
        subtitle="Sorted by year automatically"
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEdit({ id: newId('TL'), year: '2026', text: '' })}>
            Add
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {edit && !items.some(i => i.id === edit.id) && <TimelineRow edit={edit} setEdit={setEdit} save={save} valid={valid} />}
        <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
          {sorted.map(t =>
            edit?.id === t.id ? (
              <li key={t.id}>
                <TimelineRow edit={edit} setEdit={setEdit} save={save} valid={valid} />
              </li>
            ) : (
              <li key={t.id} className="relative flex items-start gap-2">
                <span className="absolute top-1 -left-[27px] size-3 rounded-full bg-brand-600 ring-4 ring-white" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-600">{t.year}</p>
                  <p className="text-sm text-muted">{t.text}</p>
                </div>
                <IconButton aria-label="Edit" onClick={() => setEdit(t)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  aria-label="Delete"
                  onClick={async () => {
                    const ok = await confirm({ title: `Delete ${t.year} milestone?`, confirmLabel: 'Delete', tone: 'danger' })
                    if (ok === false) return
                    await remove(t.id)
                    toast('Milestone deleted')
                  }}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ),
          )}
        </ol>
      </CardBody>
    </Card>
  )
}

function TimelineRow({ edit, setEdit, save, valid }: { edit: TimelineItem; setEdit: (t: TimelineItem | null) => void; save: () => void; valid: boolean }) {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-gray-50 p-3">
      <div className="w-28">
        <Input aria-label="Year" value={edit.year} maxLength={4} onChange={e => setEdit({ ...edit, year: e.target.value })} />
      </div>
      <Textarea aria-label="Milestone" rows={2} value={edit.text} placeholder="What happened this year?" onChange={e => setEdit({ ...edit, text: e.target.value })} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" icon={<X className="size-4" />} onClick={() => setEdit(null)}>
          Cancel
        </Button>
        <Button size="sm" icon={<Check className="size-4" />} disabled={!valid} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  )
}

function TeamEditor() {
  const { items, update, remove } = useCollection(teamDb)
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState<{ m?: TeamMember } | null>(null)
  const sorted = [...items].sort((a, b) => a.order - b.order)

  const move = async (i: number, dir: -1 | 1) => {
    const a = sorted[i]!
    const b = sorted[i + dir]
    if (!b) return
    await Promise.all([update(a.id, { order: b.order }), update(b.id, { order: a.order })])
  }

  return (
    <Card>
      <CardHeader
        title="Team members"
        subtitle="About › Meet the team"
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setForm({})}>
            Add
          </Button>
        }
      />
      <ul className="divide-y divide-line">
        {sorted.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.name} src={m.photoUrl || undefined} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name} {!m.active && <StatusBadge status="inactive" className="ml-1" />}
              </p>
              <p className="truncate text-xs text-muted">{m.role}</p>
            </div>
            <IconButton aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp className="size-4" />
            </IconButton>
            <IconButton aria-label="Move down" disabled={i === sorted.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown className="size-4" />
            </IconButton>
            <IconButton aria-label="Edit" onClick={() => setForm({ m })}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              aria-label="Delete"
              onClick={async () => {
                const ok = await confirm({ title: `Remove ${m.name}?`, confirmLabel: 'Remove', tone: 'danger' })
                if (ok === false) return
                await remove(m.id)
                toast('Team member removed')
              }}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      {form && <TeamForm key={form.m?.id ?? 'new'} member={form.m} onClose={() => setForm(null)} />}
    </Card>
  )
}

function TeamForm({ member, onClose }: { member?: TeamMember; onClose: () => void }) {
  const toast = useToast()
  const [d, setD] = useState({ name: member?.name ?? '', role: member?.role ?? '', bio: member?.bio ?? '', photoUrl: member?.photoUrl ?? '', active: member?.active ?? true })
  const [saving, setSaving] = useState(false)
  const valid = d.name.trim() && d.role.trim()

  const save = async () => {
    setSaving(true)
    if (member) await teamDb.update(member.id, d)
    else await teamDb.create({ ...d, id: newId('TM'), order: teamDb.snapshot().length + 1 })
    setSaving(false)
    toast(member ? 'Team member updated' : 'Team member added')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member ? 'Edit team member' : 'New team member'}
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
        <div className="flex items-center gap-4">
          <Avatar name={d.name || '?'} src={d.photoUrl || undefined} size={64} />
          <div className="flex-1">
            <Input label="Photo URL" value={d.photoUrl} placeholder="https://…" onChange={e => setD({ ...d, photoUrl: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />
          <Input label="Role" value={d.role} onChange={e => setD({ ...d, role: e.target.value })} />
        </div>
        <Textarea label="Bio" rows={3} value={d.bio} onChange={e => setD({ ...d, bio: e.target.value })} />
        <Toggle checked={d.active} onChange={v => setD({ ...d, active: v })} label="Show on website" />
      </div>
    </Modal>
  )
}
