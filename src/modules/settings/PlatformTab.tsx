import { useState } from 'react'
import { Card, CardBody, CardHeader, Input, Select, Toggle, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { appSettingsDb, logAudit } from './data'
import { SaveBar } from './GeneralTab'
import type { AppSettings, PlatformSettings } from './types'

type FeatureKey = keyof PlatformSettings['features']

const FEATURES: { key: FeatureKey; label: string; hint: string }[] = [
  { key: 'registrationsOpen', label: 'New registrations', hint: 'Off: unknown numbers/emails cannot sign up (existing accounts still sign in)' },
  { key: 'cashOnDelivery', label: 'Cash on Delivery', hint: 'Store orders may be paid in cash; delivered marks them paid' },
  { key: 'voiceConsultations', label: 'Voice consultations', hint: 'Seekers can start call consultations' },
  { key: 'aiAssistant', label: 'AI assistant', hint: 'The in-app AI chat' },
  { key: 'googleSignIn', label: 'Google sign-in', hint: 'Needs Google set up under Integrations' },
  { key: 'appleSignIn', label: 'Apple sign-in', hint: 'Needs Apple set up under Integrations' },
  { key: 'autoApproveAstrologers', label: 'Auto-approve astrologers', hint: 'List new astrologers without an admin approving them' },
  { key: 'adminTwoFactor', label: 'Admin two-factor sign-in', hint: 'Email a code on every panel sign-in' },
]

function validate(p: PlatformSettings) {
  const e: Record<string, string> = {}
  if (!(p.commissionPercent >= 0 && p.commissionPercent <= 100)) e.commissionPercent = '0–100'
  if (!(p.minRecharge >= 1)) e.minRecharge = 'At least ₹1'
  if (!(p.maxRecharge >= p.minRecharge)) e.maxRecharge = 'Must be at least the minimum'
  if (!(p.minPayout >= 1)) e.minPayout = 'At least ₹1'
  if (!(p.redeem.pointValue >= 0)) e.pointValue = '0 or more'
  if (!(p.redeem.minPoints >= 1)) e.minPoints = 'At least 1'
  return e
}

/** Business rules the API enforces on the very next request: commission, limits, switches, points redemption. */
export default function PlatformTab({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { admin } = useAuth()
  const [form, setForm] = useState<PlatformSettings>(settings.platform)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.platform)
  const errors = validate(form)
  const num = (k: 'commissionPercent' | 'minRecharge' | 'maxRecharge' | 'minPayout') => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: Number(e.target.value) }))
  const setFeature = (k: FeatureKey, v: boolean) => setForm(f => ({ ...f, features: { ...f.features, [k]: v } }))

  const save = async () => {
    if (Object.keys(errors).length) {
      toast('Fix the highlighted fields', 'error')
      return
    }
    const off = FEATURES.filter(f => settings.platform.features[f.key] && !form.features[f.key])
    if (off.length) {
      const ok = await confirm({ title: 'Switch features off?', message: `${off.map(f => f.label).join(', ')} will stop working in the apps right away.`, confirmLabel: 'Save', tone: 'danger' })
      if (ok === false) return
    }
    setSaving(true)
    try {
      await appSettingsDb.update('app', { platform: form })
      logAudit(admin, 'Settings', 'Updated platform settings', 'Billing & features')
      toast('Platform settings saved')
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Billing" subtitle="Read live on every money path — a change governs the very next top-up, payout and new astrologer" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Default commission (%)" hint="for newly created astrologers" type="number" min={0} max={100} value={form.commissionPercent} error={errors.commissionPercent} onChange={num('commissionPercent')} />
          <Input label="Minimum recharge (₹)" type="number" min={1} value={form.minRecharge} error={errors.minRecharge} onChange={num('minRecharge')} />
          <Input label="Maximum recharge (₹)" type="number" min={1} value={form.maxRecharge} error={errors.maxRecharge} onChange={num('maxRecharge')} />
          <Input label="Minimum payout (₹)" hint="astrologer & pandit withdrawals" type="number" min={1} value={form.minPayout} error={errors.minPayout} onChange={num('minPayout')} />
          <Select
            label="Payout cycle"
            value={form.payoutCycle}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'fortnightly', label: 'Fortnightly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            onChange={e => setForm(f => ({ ...f, payoutCycle: e.target.value as PlatformSettings['payoutCycle'] }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Feature switches" subtitle="Parts of the product that can be switched off without a release" />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {FEATURES.map(f => (
            <div key={f.key} className="rounded-xl border border-line p-3">
              <Toggle checked={form.features[f.key]} onChange={v => setFeature(f.key, v)} label={f.label} />
              <p className="mt-1 pl-12 text-xs text-muted">{f.hint}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Points redemption" subtitle="Seekers turn loyalty points into wallet money (Rewards in the app)" action={<Toggle checked={form.redeem.enabled} onChange={v => setForm(f => ({ ...f, redeem: { ...f.redeem, enabled: v } }))} label="Enabled" />} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input label="₹ per point" type="number" step={0.1} min={0} value={form.redeem.pointValue} error={errors.pointValue} onChange={e => setForm(f => ({ ...f, redeem: { ...f.redeem, pointValue: Number(e.target.value) } }))} />
          <Input label="Minimum points per redemption" type="number" min={1} value={form.redeem.minPoints} error={errors.minPoints} onChange={e => setForm(f => ({ ...f, redeem: { ...f.redeem, minPoints: Number(e.target.value) } }))} />
        </CardBody>
      </Card>

      <SaveBar dirty={dirty} saving={saving} onReset={() => setForm(settings.platform)} onSave={save} />
    </div>
  )
}
