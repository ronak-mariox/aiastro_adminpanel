import { useState, type ChangeEvent } from 'react'
import { Button, Input, Modal, Select, Textarea, Toggle, useToast } from '@/components/ui'
import { newId } from '@/lib/utils'
import { COUPON_SCOPES, COUPON_TAGS, DISCOUNT_TYPES, PAYMENT_METHODS, couponsDb } from './data'
import { nowIso, todayStr } from './utils'
import type { Coupon, CouponScope, CouponTag, DiscountType, PaymentMethod } from './types'

type Draft = Omit<Coupon, 'id' | 'createdAt' | 'usedCount' | 'discountGiven'>

const empty: Draft = {
  code: '',
  title: '',
  description: '',
  tag: 'LIMITED',
  type: 'percent',
  value: 10,
  maxDiscount: 100,
  minOrder: 199,
  appliesTo: 'all',
  usageLimit: 1000,
  perUserLimit: 1,
  validFrom: todayStr(),
  validTo: `${new Date().getFullYear()}-12-31`,
  autoApply: false,
  paymentMethod: 'any',
  active: true,
}

export function CouponForm({ open, onClose, coupon }: { open: boolean; onClose: () => void; coupon?: Coupon }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => (coupon ? { ...coupon } : empty))
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))
  const num = (k: keyof Draft) => (e: ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never)

  const validate = () => {
    const e: typeof errors = {}
    const code = draft.code.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(code)) e.code = '3–20 letters/numbers, no spaces'
    else if (couponsDb.snapshot().some(c => c.code === code && c.id !== coupon?.id)) e.code = 'Code already exists'
    if (!draft.title.trim()) e.title = 'Title is required'
    if (draft.value <= 0) e.value = 'Must be greater than 0'
    if (draft.type === 'percent' && draft.value > 100) e.value = 'Max 100%'
    if (draft.validTo < draft.validFrom) e.validTo = 'End date is before start date'
    if (draft.usageLimit < 0) e.usageLimit = '0 or more (0 = unlimited)'
    if (draft.perUserLimit < 1) e.perUserLimit = 'At least 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = { ...draft, code: draft.code.trim().toUpperCase(), title: draft.title.trim() }
    try {
      if (coupon) {
        await couponsDb.update(coupon.id, payload)
        toast(`Coupon ${payload.code} updated`)
      } else {
        await couponsDb.create({ ...payload, id: newId('CPN'), usedCount: 0, discountGiven: 0, createdAt: nowIso() })
        toast(`Coupon ${payload.code} created`)
      }
      onClose()
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const valueLabel = draft.type === 'percent' ? 'Discount (%)' : draft.type === 'flat' ? 'Discount (₹)' : 'Bonus points'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      subtitle="Shown in UserApp checkout & offers screen"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {coupon ? 'Save changes' : 'Create coupon'}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" value={draft.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="FESTIVAL200" error={errors.code} />
        <Select label="Tag" value={draft.tag} options={COUPON_TAGS} onChange={e => set('tag', e.target.value as CouponTag)} />
        <div className="sm:col-span-2">
          <Input label="Title" value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Flat ₹200 off on pujas" error={errors.title} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description / terms" rows={2} value={draft.description} onChange={e => set('description', e.target.value)} />
        </div>
        <Select label="Type" value={draft.type} options={DISCOUNT_TYPES} onChange={e => set('type', e.target.value as DiscountType)} />
        <Input label={valueLabel} type="number" min={0} value={draft.value} onChange={num('value')} error={errors.value} />
        <Input
          label="Max discount (₹)"
          hint={draft.type === 'percent' ? '0 = no cap' : 'Percent only'}
          type="number"
          min={0}
          disabled={draft.type !== 'percent'}
          value={draft.maxDiscount}
          onChange={num('maxDiscount')}
        />
        <Input label="Min order value (₹)" type="number" min={0} value={draft.minOrder} onChange={num('minOrder')} />
        <Select label="Applies to" value={draft.appliesTo} options={COUPON_SCOPES} onChange={e => set('appliesTo', e.target.value as CouponScope)} />
        <Select
          label="Payment method"
          value={draft.paymentMethod}
          options={PAYMENT_METHODS.map(m => ({ value: m, label: m === 'any' ? 'Any method' : m }))}
          onChange={e => set('paymentMethod', e.target.value as PaymentMethod)}
        />
        <Input label="Total usage limit" hint="0 = unlimited" type="number" min={0} value={draft.usageLimit} onChange={num('usageLimit')} error={errors.usageLimit} />
        <Input label="Per-user limit" type="number" min={1} value={draft.perUserLimit} onChange={num('perUserLimit')} error={errors.perUserLimit} />
        <Input label="Valid from" type="date" value={draft.validFrom} onChange={e => set('validFrom', e.target.value)} />
        <Input label="Valid to" type="date" value={draft.validTo} onChange={e => set('validTo', e.target.value)} error={errors.validTo} />
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-8">
          <Toggle
            checked={draft.autoApply}
            onChange={v => set('autoApply', v)}
            label={draft.paymentMethod === 'any' ? 'Auto-apply at checkout' : `Auto-apply when paying via ${draft.paymentMethod}`}
          />
          <Toggle checked={draft.active} onChange={v => set('active', v)} label="Active" />
        </div>
      </div>
    </Modal>
  )
}
