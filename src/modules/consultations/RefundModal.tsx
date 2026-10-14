import { useState } from 'react'
import { Button, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import type { ConsultationRefund } from './types'

const REASONS = ['Poor network / call dropped', 'Astrologer unresponsive mid-session', 'Customer complaint upheld', 'Wrong / irrelevant guidance', 'Billing error', 'Other']

export default function RefundModal({ max, onClose, onConfirm }: { max: number; onClose: () => void; onConfirm: (r: Omit<ConsultationRefund, 'at'>) => Promise<void> }) {
  const [type, setType] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState(Math.round(max / 2))
  const [reason, setReason] = useState(REASONS[0]!)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const value = type === 'full' ? max : amount
  const amountError = type === 'partial' && (!(amount > 0) || amount > max) ? `Enter an amount between ₹1 and ${formatINR(max)}` : undefined
  const noteError = reason === 'Other' && !note.trim() ? 'Describe the reason' : undefined

  const submit = async () => {
    if (amountError || noteError) return
    setSaving(true)
    await onConfirm({ type, amount: value, reason: note.trim() ? `${reason} — ${note.trim()}` : reason })
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Issue refund"
      subtitle="Amount is credited back to the customer's wallet"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={saving} disabled={!!amountError || !!noteError} onClick={submit}>
            Refund {formatINR(value)}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { key: 'full', label: `Full · ${formatINR(max)}` },
            { key: 'partial', label: 'Partial' },
          ]}
        />
        {type === 'partial' && <Input label="Refund amount (₹)" type="number" min={1} max={max} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} error={amountError} hint={`max ${formatINR(max)}`} />}
        <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)} options={REASONS} />
        <Textarea label="Note" rows={3} value={note} onChange={e => setNote(e.target.value)} error={noteError} placeholder="Visible in the customer's wallet history" />
      </div>
    </Modal>
  )
}
