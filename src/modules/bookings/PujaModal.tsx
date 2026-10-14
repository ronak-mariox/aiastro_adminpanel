import { useRef, useState } from 'react'
import { Plus, Upload, X } from 'lucide-react'
import { Button, IconButton, Input, Modal, Select, Textarea, Toggle } from '@/components/ui'
import { uploadImage } from '@/lib/remoteCollection'
import { formatINR } from '@/lib/utils'
import { CATEGORIES, MATERIALS_FEE, SLOTS } from './pricing'
import type { Puja, PujaCategory } from './types'

const SLOT_RE = /^\d{1,2}:\d{2}\s*[AP]M$/i

export type PujaDraft = Omit<Puja, 'id' | 'rating' | 'bookings'>

const empty: PujaDraft = {
  name: '',
  description: '',
  category: 'Prosperity',
  duration: '60 mins',
  people: '1–10 people',
  benefits: [''],
  basePrice: 1001,
  samagriPrice: MATERIALS_FEE,
  imageUrl: '',
  timeSlots: SLOTS,
  maxPerSlot: 3,
  badge: '',
  popular: false,
  onlineAvailable: true,
  active: true,
}

export default function PujaModal({ puja, onClose, onSave }: { puja: Puja | null; onClose: () => void; onSave: (d: PujaDraft) => Promise<void> }) {
  const [d, setD] = useState<PujaDraft>(() => {
    if (!puja) return empty
    const { id: _id, rating: _r, bookings: _b, ...rest } = puja
    return { ...rest, badge: rest.badge ?? '', benefits: rest.benefits.length ? rest.benefits : [''] }
  })
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slotsText, setSlotsText] = useState(() => d.timeSlots.join(', '))
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof PujaDraft>(k: K, v: PujaDraft[K]) => setD(prev => ({ ...prev, [k]: v }))

  const benefits = d.benefits.map(b => b.trim()).filter(Boolean)
  const timeSlots = slotsText.split(/[,\n]/).map(t => t.trim().toUpperCase().replace(/\s+/g, ' ')).filter(Boolean)
  const errors = {
    timeSlots: !timeSlots.length ? 'Offer at least one slot' : timeSlots.some(t => !SLOT_RE.test(t)) ? 'Slots look like 8:00 AM, 5:30 PM' : undefined,
    maxPerSlot: !(d.maxPerSlot >= 1 && d.maxPerSlot <= 100) ? '1–100' : undefined,
    name: !d.name.trim() ? 'Name is required' : undefined,
    description: !d.description.trim() ? 'Add a short description' : undefined,
    basePrice: !(d.basePrice > 0) ? 'Enter a base price' : undefined,
    samagriPrice: d.samagriPrice < 0 ? 'Cannot be negative' : undefined,
    duration: !d.duration.trim() ? 'Required' : undefined,
    benefits: benefits.length === 0 ? 'Add at least one benefit' : undefined,
  }
  const valid = Object.values(errors).every(e => !e)
  const err = (k: keyof typeof errors) => (touched ? errors[k] : undefined)
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set('imageUrl', await uploadImage(file, 'pujas'))
    } catch {
      /* reported by uploadImage */
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    try {
      await onSave({ ...d, name: d.name.trim(), description: d.description.trim(), benefits, timeSlots, badge: d.badge?.trim() || '' })
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={puja ? `Edit ${puja.name}` : 'New puja'}
      subtitle="Shown in the app's puja booking flow and on the website e-puja page"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {puja ? 'Save changes' : 'Create puja'}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={d.name} onChange={e => set('name', e.target.value)} error={err('name')} placeholder="e.g. Ganesh Puja" />
        <Select label="Category" value={d.category} onChange={e => set('category', e.target.value as PujaCategory)} options={CATEGORIES} />
        <div className="sm:col-span-2">
          <Textarea label="Description" rows={2} value={d.description} onChange={e => set('description', e.target.value)} error={err('description')} />
        </div>
        <Input label="Duration" value={d.duration} onChange={e => set('duration', e.target.value)} error={err('duration')} placeholder="2 hours" />
        <Input label="People" value={d.people} onChange={e => set('people', e.target.value)} placeholder="1–10 people" />
        <Input label="Price (₹)" type="number" min={1} value={d.basePrice || ''} onChange={e => set('basePrice', Number(e.target.value))} error={err('basePrice')} />
        <Input label="Badge" hint="optional" value={d.badge ?? ''} onChange={e => set('badge', e.target.value)} placeholder="Most Booked, Divine…" />
        <div className="rounded-xl bg-canvas/70 p-3 text-xs text-muted sm:col-span-2">
          Customer pays: <span className="font-semibold text-ink">{formatINR(d.basePrice || 0)}</span> — all-inclusive (coupons come off this).
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Time slots" hint="comma-separated" rows={2} value={slotsText} onChange={e => setSlotsText(e.target.value)} error={err('timeSlots')} placeholder="6:00 AM, 8:00 AM, 5:30 PM" />
        </div>
        <Input label="Bookings per slot" type="number" min={1} max={100} value={d.maxPerSlot} onChange={e => set('maxPerSlot', Number(e.target.value))} error={err('maxPerSlot')} />
        <div>
          <p className="mb-1.5 text-sm font-medium">Image</p>
          <div className="flex items-center gap-3">
            {d.imageUrl ? <img src={d.imageUrl} alt="" className="size-10 rounded-lg border border-line object-cover" /> : <span className="size-10 rounded-lg bg-gray-100" />}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={e => upload(e.target.files?.[0])} />
            <Button size="sm" variant="outline" icon={<Upload className="size-3.5" />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {d.imageUrl ? 'Replace' : 'Upload'}
            </Button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">Benefits</p>
          <div className="space-y-2">
            {d.benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="flex-1"
                  value={b}
                  placeholder={`Benefit ${i + 1}`}
                  onChange={e => set('benefits', d.benefits.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <IconButton aria-label="Remove benefit" disabled={d.benefits.length === 1} onClick={() => set('benefits', d.benefits.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </IconButton>
              </div>
            ))}
          </div>
          {err('benefits') && <p className="mt-1 text-xs text-red-600">{err('benefits')}</p>}
          <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="size-3.5" />} onClick={() => set('benefits', [...d.benefits, ''])}>
            Add benefit
          </Button>
        </div>

        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <Toggle checked={d.popular} onChange={v => set('popular', v)} label="Popular" />
          <Toggle checked={d.onlineAvailable} onChange={v => set('onlineAvailable', v)} label="Online (live stream) available" />
          <Toggle checked={d.active} onChange={v => set('active', v)} label="Active" />
        </div>
      </div>
    </Modal>
  )
}
