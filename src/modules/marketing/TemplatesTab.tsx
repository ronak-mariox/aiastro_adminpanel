import { useState } from 'react'
import { Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Badge, Button, DataTable, IconButton, Input, Modal, Select, StatusBadge, Textarea, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatNumber, newId } from '@/lib/utils'
import { CHANNELS, NOTIFICATION_TYPES, templatesDb } from './data'
import type { Channel, NotificationTemplate, NotificationType } from './types'

export function TemplatesTab({ onUse }: { onUse: (t: NotificationTemplate) => void }) {
  const { items, loading, update, remove } = useCollection(templatesDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [editing, setEditing] = useState<{ t?: NotificationTemplate } | null>(null)

  const del = async (t: NotificationTemplate) => {
    if (t.trigger === 'automatic') {
      toast('System templates can be disabled but not deleted', 'error')
      return
    }
    const ok = await confirm({ title: `Delete “${t.name}”?`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(t.id)
    toast('Template deleted')
  }

  const columns: Column<NotificationTemplate>[] = [
    {
      key: 'name',
      header: 'Template',
      sortValue: t => t.name,
      render: t => (
        <div className="min-w-56">
          <p className="font-medium">{t.name}</p>
          <p className="line-clamp-1 text-xs text-muted">{t.body}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: t => <Badge tone="brand">{t.type}</Badge> },
    { key: 'channel', header: 'Channel', render: t => CHANNELS.find(c => c.value === t.channel)?.label },
    { key: 'trigger', header: 'Trigger', render: t => <Badge tone={t.trigger === 'automatic' ? 'blue' : 'gray'}>{t.trigger}</Badge> },
    { key: 'usage', header: 'Sent', align: 'right', sortValue: t => t.usage, render: t => formatNumber(t.usage) },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.active ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: t => (
        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
          {t.trigger === 'manual' && (
            <IconButton aria-label="Use template" onClick={() => onUse(t)}>
              <Send className="size-4" />
            </IconButton>
          )}
          <IconButton aria-label="Edit" onClick={() => setEditing({ t })}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton aria-label="Delete" onClick={() => del(t)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        rows={items}
        columns={columns}
        rowKey={t => t.id}
        loading={loading}
        searchText={t => `${t.name} ${t.title} ${t.body}`}
        searchPlaceholder="Search templates…"
        onRowClick={t => setEditing({ t })}
        filters={[
          { key: 'type', label: 'Type', options: NOTIFICATION_TYPES, match: (t, v) => t.type === v },
          { key: 'trigger', label: 'Trigger', options: ['automatic', 'manual'], match: (t, v) => t.trigger === v },
        ]}
        toolbar={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing({})}>
            New template
          </Button>
        }
      />
      {editing && (
        <TemplateForm
          key={editing.t?.id ?? 'new'}
          template={editing.t}
          onClose={() => setEditing(null)}
          onSave={async t => {
            if (editing.t) await update(editing.t.id, t)
            else await templatesDb.create({ ...t, id: newId('TPL'), usage: 0 })
            toast(editing.t ? 'Template updated' : 'Template created')
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

type Draft = Omit<NotificationTemplate, 'id' | 'usage'>

function TemplateForm({ template, onClose, onSave }: { template?: NotificationTemplate; onClose: () => void; onSave: (t: Draft) => Promise<void> }) {
  const [d, setD] = useState<Draft>(template ?? { name: '', type: 'offer', channel: 'push', title: '', body: '', deepLink: 'vedrashi://', trigger: 'manual', active: true })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }))
  const valid = d.name.trim() && d.title.trim() && d.body.trim() && !(d.channel === 'sms' && d.body.length > 160)

  return (
    <Modal
      open
      onClose={onClose}
      title={template ? 'Edit template' : 'New template'}
      subtitle={template?.trigger === 'automatic' ? 'System template — sent automatically on app events' : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            loading={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(d)
              setSaving(false)
            }}>
            Save
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Name" value={d.name} onChange={e => set('name', e.target.value)} />
        </div>
        <Select label="Type" value={d.type} options={NOTIFICATION_TYPES} onChange={e => set('type', e.target.value as NotificationType)} />
        <Select label="Channel" value={d.channel} options={CHANNELS} onChange={e => set('channel', e.target.value as Channel)} />
        <div className="sm:col-span-2">
          <Input label="Title" value={d.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Body"
            hint={`${d.body.length}${d.channel === 'sms' ? '/160' : ''} chars`}
            rows={3}
            value={d.body}
            onChange={e => set('body', e.target.value)}
            error={d.channel === 'sms' && d.body.length > 160 ? 'SMS limit is 160 characters' : undefined}
          />
        </div>
        <div className="sm:col-span-2">
          <Input label="Deep link" value={d.deepLink} onChange={e => set('deepLink', e.target.value)} />
        </div>
        <Toggle checked={d.active} onChange={v => set('active', v)} label="Active" />
      </div>
    </Modal>
  )
}
