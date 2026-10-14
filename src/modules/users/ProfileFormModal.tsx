import { useState } from 'react'
import { Button, Input, Modal, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import type { Customer, Gender } from '@/data'

export type ProfileForm = Pick<Customer, 'name' | 'phone' | 'email' | 'gender' | 'dob' | 'tob' | 'birthPlace' | 'city' | 'state'>

const EMPTY: ProfileForm = { name: '', phone: '+91 ', email: '', gender: 'Female', dob: '', tob: '', birthPlace: '', city: '', state: '' }

type Errors = Partial<Record<keyof ProfileForm, string>>

function validate(f: ProfileForm): Errors {
  const e: Errors = {}
  if (f.name.trim().length < 2) e.name = 'Enter the full name'
  if (!/^\+91 ?[6-9]\d{9}$/.test(f.phone.trim())) e.phone = 'Use +91 followed by a 10-digit mobile number'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email'
  if (!f.dob) e.dob = 'Required'
  else if (f.dob > new Date().toISOString().slice(0, 10)) e.dob = 'Date of birth cannot be in the future'
  if (!f.city.trim()) e.city = 'Required'
  return e
}

/** Converts "05:30 AM" ↔ "05:30" for the native time input. */
const to24 = (t: string) => {
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(t)
  if (!m) return ''
  let h = Number(m[1]) % 12
  if (m[3] === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
const to12 = (t: string) => {
  if (!t) return 'Unknown'
  const [hs, ms] = t.split(':')
  const h = Number(hs)
  return `${String(h % 12 || 12).padStart(2, '0')}:${ms} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function ProfileFormModal({
  open,
  onClose,
  initial,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: ProfileForm
  title: string
  submitLabel: string
  onSubmit: (f: ProfileForm) => Promise<void>
}) {
  const [form, setForm] = useState<ProfileForm>(() => (initial ? { ...initial, tob: to24(initial.tob) } : EMPTY))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSubmit({ ...form, name: form.name.trim(), phone: form.phone.trim(), tob: to12(form.tob), birthPlace: form.birthPlace.trim() })
      onClose()
    } catch (err) {
      // Server-side field errors land on the matching inputs; anything else was already toasted.
      if (err instanceof ApiError && err.errors.length)
        setErrors(Object.fromEntries(err.errors.map(f => [f.field, f.message])) as Errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {submitLabel}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
        <Input label="Mobile" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
        <Select label="Gender" value={form.gender} options={['Female', 'Male', 'Other']} onChange={e => set('gender', e.target.value as Gender)} />
        <Input label="Date of birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} error={errors.dob} />
        <Input label="Time of birth" hint="Leave empty if unknown" type="time" value={form.tob} onChange={e => set('tob', e.target.value)} />
        <Input label="Place of birth" value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} placeholder="e.g. Varanasi, India" />
        <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} error={errors.city} />
        <Input label="State" value={form.state} onChange={e => set('state', e.target.value)} />
      </div>
    </Modal>
  )
}
