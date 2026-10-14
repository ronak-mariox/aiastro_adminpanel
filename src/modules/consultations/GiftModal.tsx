import { useState } from 'react'
import { Button, Input, Modal, Toggle } from '@/components/ui'
import type { Gift } from './types'

export type GiftDraft = Pick<Gift, 'name' | 'icon' | 'price' | 'active'>

const ICON_CHOICES = ['🍫', '❤️', '🌹', '📿', '🍬', '🧿', '🪔', '💎', '💰', '🧘', '🪷', '🔱', '🌸', '🕉️', '⭐', '🎁']

export default function GiftModal({ gift, onClose, onSave }: { gift: Gift | null; onClose: () => void; onSave: (d: GiftDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<GiftDraft>(gift ? { name: gift.name, icon: gift.icon, price: gift.price, active: gift.active } : { name: '', icon: '🎁', price: 51, active: true })
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const errors = {
    name: !draft.name.trim() ? 'Name is required' : undefined,
    price: !(draft.price > 0) ? 'Enter a price above ₹0' : undefined,
    icon: !draft.icon.trim() ? 'Pick an icon' : undefined,
  }
  const valid = !errors.name && !errors.price && !errors.icon

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    await onSave({ ...draft, name: draft.name.trim() })
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={gift ? 'Edit gift' : 'Add gift'}
      subtitle="Gifts customers can send during a consultation"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {gift ? 'Save changes' : 'Add gift'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-3xl">{draft.icon || '?'}</span>
          <div className="flex-1">
            <Input label="Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} error={touched ? errors.name : undefined} placeholder="e.g. Rose" />
          </div>
        </div>
        <div>
          <Input label="Icon (emoji)" value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} error={touched ? errors.icon : undefined} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICON_CHOICES.map(i => (
              <button key={i} type="button" onClick={() => setDraft({ ...draft, icon: i })} className={`size-9 rounded-lg border text-lg transition ${draft.icon === i ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-gray-50'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <Input label="Price (₹)" type="number" min={1} value={draft.price || ''} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} error={touched ? errors.price : undefined} />
        <Toggle checked={draft.active} onChange={v => setDraft({ ...draft, active: v })} label="Active — visible in the gift tray" />
      </div>
    </Modal>
  )
}
