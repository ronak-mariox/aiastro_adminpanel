import { useEffect, useState } from 'react'
import { Bell, Clock, MessageSquare, Save, Send, Smartphone } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Label, Segmented, Select, Textarea, useConfirm, useToast } from '@/components/ui'
import { cn, formatNumber, newId } from '@/lib/utils'
import { estimateRecipients, type ComposeDraft } from './compose'
import { AUDIENCES, CHANNELS, NOTIFICATION_TYPES, SEGMENTS, campaignsDb, templatesDb } from './data'
import { isFuture, nowIso } from './utils'
import type { Audience, Campaign, Channel, NotificationType } from './types'

export function ComposeCampaign({ initial, onDone }: { initial: ComposeDraft; onDone: () => void }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [d, setD] = useState<ComposeDraft>(initial)
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState(() => {
    const t = new Date(Date.now() + 86_400_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T10:00`
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof ComposeDraft>(k: K, v: ComposeDraft[K]) => setD(x => ({ ...x, [k]: v }))
  const [recipients, setRecipients] = useState(0)
  // Live reach for the chosen audience.
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      estimateRecipients({ audience: d.audience, segment: d.segment, city: d.city })
        .then(n => alive && setRecipients(n))
        .catch(() => alive && setRecipients(0))
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [d.audience, d.segment, d.city])
  const smsOnly = d.channels.includes('sms')

  const toggleChannel = (c: Channel) => set('channels', d.channels.includes(c) ? d.channels.filter(x => x !== c) : [...d.channels, c])

  const applyTemplate = (id: string) => {
    const t = templatesDb.snapshot().find(x => x.id === id)
    if (!t) return
    setD(x => ({ ...x, title: t.title, body: t.body, deepLink: t.deepLink, type: t.type, channels: [t.channel] }))
    toast(`Template “${t.name}” applied`, 'info')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!d.title.trim()) e.title = 'Title is required'
    if (!d.body.trim()) e.body = 'Message is required'
    if (smsOnly && d.body.length > 160) e.body = 'SMS messages must be 160 characters or fewer'
    if (d.channels.length === 0) e.channels = 'Pick at least one channel'
    if (when === 'later' && !isFuture(scheduledAt)) e.scheduledAt = 'Pick a future time'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const persist = async (status: Campaign['status']) => {
    const now = nowIso()
    return campaignsDb.create({
      ...d,
      segment: d.audience === 'customers' ? d.segment : undefined,
      city: d.audience === 'city' ? d.city : undefined,
      id: newId('NTF'),
      status,
      scheduledAt: when === 'later' ? new Date(scheduledAt).toISOString() : now,
      recipients,
      delivered: 0,
      opened: 0,
      createdBy: 'Super Admin',
      createdAt: now,
    })
  }

  const send = async () => {
    if (!validate()) return
    const label = when === 'now' ? 'Send now' : 'Schedule'
    const ok = await confirm({
      title: `${label} to ~${formatNumber(recipients)} recipients?`,
      message: `${d.channels.map(c => CHANNELS.find(x => x.value === c)?.label).join(' + ')} · ${AUDIENCES.find(a => a.value === d.audience)?.label}${d.audience === 'customers' ? ` (${d.segment})` : d.audience === 'city' ? ` (${d.city})` : ''}`,
      confirmLabel: label,
    })
    if (ok === false) return
    setBusy(true)
    try {
      const saved = await persist(when === 'now' ? 'sent' : 'scheduled')
      toast(when === 'now' ? `Campaign sent to ${formatNumber(saved.delivered)} of ${formatNumber(saved.recipients)} recipients` : 'Campaign scheduled')
      onDone()
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setBusy(false)
    }
  }

  const draft = async () => {
    if (!d.title.trim()) {
      setErrors({ title: 'Add a title to save a draft' })
      return
    }
    setBusy(true)
    try {
      await persist('draft')
      toast('Saved as draft')
      onDone()
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="Compose campaign"
          subtitle="Push, SMS and in-app notifications"
          action={
            <Select
              aria-label="Use template"
              className="w-44"
              value=""
              options={[{ value: '', label: 'Use template…' }, ...templatesDb.snapshot().filter(t => t.active).map(t => ({ value: t.id, label: t.name }))]}
              onChange={e => applyTemplate(e.target.value)}
            />
          }
        />
        <CardBody className="space-y-5">
          <div>
            <Label>Channels</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(c => {
                const on = d.channels.includes(c.value)
                const Icon = c.value === 'push' ? Bell : c.value === 'sms' ? MessageSquare : Smartphone
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleChannel(c.value)}
                    className={cn('inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition', on ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line text-muted hover:text-ink')}>
                    <Icon className="size-4" /> {c.label}
                  </button>
                )
              })}
            </div>
            {errors.channels && <p className="mt-1 text-xs text-red-600">{errors.channels}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Audience" value={d.audience} options={AUDIENCES} onChange={e => set('audience', e.target.value as Audience)} />
            {d.audience === 'customers' && <Select label="Segment" value={d.segment} options={SEGMENTS} onChange={e => set('segment', e.target.value)} />}
            {d.audience === 'city' && <Input label="City" hint="customers by delivery address, pandits by their city" value={d.city ?? ''} onChange={e => set('city', e.target.value)} />}
            <Select
              label="Type"
              value={d.type}
              options={NOTIFICATION_TYPES.map(t => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) }))}
              onChange={e => set('type', e.target.value as NotificationType)}
            />
          </div>

          <Input label="Title" hint={`${d.title.length}/65`} maxLength={65} value={d.title} onChange={e => set('title', e.target.value)} error={errors.title} />
          <Textarea
            label="Message"
            hint={`${d.body.length}${smsOnly ? '/160' : ''} chars · use {{name}} to personalise`}
            rows={3}
            value={d.body}
            onChange={e => set('body', e.target.value)}
            error={errors.body}
          />
          <Input label="Deep link" value={d.deepLink} onChange={e => set('deepLink', e.target.value)} placeholder="vedrashi://store" />

          <div>
            <Label>Delivery</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Segmented
                value={when}
                onChange={setWhen}
                options={[
                  { key: 'now', label: 'Send now' },
                  { key: 'later', label: 'Schedule' },
                ]}
              />
              {when === 'later' && (
                <div className="sm:w-64">
                  <Input type="datetime-local" aria-label="Schedule time" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} error={errors.scheduledAt} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Estimated reach <span className="font-semibold text-ink">{formatNumber(recipients)}</span> recipients
            </p>
            <div className="flex gap-2">
              <Button variant="outline" icon={<Save className="size-4" />} disabled={busy} onClick={draft}>
                Save draft
              </Button>
              <Button icon={when === 'now' ? <Send className="size-4" /> : <Clock className="size-4" />} loading={busy} onClick={send}>
                {when === 'now' ? 'Send now' : 'Schedule'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Preview" subtitle="Lock-screen push" />
        <CardBody>
          <div className="mx-auto max-w-72 rounded-[2rem] bg-gradient-to-b from-gray-800 to-gray-950 p-4 pt-10 pb-16">
            <p className="mb-6 text-center text-4xl font-light text-white">10:24</p>
            <div className="rounded-2xl bg-white/90 p-3 shadow backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="inline-flex size-4 items-center justify-center rounded bg-brand-gradient text-[8px] font-bold text-white">V</span>
                VEDRASHI · now
              </div>
              <p className="mt-1 text-sm font-semibold break-words">{d.title || 'Notification title'}</p>
              <p className="text-xs break-words text-gray-700">{(d.body || 'Your message will appear here.').replace('{{name}}', 'Sneha')}</p>
            </div>
            {smsOnly && (
              <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-gray-800">
                <p className="mb-1 font-semibold">SMS · VM-VEDRSI</p>
                {(d.body || '…').replace('{{name}}', 'Sneha')}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
