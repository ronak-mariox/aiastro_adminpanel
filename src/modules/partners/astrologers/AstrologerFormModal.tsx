import { useState } from 'react'
import { astrologersDb, patchAstrologer, type Astrologer, type Gender } from '@/data'
import { expertiseId, languageId } from '@/data/adapters'
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { api, ApiError, errorMessage } from '@/lib/api'
import { refreshPartner } from '../actions'
import { ASTRO_LANGUAGES, ASTRO_SKILLS, CITIES } from '../data'
import { ChipPicker } from '../shared/ChipPicker'
import { isEmail, isPhone, normalizePhone } from '../shared/validate'

type Props = {
  open: boolean
  onClose: () => void
  /** Edit mode when given; otherwise creates a new (pending) astrologer. */
  astrologer?: Astrologer
  bio?: string
  onSaved?: (id: string) => void
}

export function AstrologerFormModal(props: Props) {
  if (!props.open) return null
  return <AstrologerForm {...props} />
}

function AstrologerForm({ onClose, astrologer, bio: initialBio, onSaved }: Props) {
  const toast = useToast()
  const editing = !!astrologer
  const [form, setForm] = useState({
    name: astrologer?.name ?? '',
    phone: astrologer?.phone ?? '',
    email: astrologer?.email ?? '',
    gender: (astrologer?.gender || 'Female') as Gender,
    experienceYears: String(astrologer?.experienceYears ?? ''),
    city: astrologer?.city || 'Delhi',
    languages: astrologer?.languages ?? ['Hindi'],
    commission: String(astrologer?.commissionPct ?? 25),
    skills: astrologer?.skills ?? [],
    bio: initialBio ?? '',
    chat: String(astrologer?.pricing.chat ?? 20),
    call: String(astrologer?.pricing.call ?? 25),
    video: String(astrologer?.pricing.video ?? 35),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 3) e.name = 'Enter the full name'
    if (form.phone.trim() && !isPhone(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile'
    if (!isEmail(form.email)) e.email = 'Enter a valid email'
    const exp = Number(form.experienceYears)
    if (!form.experienceYears || Number.isNaN(exp) || exp < 0 || exp > 70) e.experienceYears = '0–70 years'
    if (!form.languages.length) e.languages = 'Pick at least one language'
    if (!form.skills.length) e.skills = 'Pick at least one skill'
    if (!editing) {
      for (const k of ['chat', 'call', 'video'] as const) {
        const n = Number(form[k])
        if (form[k] === '' || (n !== 0 && (n < 5 || n > 500))) e[k] = '₹5–500 (0 = off)'
      }
      const c = Number(form.commission)
      if (form.commission === '' || c < 0 || c > 100) e.commission = '0–100%'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() ? normalizePhone(form.phone) : '',
      email: form.email.trim(),
      gender: form.gender.toLowerCase(),
      experienceYears: Number(form.experienceYears),
      city: form.city,
      languages: form.languages.map(languageId),
      expertise: form.skills.map(expertiseId),
      about: form.bio.trim(),
    }
    try {
      if (astrologer) {
        await patchAstrologer(astrologer.id, body)
        await refreshPartner('astrologer', astrologer.id)
        toast('Profile updated')
        onSaved?.(astrologer.id)
      } else {
        const services = (['chat', 'call', 'video'] as const)
          .filter(k => Number(form[k]) > 0)
          .map(k => ({ type: k, ratePerMinute: Number(form[k]), isEnabled: true }))
        const detail = await api.post<{ astrologer: { id: string } }>('/admin/panel/astrologers', { ...body, services, commissionPercent: Number(form.commission) })
        await astrologersDb.refresh?.()
        toast(`${body.name} added — they sign in to the Astro app with ${body.email}`)
        onSaved?.(detail.astrologer.id)
      }
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) setErrors(Object.fromEntries(e.errors.map(f => [f.field === 'expertise' ? 'skills' : f.field, f.message])))
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
      title={editing ? 'Edit astrologer profile' : 'Add astrologer'}
      subtitle={editing ? astrologer.code || astrologer.email : 'Admin-created accounts are approved at once; the astrologer signs in to the Astro app with this email and uploads KYC there.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {editing ? 'Save changes' : 'Add astrologer'}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="e.g. Acharya Ravi Shastri" />
        <Input label="Mobile" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="+91 98XXXXXXXX" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
        <Select label="Gender" value={form.gender} options={['Female', 'Male', 'Other']} onChange={e => set('gender', e.target.value as Gender)} />
        <Input label="Experience (years)" type="number" min={0} value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} error={errors.experienceYears} />
        <Select label="City" value={form.city} options={CITIES.includes(form.city) ? CITIES : [form.city, ...CITIES]} onChange={e => set('city', e.target.value)} />
        <div className="sm:col-span-2">
          <ChipPicker label="Languages" options={ASTRO_LANGUAGES} value={form.languages} onChange={v => set('languages', v)} error={errors.languages} />
        </div>
        <div className="sm:col-span-2">
          <ChipPicker label="Skills / expertise" options={ASTRO_SKILLS} value={form.skills} onChange={v => set('skills', v)} error={errors.skills} />
        </div>
        {!editing && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <Input label="Commission %" type="number" value={form.commission} onChange={e => set('commission', e.target.value)} error={errors.commission} />
            <Input label="Chat ₹/min" type="number" value={form.chat} onChange={e => set('chat', e.target.value)} error={errors.chat} />
            <Input label="Call ₹/min" type="number" value={form.call} onChange={e => set('call', e.target.value)} error={errors.call} />
            <Input label="Video ₹/min" type="number" value={form.video} onChange={e => set('video', e.target.value)} error={errors.video} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Textarea label="Bio" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short introduction shown on the app profile" />
        </div>
      </div>
    </Modal>
  )
}
