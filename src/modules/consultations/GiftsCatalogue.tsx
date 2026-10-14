import { useState } from 'react'
import { Gift as GiftIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, IconButton, Toggle, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { cn, formatINR, formatNumber } from '@/lib/utils'
import { giftsDb } from './data'
import GiftModal, { type GiftDraft } from './GiftModal'
import type { Gift } from './types'

export default function GiftsCatalogue() {
  const { items, update, create, remove, loading } = useCollection(giftsDb)
  const { can } = useAuth()
  const canManage = can('offers.manage')
  const [editing, setEditing] = useState<Gift | 'new' | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const sorted = [...items].sort((a, b) => a.price - b.price)

  const save = async (d: GiftDraft) => {
    try {
      if (editing === 'new') {
        await create({ id: '', sentCount: 0, ...d })
        toast(`${d.name} added to the gift tray`)
      } else if (editing) {
        await update(editing.id, d)
        toast(`${d.name} updated`)
      }
      setEditing(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const del = async (g: Gift) => {
    const ok = await confirm({ title: `Delete ${g.name}?`, message: 'Customers will no longer be able to send this gift. Past sessions keep their gift history.', confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    try {
      await remove(g.id)
      toast(`${g.name} deleted`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const toggle = async (g: Gift, active: boolean) => {
    try {
      await update(g.id, { active })
      toast(`${g.name} ${active ? 'activated' : 'hidden from gift tray'}`, 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Astrologers receive their consultation share (after the session's commission) of every gift's value. Gifts are shown to customers in ascending price order.
        </p>
        {canManage && (
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Add gift
          </Button>
        )}
      </div>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState icon={GiftIcon} title={loading ? 'Loading gifts…' : 'No gifts yet'} text="Add the first gift customers can send during sessions." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map(g => (
            <Card key={g.id} className={cn('p-4 transition', !g.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-3xl">{g.imageUrl ? <img src={g.imageUrl} alt="" className="size-10 object-contain" /> : g.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="text-lg font-semibold text-brand-600">{formatINR(g.price)}</p>
                  <p className="text-xs text-muted">Sent {formatNumber(g.sentCount)} times</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <Toggle checked={g.active} onChange={v => canManage && toggle(g, v)} label={g.active ? 'Active' : 'Inactive'} />
                <div className={cn('flex', !canManage && 'hidden')}>
                  <IconButton aria-label="Edit" onClick={() => setEditing(g)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton aria-label="Delete" onClick={() => del(g)} className="hover:text-red-600">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <GiftModal gift={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}
