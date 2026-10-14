import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Flag, FlagOff, Gift as GiftIcon, PhoneOff, RotateCcw, Star } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/api'
import { useRecord } from '@/lib/store'
import { formatDate, formatDateTime, formatINR } from '@/lib/utils'
import { endConsultation, refundConsultation, setConsultationFlag, warnAstrologer } from './api'
import { consultationsDb } from './data'
import { billing, formatDuration } from './helpers'
import RefundModal from './RefundModal'
import SessionContent from './SessionContent'
import Timeline, { type TimelineEvent } from './Timeline'
import TypeBadge from './TypeBadge'
import type { Consultation, ConsultationRefund } from './types'
import { useNow } from './useNow'

function buildTimeline(c: Consultation): TimelineEvent[] {
  const ev: TimelineEvent[] = [{ label: `${c.type.charAt(0).toUpperCase() + c.type.slice(1)} requested`, at: c.requestedAt, note: `Intake topic: ${c.intake.topic}` }]
  if (c.status === 'missed') return [...ev, { label: 'Missed', at: c.startedAt, note: c.cancelReason, tone: 'danger' }]
  if (c.status === 'cancelled') return [...ev, { label: 'Cancelled', at: c.startedAt, note: c.cancelReason, tone: 'danger' }]
  if (c.status === 'requested') return [...ev, { label: 'Waiting for astrologer to accept', tone: 'live' }]
  ev.push({ label: 'Accepted & started', at: c.startedAt, note: `${c.astrologerName} · ${formatINR(c.ratePerMin)}/min`, tone: 'success' })
  c.gifts.forEach(g => ev.push({ label: `${g.icon} ${g.name} gift sent`, at: g.at, note: formatINR(g.price) }))
  c.warnings.forEach(w => ev.push({ label: 'Astrologer warned', at: w.at, note: w.reason, tone: 'danger' }))
  if (c.status === 'ongoing') ev.push({ label: 'Live — in progress', tone: 'live' })
  if (c.endedAt) ev.push({ label: 'Session ended', at: c.endedAt, note: [`Billed ${formatDuration(c.durationSec)}`, c.endReason].filter(Boolean).join(' · '), tone: 'success' })
  if (c.rating && c.endedAt) ev.push({ label: `Rated ${c.rating}★`, at: new Date(new Date(c.endedAt).getTime() + 60_000).toISOString() })
  if (c.refund) ev.push({ label: `${c.refund.type === 'full' ? 'Full' : 'Partial'} refund issued`, at: c.refund.at, note: `${formatINR(c.refund.amount)} · ${c.refund.reason}`, tone: 'danger' })
  return ev.sort((a, b) => (a.at && b.at ? a.at.localeCompare(b.at) : a.at ? -1 : 1))
}

export default function ConsultationDetail() {
  const { id } = useParams()
  const { record: c, loading } = useRecord(consultationsDb, id)
  const { can } = useAuth()
  const [refunding, setRefunding] = useState(false)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()
  const now = useNow(1000)

  if (!c) {
    return (
      <Card>
        <EmptyState title={loading ? 'Loading session…' : 'Session not found'} text={loading ? undefined : `No consultation with id ${id}`} action={<Link to="/consultations" className="text-sm font-medium text-brand-600">Back to consultations</Link>} />
      </Card>
    )
  }

  const b = billing(c, now)

  const reload = () => consultationsDb.get(c.id).catch(e => toast(errorMessage(e), 'error'))

  const run = async (fn: () => Promise<unknown>, done: string, tone?: 'info') => {
    try {
      await fn()
      await reload()
      toast(done, tone)
      return true
    } catch (e) {
      toast(errorMessage(e), 'error')
      return false
    }
  }

  const endSession = async () => {
    const ok = await confirm({ title: 'End this session now?', message: `The session will be closed for both parties and the customer billed for the time used (about ${formatINR(b.charges)} for ${formatDuration(b.secs)}).`, confirmLabel: 'End session', tone: 'danger' })
    if (ok === false) return
    setBusy(true)
    await run(() => endConsultation(c.id, 'Ended by admin'), 'Session ended')
    setBusy(false)
  }

  const refund = async (r: Omit<ConsultationRefund, 'at'>) => {
    try {
      const res = await refundConsultation(c.id, { type: r.type, amount: r.amount, reason: r.reason })
      await reload()
      setRefunding(false)
      toast(`${formatINR(res.amount)} refunded to ${c.customerName}'s wallet`)
      if (res.astrologerShortfall > 0) toast(`Astrologer balance too low to reverse ${formatINR(res.astrologerShortfall)} — reconcile manually`, 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const toggleFlag = async () => {
    if (c.flagged) {
      const ok = await confirm({ title: 'Remove flag?', message: 'Mark this session as reviewed and clear the flag.', confirmLabel: 'Unflag' })
      if (ok === false) return
      await run(() => setConsultationFlag(c.id, false), 'Flag removed')
    } else {
      const reason = await confirm({ title: 'Flag session for review', withReason: true, reasonLabel: 'What needs review?', confirmLabel: 'Flag', tone: 'danger' })
      if (reason === false) return
      await run(() => setConsultationFlag(c.id, true, reason), 'Session flagged', 'info')
    }
  }

  const warn = async () => {
    const reason = await confirm({ title: `Warn ${c.astrologerName}`, message: 'The astrologer receives this warning as an in-app notification. Repeated warnings may lead to suspension.', withReason: true, reasonLabel: 'Warning message', confirmLabel: 'Send warning', tone: 'danger' })
    if (reason === false) return
    await run(() => warnAstrologer(c.id, reason), 'Warning sent to astrologer')
  }

  const canRefund = c.status === 'completed' && c.refundable > 0 && can('payments.refund')
  const canManage = can('consultations.manage')

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Consultations', to: '/consultations' }, { label: c.ref }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.ref} <StatusBadge status={c.status} /> <TypeBadge type={c.type} />
            {c.flagged && (
              <Badge tone="red">
                <Flag className="size-3" /> Flagged
              </Badge>
            )}
          </span>
        }
        subtitle={`${c.customerName} with ${c.astrologerName} · ${formatDateTime(c.startedAt)}`}
        actions={
          <>
            {c.status === 'ongoing' && canManage && (
              <Button variant="danger" icon={<PhoneOff className="size-4" />} loading={busy} onClick={endSession}>
                End session
              </Button>
            )}
            {canRefund && (
              <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => setRefunding(true)}>
                Issue refund
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="outline" icon={c.flagged ? <FlagOff className="size-4" /> : <Flag className="size-4" />} onClick={toggleFlag}>
                  {c.flagged ? 'Unflag' : 'Flag'}
                </Button>
                <Button variant="outline" icon={<AlertTriangle className="size-4" />} onClick={warn}>
                  Warn astrologer
                </Button>
              </>
            )}
          </>
        }
      />

      {c.flagged && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Flag className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Flagged for review</p>
            <p>{c.flagReason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Participants" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {[
                { role: 'Customer', id: c.customerCode ?? '', name: c.customerName, to: `/customers/${c.customerId}` },
                { role: 'Astrologer', id: '', name: c.astrologerName, to: `/astrologers/${c.astrologerId}` },
              ].map(p => (
                <Link key={p.role} to={p.to} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-200 hover:bg-brand-50/40">
                  <Avatar name={p.name} size={42} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{p.role}</p>
                    <p className="truncate font-medium">{p.name}</p>
                    {p.id && <p className="text-xs text-muted">{p.id}</p>}
                  </div>
                </Link>
              ))}
              <div className="sm:col-span-2">
                <DetailList
                  columns={3}
                  items={[
                    { label: 'Duration', value: <span className="tabular-nums">{formatDuration(b.secs)}</span> },
                    { label: 'Rate', value: `${formatINR(c.ratePerMin)}/min` },
                    { label: 'Ended', value: c.endedAt ? formatDateTime(c.endedAt) : c.status === 'ongoing' ? 'Live' : '—' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <SessionContent c={c} secs={b.secs} />

          <Card>
            <CardHeader title="Gifts sent" subtitle={c.gifts.length ? `${c.gifts.length} gift${c.gifts.length > 1 ? 's' : ''} · ${formatINR(b.giftsTotal)}` : undefined} />
            {c.gifts.length === 0 ? (
              <EmptyState icon={GiftIcon} title="No gifts in this session" />
            ) : (
              <ul className="divide-y divide-line">
                {c.gifts.map((g, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-xl">{g.imageUrl ? <img src={g.imageUrl} alt="" className="size-7 object-contain" /> : g.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs text-muted">{formatDateTime(g.at)}</p>
                    </div>
                    <span className="font-medium">{formatINR(g.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Billing" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label={`Session charges (${Math.ceil(b.secs / 60)} min × ${formatINR(c.ratePerMin)})`} value={formatINR(b.charges)} />
              <Row label="Gifts" value={formatINR(b.giftsTotal)} />
              <Row label="Gross paid by customer" value={formatINR(b.gross)} strong />
              <hr className="border-line" />
              <Row label={`Platform commission (${c.commissionPct}%)`} value={formatINR(b.commission)} />
              <Row label={`Platform share of gifts (${c.commissionPct}%)`} value={formatINR(b.giftsTotal - b.giftShare)} />
              <Row label="Astrologer share" value={formatINR(b.astrologerShare)} strong />
              {c.refund && (
                <>
                  <hr className="border-line" />
                  <Row label={`Refunded (${c.refund.type})`} value={`− ${formatINR(c.refund.amount)}`} danger />
                  <p className="text-xs text-muted">{c.refund.reason}</p>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Intake form" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Name', value: c.intake.name },
                  { label: 'Gender', value: c.intake.gender },
                  { label: 'Date of birth', value: c.intake.dob ? formatDate(c.intake.dob) : '—' },
                  { label: 'Time of birth', value: c.intake.tob },
                  { label: 'Place of birth', value: c.intake.place },
                  { label: 'Topic', value: c.intake.topic },
                  ...(c.intake.question ? [{ label: 'Question', value: c.intake.question }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Review" />
            <CardBody>
              {c.rating ? (
                <div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={i < c.rating! ? 'size-5 fill-amber-400 text-amber-400' : 'size-5 text-gray-300'} />
                    ))}
                  </div>
                  {c.review && <p className="mt-2 text-sm text-ink">“{c.review}”</p>}
                </div>
              ) : (
                <p className="text-sm text-muted">Customer hasn't rated this session.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <Timeline events={buildTimeline(c)} />
            </CardBody>
          </Card>
        </div>
      </div>

      {refunding && <RefundModal max={c.refundable} onClose={() => setRefunding(false)} onConfirm={refund} />}
    </div>
  )
}

function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className={strong ? 'font-medium text-ink' : 'text-muted'}>{label}</span>
      <span className={danger ? 'font-medium text-red-600' : strong ? 'font-semibold' : 'font-medium'}>{value}</span>
    </div>
  )
}
