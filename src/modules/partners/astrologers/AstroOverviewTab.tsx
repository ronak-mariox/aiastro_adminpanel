import { useState } from 'react'
import { Award, Check, MessageCircle, Pencil, Phone, Radio, Video, X } from 'lucide-react'
import { astrologersDb, type Astrologer } from '@/data'
import { Badge, Button, Card, CardBody, CardHeader, DetailList, StatusBadge, Toggle, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { BADGES } from '../data'
import { reviewPriceChange } from '../actions'
import type { AstrologerProfile, PriceChange } from '../types'
import { PricingModal } from './PricingModal'

type Props = { astrologer: Astrologer; profile?: AstrologerProfile }

const badgeHelp: Record<string, string> = {
  Celebrity: 'Featured on home banner, top of listings',
  'Top Choice': 'Highlighted in category lists',
  'Rising Star': 'Boost for promising new astrologers',
  none: 'No badge shown',
}

export function AstroOverviewTab({ astrologer: a, profile }: Props) {
  const toast = useToast()
  const confirm = useConfirm()
  const [pricing, setPricing] = useState(false)

  const setService = async (key: keyof Astrologer['services'], value: boolean) => {
    if (key === 'live') return
    if (value && !a.pricing[key]) {
      toast(`Set a ${key} rate first (Edit pricing).`, 'error')
      return
    }
    try {
      await astrologersDb.update(a.id, { services: { ...a.services, [key]: value } })
      toast(`${key.charAt(0).toUpperCase() + key.slice(1)} ${value ? 'enabled' : 'disabled'}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const decidePrice = async (req: PriceChange, status: 'approved' | 'rejected') => {
    const res = await confirm({
      title: status === 'approved' ? 'Approve price change?' : 'Reject price change?',
      message:
        status === 'approved'
          ? `${req.service} rate goes from ₹${req.oldRate} to ₹${req.requestedRate}/min.`
          : `${a.name} will be notified with your reason.`,
      confirmLabel: status === 'approved' ? 'Approve' : 'Reject',
      tone: status === 'approved' ? 'success' : 'danger',
      withReason: status === 'rejected',
    })
    if (res === false) return
    try {
      await reviewPriceChange(a.id, req.id, status, res)
      toast(status === 'approved' ? 'Price change approved' : 'Price change rejected', status === 'approved' ? 'success' : 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const setBadge = async (badge: Astrologer['badge']) => {
    if (badge === a.badge) return
    const ok = await confirm({
      title: badge ? `Assign "${badge}" badge?` : 'Remove badge?',
      message: badge ? `${a.name} will be shown with the ${badge} badge across the apps and website.` : `${a.name} will no longer show the ${a.badge} badge.`,
      confirmLabel: badge ? 'Assign' : 'Remove',
    })
    if (ok === false) return
    try {
      await astrologersDb.update(a.id, { badge })
      toast(badge ? `Badge set to ${badge}` : 'Badge removed')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const services: { key: keyof Astrologer['services']; label: string; icon: typeof Phone; rate?: number }[] = [
    { key: 'chat', label: 'Chat', icon: MessageCircle, rate: a.pricing.chat },
    { key: 'call', label: 'Call', icon: Phone, rate: a.pricing.call },
    { key: 'video', label: 'Video', icon: Video, rate: a.pricing.video },
    { key: 'live', label: 'Live sessions', icon: Radio },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Profile" subtitle="As shown on the Astro app and customer listings" />
        <CardBody className="space-y-5">
          <p className="text-sm leading-relaxed text-ink">{profile?.bio || '—'}</p>
          <DetailList
            items={[
              { label: 'Gender', value: a.gender || '—' },
              { label: 'Experience', value: `${a.experienceYears} years` },
              { label: 'City', value: a.city || '—' },
              { label: 'Commission', value: `${a.commissionPct ?? profile?.commissionPct ?? '—'}%` },
              { label: 'Joined', value: formatDate(a.joinedAt) },
              { label: 'Languages', value: <div className="flex flex-wrap gap-1">{a.languages.map(l => <Badge key={l}>{l}</Badge>)}</div> },
              { label: 'Skills', value: <div className="flex flex-wrap gap-1">{a.skills.map(s => <Badge key={s} tone="brand">{s}</Badge>)}</div> },
              { label: 'KYC', value: a.kyc.charAt(0).toUpperCase() + a.kyc.slice(1) },
              { label: 'Astro code', value: a.code || '—' },
              { label: 'Availability', value: profile?.availabilityNote || '—' },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pricing & services"
          subtitle="Per-minute rates"
          action={
            <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setPricing(true)}>
              Edit
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {services.map(s => (
            <div key={s.key} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <s.icon className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{s.label}</p>
                <p className="text-xs text-muted">{s.rate !== undefined ? (s.rate ? `₹${s.rate}/min` : 'No rate set') : 'Not available in the app yet'}</p>
              </div>
              <Toggle checked={a.services[s.key]} disabled={s.key === 'live'} onChange={v => setService(s.key, v)} />
            </div>
          ))}
        </CardBody>
      </Card>

      {!!profile?.priceChanges.length && (
        <Card className="xl:col-span-3">
          <CardHeader title="Price change requests" subtitle="Rate changes the astrologer asked for from the app" />
          <CardBody className="space-y-3">
            {profile.priceChanges.map(req => (
              <div key={req.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink capitalize">
                    {req.service}: ₹{req.oldRate} → ₹{req.requestedRate}/min
                  </p>
                  <p className="text-xs text-muted">
                    {req.requestedAt ? formatDate(req.requestedAt) : ''}
                    {req.note ? ` · “${req.note}”` : ''}
                    {req.reason ? ` · Rejected: ${req.reason}` : ''}
                  </p>
                </div>
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="success" icon={<Check className="size-3.5" />} onClick={() => decidePrice(req, 'approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" icon={<X className="size-3.5" />} onClick={() => decidePrice(req, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="xl:col-span-3">
        <CardHeader title="Badge" subtitle="Promotional badge shown on profile cards" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...BADGES, undefined].map(b => {
              const active = a.badge === b
              return (
                <button
                  key={b ?? 'none'}
                  type="button"
                  onClick={() => setBadge(b)}
                  className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition', active ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-100' : 'border-line hover:border-gray-300')}>
                  <Award className={cn('mt-0.5 size-5', active ? 'text-brand-600' : 'text-muted')} />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{b ?? 'No badge'}</span>
                    <span className="block text-xs text-muted">{badgeHelp[b ?? 'none']}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <PricingModal astrologer={a} open={pricing} onClose={() => setPricing(false)} />
    </div>
  )
}
