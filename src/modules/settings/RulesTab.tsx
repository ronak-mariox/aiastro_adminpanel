import { useState } from 'react'
import { Card, CardBody, CardHeader, Input, Toggle, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { appSettingsDb, logAudit } from './data'
import { SaveBar } from './GeneralTab'
import type { AppSettings, ConsultationRules } from './types'

type NumKey = 'intakeAcceptWaitSec' | 'lowBalanceWarningMin' | 'maxSessionMin' | 'minBalanceMinutes' | 'freeSessionMin'

const numberFields: { key: NumKey; label: string; hint: string; min: number; max: number; unit: string }[] = [
  { key: 'intakeAcceptWaitSec', label: 'Intake accept wait', hint: 'Time an astrologer has to accept a chat/call request before it is auto-cancelled', min: 30, max: 600, unit: 'sec' },
  { key: 'lowBalanceWarningMin', label: 'Low-balance warning', hint: 'Show the recharge prompt when the wallet covers fewer than this many minutes', min: 1, max: 15, unit: 'min' },
  { key: 'minBalanceMinutes', label: 'Minimum balance to start', hint: 'Wallet must cover at least this many minutes at the astrologer’s rate', min: 1, max: 30, unit: 'min' },
  { key: 'maxSessionMin', label: 'Max session length', hint: 'Sessions end automatically after this duration', min: 10, max: 240, unit: 'min' },
  { key: 'freeSessionMin', label: 'Free first session', hint: 'Length of the free first consultation for new users', min: 1, max: 15, unit: 'min' },
]

export default function RulesTab({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const { admin } = useAuth()
  const [rules, setRules] = useState<ConsultationRules>(settings.rules)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(rules) !== JSON.stringify(settings.rules)
  const errors = Object.fromEntries(
    numberFields.filter(f => !(rules[f.key] >= f.min && rules[f.key] <= f.max)).map(f => [f.key, `Between ${f.min} and ${f.max} ${f.unit}`]),
  )

  const save = async () => {
    if (Object.keys(errors).length) {
      toast('Fix the highlighted fields', 'error')
      return
    }
    setSaving(true)
    try {
      await appSettingsDb.update('app', { rules })
    } catch {
      setSaving(false)
      return
    }
    const changed = numberFields.filter(f => rules[f.key] !== settings.rules[f.key]).map(f => `${f.label} → ${rules[f.key]} ${f.unit}`)
    logAudit(admin, 'Settings', 'Updated consultation rules', changed.join(', ') || 'Toggles')
    setSaving(false)
    toast('Consultation rules saved')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Consultation rules" subtitle="Saved for the team's reference. The live billing engine currently uses fixed rules: 120 s to accept, 1 minute minimum balance, 30 s recharge grace, no free session." />
        <CardBody className="grid gap-5 md:grid-cols-2">
          {numberFields.map(f => (
            <div key={f.key}>
              <Input
                type="number"
                label={f.label}
                hint={f.unit}
                min={f.min}
                max={f.max}
                value={rules[f.key]}
                error={errors[f.key]}
                disabled={f.key === 'freeSessionMin' && !rules.allowFreeFirstSession}
                onChange={e => setRules(r => ({ ...r, [f.key]: Number(e.target.value) }))}
              />
              <p className="mt-1 text-xs text-muted">{f.hint}</p>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Behaviour" />
        <CardBody className="space-y-4">
          <div>
            <Toggle checked={rules.autoEndOnZeroBalance} onChange={v => setRules(r => ({ ...r, autoEndOnZeroBalance: v }))} label="Auto-end session when wallet balance reaches zero" />
            <p className="mt-1 pl-12 text-xs text-muted">If off, the session pauses and the customer gets 60 seconds to recharge.</p>
          </div>
          <Toggle checked={rules.allowFreeFirstSession} onChange={v => setRules(r => ({ ...r, allowFreeFirstSession: v }))} label="Offer a free first session to new users" />
        </CardBody>
      </Card>
      <SaveBar dirty={dirty} saving={saving} onReset={() => setRules(settings.rules)} onSave={save} />
    </div>
  )
}
