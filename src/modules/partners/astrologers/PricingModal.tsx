import { useState } from 'react'
import { astrologersDb, type Astrologer } from '@/data'
import { Button, Input, Modal, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'

type Props = { astrologer: Astrologer; open: boolean; onClose: () => void }

export function PricingModal(props: Props) {
  if (!props.open) return null
  return <PricingForm {...props} />
}

function PricingForm({ astrologer, onClose }: Props) {
  const toast = useToast()
  const [values, setValues] = useState({ chat: String(astrologer.pricing.chat), call: String(astrologer.pricing.call), video: String(astrologer.pricing.video) })
  const [saving, setSaving] = useState(false)
  const keys = ['chat', 'call', 'video'] as const
  const errors = Object.fromEntries(keys.map(k => [k, values[k] !== '' && (Number(values[k]) === 0 || (Number(values[k]) >= 5 && Number(values[k]) <= 500)) ? '' : '₹5–500 per minute (0 = not offered)']))
  const invalid = keys.some(k => errors[k])

  const save = async () => {
    if (invalid) return
    setSaving(true)
    try {
      await astrologersDb.update(astrologer.id, { pricing: { chat: Number(values.chat), call: Number(values.call), video: Number(values.video) } })
      toast('Pricing updated')
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Edit pricing"
      subtitle={`${astrologer.name} · per-minute rates charged to customers (applies immediately)`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={invalid} onClick={save}>
            Save pricing
          </Button>
        </>
      }>
      <div className="space-y-4">
        {keys.map(k => (
          <Input
            key={k}
            type="number"
            label={`${k.charAt(0).toUpperCase() + k.slice(1)} (₹/min)`}
            hint={`Current ₹${astrologer.pricing[k]}`}
            value={values[k]}
            error={errors[k] || undefined}
            onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
          />
        ))}
      </div>
    </Modal>
  )
}
