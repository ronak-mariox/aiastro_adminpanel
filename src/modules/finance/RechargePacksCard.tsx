import { useState } from 'react'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, IconButton, Input, Modal, Toggle, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { cn, formatINR, newId } from '@/lib/utils'
import { rechargePacksDb } from './data'
import type { RechargePack } from './types'

type Draft = { amount: string; bonus: string; popular: boolean; active: boolean }

export function RechargePacksCard() {
  const { items, create, update, remove, refresh } = useCollection(rechargePacksDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [editing, setEditing] = useState<RechargePack | 'new' | null>(null)
  const packs = [...items].sort((a, b) => a.amount - b.amount)

  /** Only one pack carries the "Most popular" ribbon in the app — the API clears the others; re-read them. */
  const save = async (d: { amount: number; bonus: number; popular: boolean; active: boolean }) => {
    try {
      if (editing === 'new') {
        await create({ id: newId('RP'), ...d })
        toast(`Pack ${formatINR(d.amount)} added`)
      } else if (editing) {
        await update(editing.id, d)
        toast('Recharge pack updated')
      }
      if (d.popular) await refresh()
      setEditing(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const del = async (p: RechargePack) => {
    const ok = await confirm({
      title: 'Delete recharge pack?',
      message: `${formatINR(p.amount)} + ${formatINR(p.bonus)} bonus will no longer be shown in the app.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (ok === false) return
    try {
      await remove(p.id)
      toast('Recharge pack deleted', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Recharge packs"
        subtitle="Wallet top-up packs with bonus credit"
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Add pack
          </Button>
        }
      />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {packs.map(p => (
            <div
              key={p.id}
              className={cn('relative rounded-xl border p-4', p.popular ? 'border-brand-500 bg-brand-50/40' : 'border-line', !p.active && 'opacity-55')}>
              {p.popular && (
                <span className="absolute -top-2.5 left-4">
                  <Badge tone="brand" className="bg-brand-600 text-white">
                    <Star className="size-3" /> Most popular
                  </Badge>
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-semibold">{formatINR(p.amount)}</p>
                  <p className="text-sm text-emerald-700">+ {formatINR(p.bonus)} bonus</p>
                  <p className="mt-1 text-xs text-muted">
                    Wallet gets {formatINR(p.amount + p.bonus)} · {Math.round((p.bonus / p.amount) * 100)}% extra
                  </p>
                </div>
                <div className="flex">
                  <IconButton aria-label="Edit pack" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton aria-label="Delete pack" onClick={() => del(p)} className="hover:text-red-600">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Toggle
                  checked={p.active}
                  label={<span className="text-xs">{p.active ? 'Visible' : 'Hidden'}</span>}
                  onChange={async active => {
                    try {
                      await update(p.id, { active })
                      toast(active ? 'Pack shown in app' : 'Pack hidden', 'info')
                    } catch (e) {
                      toast(errorMessage(e), 'error')
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {packs.length === 0 && <p className="py-6 text-center text-sm text-muted">No recharge packs configured.</p>}
      </CardBody>
      {editing && (
        <PackModal
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          existing={items}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Card>
  )
}

function PackModal({
  initial,
  existing,
  onClose,
  onSave,
}: {
  initial?: RechargePack
  existing: RechargePack[]
  onClose: () => void
  onSave: (d: { amount: number; bonus: number; popular: boolean; active: boolean }) => Promise<void>
}) {
  const [d, setD] = useState<Draft>({
    amount: initial ? String(initial.amount) : '',
    bonus: initial ? String(initial.bonus) : '',
    popular: initial?.popular ?? false,
    active: initial?.active ?? true,
  })
  const [errors, setErrors] = useState<{ amount?: string; bonus?: string }>({})
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const amount = Number(d.amount)
    const bonus = Number(d.bonus || 0)
    const e: typeof errors = {}
    if (!Number.isInteger(amount) || amount <= 0) e.amount = 'Enter a whole rupee amount'
    else if (existing.some(p => p.amount === amount && p.id !== initial?.id)) e.amount = 'A pack with this amount exists'
    if (!Number.isInteger(bonus) || bonus < 0) e.bonus = 'Bonus must be 0 or more'
    else if (amount > 0 && bonus > amount) e.bonus = 'Bonus cannot exceed the pack amount'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    await onSave({ amount, bonus, popular: d.popular, active: d.active })
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={initial ? 'Edit recharge pack' : 'New recharge pack'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {initial ? 'Save pack' : 'Add pack'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Pay amount" hint="₹" type="number" autoFocus value={d.amount} error={errors.amount} onChange={e => setD({ ...d, amount: e.target.value })} />
          <Input label="Bonus credit" hint="₹" type="number" value={d.bonus} error={errors.bonus} onChange={e => setD({ ...d, bonus: e.target.value })} />
        </div>
        <Toggle checked={d.popular} onChange={popular => setD({ ...d, popular })} label="Mark as most popular" />
        <div>
          <Toggle checked={d.active} onChange={active => setD({ ...d, active })} label="Visible in app" />
        </div>
      </div>
    </Modal>
  )
}
