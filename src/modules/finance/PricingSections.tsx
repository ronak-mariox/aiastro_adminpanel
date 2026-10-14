import { useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Select, Toggle } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import type { FinanceConfig, PayoutSchedule } from './types'

export type SaveFn = (patch: Partial<FinanceConfig>, label: string) => Promise<void>

type NumField<K extends string> = { key: K; label: string; unit: '%' | '₹' | 'min' | 'days'; min?: number; max?: number; hint?: string }

const toDraft = <K extends string>(values: Record<K, number>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Record<K, string>

/** Card with a grid of numeric inputs, validated & saved together. */
export function NumberGroupCard<K extends string>({
  title,
  subtitle,
  fields,
  values,
  onSave,
  footer,
}: {
  title: string
  subtitle?: string
  fields: NumField<K>[]
  values: Record<K, number>
  onSave: (v: Record<K, number>) => Promise<void>
  footer?: ReactNode
}) {
  const [draft, setDraft] = useState<Record<K, string>>(() => toDraft(values))
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({})
  const [saving, setSaving] = useState(false)
  const dirty = fields.some(f => draft[f.key] !== String(values[f.key]))

  const save = async () => {
    const next: Partial<Record<K, string>> = {}
    const out = {} as Record<K, number>
    for (const f of fields) {
      const raw = draft[f.key].trim()
      const n = Number(raw)
      const min = f.min ?? 0
      const max = f.max ?? (f.unit === '%' ? 100 : Infinity)
      if (raw === '' || !Number.isFinite(n)) next[f.key] = 'Required'
      else if (n < min || n > max) next[f.key] = max === Infinity ? `Min ${min}` : `Between ${min} and ${max}`
      else out[f.key] = n
    }
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    await onSave(out)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map(f => (
            <Input
              key={f.key}
              label={f.label}
              hint={f.hint ?? f.unit}
              type="number"
              step="any"
              value={draft[f.key]}
              error={errors[f.key]}
              onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
            />
          ))}
        </div>
        {footer && <div className="mt-4 text-sm text-muted">{footer}</div>}
        <SaveRow dirty={dirty} saving={saving} onSave={save} onReset={() => setDraft(toDraft(values))} />
      </CardBody>
    </Card>
  )
}

function SaveRow({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      {dirty && <span className="mr-auto text-xs text-amber-700">Unsaved changes</span>}
      <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onReset}>
        Reset
      </Button>
      <Button size="sm" disabled={!dirty} loading={saving} onClick={onSave}>
        Save changes
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function WalletCard({ config, save }: { config: FinanceConfig; save: SaveFn }) {
  const [minRecharge, setMinRecharge] = useState(String(config.minRecharge))
  const [amounts, setAmounts] = useState<number[]>(config.quickAmounts)
  const [newAmount, setNewAmount] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = minRecharge !== String(config.minRecharge) || amounts.join() !== config.quickAmounts.join()

  const add = () => {
    const n = Number(newAmount)
    if (!Number.isInteger(n) || n <= 0) return setError('Enter a whole rupee amount')
    if (amounts.includes(n)) return setError('Amount already added')
    if (amounts.length >= 8) return setError('Maximum 8 quick amounts')
    setAmounts(a => [...a, n].sort((x, y) => x - y))
    setNewAmount('')
    setError('')
  }

  const submit = async () => {
    const min = Number(minRecharge)
    if (!Number.isFinite(min) || min < 1) return setError('Minimum recharge must be at least ₹1')
    if (amounts.length === 0) return setError('Add at least one quick amount')
    if (amounts.some(a => a < min)) return setError('Quick amounts cannot be below the minimum recharge')
    setError('')
    setSaving(true)
    await save({ minRecharge: min, quickAmounts: amounts }, 'Wallet settings')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader title="Wallet & add money" subtitle="Shown on the UserApp wallet and low-balance recharge sheet" />
      <CardBody>
        <div className="max-w-xs">
          <Input label="Minimum wallet recharge" hint="₹" type="number" value={minRecharge} onChange={e => setMinRecharge(e.target.value)} />
        </div>
        <p className="mt-5 mb-2 text-sm font-medium">Quick add-money amounts</p>
        <div className="flex flex-wrap gap-2">
          {amounts.map(a => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas py-1 pr-1 pl-3 text-sm font-medium">
              {formatINR(a)}
              <button
                type="button"
                aria-label={`Remove ${a}`}
                onClick={() => setAmounts(list => list.filter(x => x !== a))}
                className="rounded-full p-0.5 text-muted hover:bg-gray-200 hover:text-ink">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex max-w-xs gap-2">
          <Input
            aria-label="New quick amount"
            placeholder="e.g. 300"
            type="number"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={add}>
            Add
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <SaveRow
          dirty={dirty}
          saving={saving}
          onSave={submit}
          onReset={() => {
            setMinRecharge(String(config.minRecharge))
            setAmounts(config.quickAmounts)
            setError('')
          }}
        />
      </CardBody>
    </Card>
  )
}

const SCHEDULES: { label: string; value: PayoutSchedule }[] = [
  { label: 'On request (manual approval)', value: 'on_request' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every 2 weeks', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function PayoutSettingsCard({ config, save }: { config: FinanceConfig; save: SaveFn }) {
  const init = () => ({ minWithdrawal: String(config.minWithdrawal), schedule: config.payoutSchedule, day: config.payoutDay, tds: String(config.tdsPercent) })
  const [d, setD] = useState(init)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(init())
  const showDay = d.schedule === 'weekly' || d.schedule === 'biweekly'

  const submit = async () => {
    const min = Number(d.minWithdrawal)
    const tds = Number(d.tds)
    if (!Number.isFinite(min) || min < 100) return setError('Minimum withdrawal must be at least ₹100')
    if (!Number.isFinite(tds) || tds < 0 || tds > 30) return setError('TDS must be between 0 and 30%')
    setError('')
    setSaving(true)
    await save({ minWithdrawal: min, payoutSchedule: d.schedule, payoutDay: d.day, tdsPercent: tds }, 'Payout settings')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader title="Partner payouts" subtitle="Withdrawal rules for astrologers & pandits" />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Minimum withdrawal" hint="₹" type="number" value={d.minWithdrawal} onChange={e => setD({ ...d, minWithdrawal: e.target.value })} />
          <Input label="TDS deducted" hint="%" type="number" step="any" value={d.tds} onChange={e => setD({ ...d, tds: e.target.value })} />
          <Select label="Payout schedule" value={d.schedule} options={SCHEDULES} onChange={e => setD({ ...d, schedule: e.target.value as PayoutSchedule })} />
          {showDay && <Select label="Payout day" value={d.day} options={DAYS} onChange={e => setD({ ...d, day: e.target.value })} />}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <SaveRow dirty={dirty} saving={saving} onSave={submit} onReset={() => setD(init())} />
      </CardBody>
    </Card>
  )
}

export function FirstSessionCard({ config, save }: { config: FinanceConfig; save: SaveFn }) {
  const init = () => ({ enabled: config.freeFirstSession, minutes: String(config.firstSessionMinutes), price: String(config.firstConsultationPrice) })
  const [d, setD] = useState(init)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(init())

  const submit = async () => {
    const minutes = Number(d.minutes)
    const price = Number(d.price)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30) return setError('Free minutes must be a whole number between 1 and 30')
    if (!Number.isFinite(price) || price < 0) return setError('Price cannot be negative')
    setError('')
    setSaving(true)
    await save({ freeFirstSession: d.enabled, firstSessionMinutes: minutes, firstConsultationPrice: price }, 'First session offer')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader title="New-user first consultation" subtitle="Acquisition offer on a customer's very first chat/call" />
      <CardBody>
        <Toggle checked={d.enabled} onChange={enabled => setD({ ...d, enabled })} label="Free first session enabled" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Free minutes" hint="min" type="number" disabled={!d.enabled} value={d.minutes} onChange={e => setD({ ...d, minutes: e.target.value })} />
          <Input
            label="First-consultation price"
            hint="₹/min after free minutes"
            type="number"
            step="any"
            value={d.price}
            onChange={e => setD({ ...d, price: e.target.value })}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <SaveRow dirty={dirty} saving={saving} onSave={submit} onReset={() => setD(init())} />
      </CardBody>
    </Card>
  )
}
