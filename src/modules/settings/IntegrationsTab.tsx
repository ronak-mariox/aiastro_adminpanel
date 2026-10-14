import { useState } from 'react'
import { CreditCard, Eye, EyeOff, Map, MessageSquare, PlugZap, Bell, Mail, HardDrive, KeyRound, PhoneCall, Sparkles } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Input, Toggle, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useCollection } from '@/lib/store'
import { integrationsDb, logAudit } from './data'
import type { Integration } from './types'

const icons = { Payments: CreditCard, SMS: MessageSquare, 'Push notifications': Bell, Maps: Map, Email: Mail, Storage: HardDrive, 'Sign-in': KeyRound, Calls: PhoneCall, Astrology: Sparkles }

export default function IntegrationsTab() {
  const { items } = useCollection(integrationsDb)
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {items.map(i => (
        <IntegrationCard key={i.id} integration={i} />
      ))}
    </div>
  )
}

function SecretInput({ label, value, secret, onChange }: { label: string; value: string; secret: boolean; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  if (!secret) return <Input label={label} value={value} onChange={e => onChange(e.target.value)} />
  return (
    <div className="relative">
      <Input label={label} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} className="pr-10 font-mono" autoComplete="off" />
      <button
        type="button"
        aria-label={show ? 'Hide value' : 'Show value'}
        onClick={() => setShow(s => !s)}
        className="absolute right-2 bottom-2 rounded-lg p-1 text-muted hover:bg-gray-100 hover:text-ink">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { admin } = useAuth()
  const [draft, setDraft] = useState(integration)
  const [testing, setTesting] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(integration)
  const Icon = icons[integration.category]

  const save = async () => {
    if (draft.enabled && draft.fields.some(f => !f.value.trim())) {
      toast('Fill in every field to enable this integration', 'error')
      return
    }
    if (integration.enabled && !draft.enabled) {
      const ok = await confirm({ title: `Disable ${integration.provider}?`, message: `${integration.name} will stop working across all apps.`, confirmLabel: 'Disable', tone: 'danger' })
      if (ok === false) return
    }
    try {
      await integrationsDb.update(integration.id, draft)
      logAudit(admin, 'Settings', 'Updated integration', integration.provider)
      toast(`${integration.provider} settings saved — in force for the next request`)
    } catch {
      /* error toast comes from the API layer */
    }
  }

  // Re-reads what the server holds for this provider (the API stores it; it does not dial the provider).
  const test = async () => {
    setTesting(true)
    try {
      const rows = await integrationsDb.refresh?.()
      const row = rows?.find(r => r.id === integration.id)
      const configured = !!row && row.fields.every(f => f.value)
      toast(row?.enabled && configured ? `${integration.provider} is configured and enabled` : `${integration.provider} is ${row?.enabled ? 'enabled but incomplete' : 'disabled'}`, row?.enabled && configured ? 'success' : 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="size-4" />
            </span>
            {integration.name}
          </span>
        }
        subtitle={integration.provider}
        action={<Badge tone={integration.enabled ? (integration.mode === 'live' ? 'green' : 'amber') : 'gray'}>{integration.enabled ? integration.mode.toUpperCase() : 'OFF'}</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toggle checked={draft.enabled} onChange={v => setDraft(d => ({ ...d, enabled: v }))} label="Enabled" />
          <span className="text-xs text-muted">Secrets show masked — leave them as they are to keep the saved value.</span>
        </div>
        {draft.fields.map((f, idx) => (
          <SecretInput
            key={f.key}
            label={f.label}
            value={f.value}
            secret={f.secret}
            onChange={v => setDraft(d => ({ ...d, fields: d.fields.map((x, j) => (j === idx ? { ...x, value: v } : x)) }))}
          />
        ))}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" icon={<PlugZap className="size-4" />} loading={testing} onClick={test}>
            Check status
          </Button>
          <Button variant="outline" disabled={!dirty} onClick={() => setDraft(integration)}>
            Reset
          </Button>
          <Button disabled={!dirty} onClick={save}>
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
