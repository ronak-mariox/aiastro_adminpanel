import { useState } from 'react'
import { LANGUAGES, panditsDb, patchPandit, type Pandit } from '@/data'
import { Button, Input, Modal, Select, Textarea, Toggle, useToast } from '@/components/ui'
import { api, ApiError, errorMessage } from '@/lib/api'
import { refreshPartner } from '../actions'
import { CITIES, PUJA_TYPES } from '../data'
import { ChipPicker } from '../shared/ChipPicker'
import { isEmail, isPhone, normalizePhone } from '../shared/validate'

type Props = {
  open: boolean
  onClose: () => void
  pandit?: Pandit
  about?: string
  address?: string
  onSaved?: (id: string) => void
}

export function PanditFormModal(props: Props) {
  if (!props.open) return null
  return <PanditForm {...props} />
}

function PanditForm({ onClose, pandit, about, address, onSaved }: Props) {
  const toast = useToast()
  const editing = !!pandit
  const [form, setForm] = useState({
    name: pandit?.name ?? '',
    phone: pandit?.phone ?? '',
    email: pandit?.email ?? '',
    city: pandit?.city || 'Varanasi',
    serviceRadiusKm: String(pandit?.serviceRadiusKm || 10),
    experienceYears: String(pandit?.experienceYears ?? ''),
    baseFee: String(pandit?.baseFee || 2100),
    languages: pandit?.languages ?? ['Hindi', 'Sanskrit'],
    expertise: pandit?.expertise ?? [],
    onlinePuja: pandit?.onlinePuja ?? false,
    about: about ?? '',
    address: address ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 3) e.name = 'Enter the full name'
    if (!isPhone(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile'
    if (!isEmail(form.email)) e.email = 'Enter a valid email'
    const r = Number(form.serviceRadiusKm)
    if (!r || r < 1 || r > 200) e.serviceRadiusKm = '1–200 km'
    const exp = Number(form.experienceYears)
    if (form.experienceYears === '' || Number.isNaN(exp) || exp < 0 || exp > 70) e.experienceYears = '0–70 years'
    const fee = Number(form.baseFee)
    if (!fee || fee < 500 || fee > 100000) e.baseFee = '₹500–1,00,000'
    if (!form.expertise.length) e.expertise = 'Pick at least one puja'
    if (!form.languages.length) e.languages = 'Pick at least one language'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim(),
      city: form.city,
      serviceRadiusKm: Number(form.serviceRadiusKm),
      experienceYears: Number(form.experienceYears),
      baseFee: Number(form.baseFee),
      languages: form.languages,
      specializations: form.expertise,
      offersOnlinePuja: form.onlinePuja,
      about: form.about.trim(),
      address: { street: form.address.trim() },
    }
    try {
      if (pandit) {
        await patchPandit(pandit.id, body)
        await refreshPartner('pandit', pandit.id)
        toast('Pandit updated')
        onSaved?.(pandit.id)
      } else {
        const { pandit: created } = await api.post<{ pandit: { id: string } }>('/admin/panel/pandits', body)
        await panditsDb.refresh?.()
        toast(`${body.name} added — they sign in to the Pandit app with ${body.phone}`)
        onSaved?.(created.id)
      }
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) setErrors(Object.fromEntries(e.errors.map(f => [f.field === 'specializations' ? 'expertise' : f.field, f.message])))
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit pandit' : 'Add pandit'}
      subtitle={editing ? pandit.code || pandit.id : 'Admin-added pandits are listed at once; they sign in to the Pandit app with this mobile number.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {editing ? 'Save changes' : 'Add pandit'}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="e.g. Ramesh Tiwari" />
        <Input label="Mobile" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="+91 98XXXXXXXX" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
        <Select label="City" value={form.city} options={CITIES.includes(form.city) ? CITIES : [form.city, ...CITIES]} onChange={e => set('city', e.target.value)} />
        <Input label="Service radius (km)" type="number" value={form.serviceRadiusKm} onChange={e => set('serviceRadiusKm', e.target.value)} error={errors.serviceRadiusKm} />
        <Input label="Base fee (₹)" type="number" value={form.baseFee} onChange={e => set('baseFee', e.target.value)} error={errors.baseFee} />
        <Input label="Experience (years)" type="number" value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} error={errors.experienceYears} />
        <div className="flex items-end pb-2">
          <Toggle checked={form.onlinePuja} onChange={v => set('onlinePuja', v)} label="Offers online (e-puja)" />
        </div>
        <div className="sm:col-span-2">
          <ChipPicker label="Puja expertise" options={[...new Set([...PUJA_TYPES, ...form.expertise])]} value={form.expertise} onChange={v => set('expertise', v)} error={errors.expertise} />
        </div>
        <div className="sm:col-span-2">
          <ChipPicker label="Languages" options={[...new Set([...LANGUAGES, ...form.languages])]} value={form.languages} onChange={v => set('languages', v)} error={errors.languages} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Street address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="House no, area" />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="About" rows={3} value={form.about} onChange={e => set('about', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
