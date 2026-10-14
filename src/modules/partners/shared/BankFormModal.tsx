import { useState } from 'react'
import { Button, Input, Modal, Select } from '@/components/ui'
import { BANKS } from '../data'
import type { BankInfo } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  initial: BankInfo & { upi?: string }
  withUpi?: boolean
  onSave: (bank: BankInfo & { upi?: string; accountNumber: string }) => Promise<void>
}

export function BankFormModal(props: Props) {
  if (!props.open) return null
  return <BankForm {...props} />
}

function BankForm({ onClose, initial, withUpi, onSave }: Props) {
  const [form, setForm] = useState({ ...initial, bank: initial.bank || BANKS[0]!, accountNumber: '', upi: initial.upi ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const e: Record<string, string> = {}
    if (!/^\d{9,18}$/.test(form.accountNumber)) e.accountNumber = '9–18 digit account number'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) e.ifsc = 'Invalid IFSC (e.g. HDFC0001234)'
    if (form.holder.trim().length < 3) e.holder = 'Required'
    if (withUpi && form.upi && !/^[\w.-]+@[\w]+$/.test(form.upi)) e.upi = 'Invalid UPI ID'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSave({ bank: form.bank, accountNumber: form.accountNumber, accountLast4: form.accountNumber.slice(-4), ifsc: form.ifsc.toUpperCase(), holder: form.holder.trim(), upi: withUpi ? form.upi : undefined })
      onClose()
    } catch {
      // the caller shows the error; keep the form open
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Update payout account"
      subtitle={initial.accountLast4 ? `Current: ${initial.bank} ••••${initial.accountLast4} · saved as verified` : 'No account on file · saved as verified'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save account
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Bank" value={form.bank} options={BANKS.includes(form.bank) ? BANKS : [form.bank, ...BANKS]} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} />
        <Input label="Account holder" value={form.holder} error={errors.holder} onChange={e => setForm(f => ({ ...f, holder: e.target.value }))} />
        <Input label="Account number" inputMode="numeric" value={form.accountNumber} error={errors.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))} />
        <Input label="IFSC" value={form.ifsc} error={errors.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))} />
        {withUpi && (
          <div className="sm:col-span-2">
            <Input label="UPI ID" value={form.upi} error={errors.upi} placeholder="name@okaxis" onChange={e => setForm(f => ({ ...f, upi: e.target.value.trim() }))} />
          </div>
        )}
      </div>
    </Modal>
  )
}
