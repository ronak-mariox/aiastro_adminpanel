import { useState } from 'react'
import { Button, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { formatINR, formatNumber } from '@/lib/utils'

export type Adjustment = { kind: 'credit' | 'debit'; amount: number; reason: string }

const REASONS = {
  wallet: ['Refund for failed consultation', 'Goodwill credit', 'Astrologer no-show compensation', 'Promotional credit', 'Duplicate recharge reversal', 'Fraudulent recharge reversal', 'Other'],
  points: ['Missing points for completed consultation', 'Review reward (20 pts)', 'Referral reward (500 pts)', 'Festival bonus', 'Points misuse reversal', 'Other'],
}

export default function AdjustModal({
  open,
  onClose,
  mode,
  current,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  mode: 'wallet' | 'points'
  current: number
  onSubmit: (a: Adjustment) => Promise<void>
}) {
  const [kind, setKind] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [preset, setPreset] = useState(REASONS[mode][0]!)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fmt = mode === 'wallet' ? formatINR : (n: number) => `${formatNumber(n)} pts`
  const value = Number(amount)
  const next = kind === 'credit' ? current + (value || 0) : current - (value || 0)

  const submit = async () => {
    if (!value || value <= 0 || !Number.isFinite(value)) return setError(`Enter a valid ${mode === 'wallet' ? 'amount' : 'number of points'}`)
    if (mode === 'points' && !Number.isInteger(value)) return setError('Points must be a whole number')
    if (kind === 'debit' && value > current) return setError(`Cannot debit more than the current ${mode === 'wallet' ? 'balance' : 'points'} (${fmt(current)})`)
    if (preset === 'Other' && !note.trim()) return setError('Describe the reason')
    setError('')
    setSaving(true)
    try {
      await onSubmit({ kind, amount: value, reason: [preset === 'Other' ? '' : preset, note.trim()].filter(Boolean).join(' — ') })
      onClose()
    } catch {
      /* the page already showed the error; keep the form open */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={mode === 'wallet' ? 'Adjust wallet' : 'Adjust reward points'}
      subtitle={`Current: ${fmt(current)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={kind === 'credit' ? 'success' : 'danger'} loading={saving} onClick={submit}>
            {kind === 'credit' ? 'Credit' : 'Debit'} {value > 0 ? fmt(value) : ''}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { key: 'credit', label: 'Credit' },
            { key: 'debit', label: 'Debit' },
          ]}
        />
        <Input
          label={mode === 'wallet' ? 'Amount (₹)' : 'Points'}
          type="number"
          min={1}
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          hint={value > 0 ? `New ${mode === 'wallet' ? 'balance' : 'total'}: ${fmt(Math.max(0, next))}` : undefined}
        />
        <Select label="Reason" value={preset} options={REASONS[mode]} onChange={e => setPreset(e.target.value)} />
        <Textarea label="Note" hint={preset === 'Other' ? 'Required' : 'Optional'} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Ticket id, context…" />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
