import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CalendarClock, CheckCircle2, Star, UserPlus, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { useRecord } from '@/lib/store'
import { formatDate, formatDateTime, formatINR } from '@/lib/utils'
import AssignPanditModal from './AssignPanditModal'
import CancelBookingModal from './CancelBookingModal'
import { bookingsDb } from './data'
import { nextStatus } from './pricing'
import RescheduleModal, { type RescheduleInput } from './RescheduleModal'
import StatusFlow from './StatusFlow'
import type { Booking, BookingCancellation, BookingStatus } from './types'

type ModalKind = 'assign' | 'reschedule' | 'cancel' | null

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function BookingDetail() {
  const { id } = useParams()
  const { record: b, loading, update } = useRecord(bookingsDb, id)
  const [modal, setModal] = useState<ModalKind>(null)
  // Deep links may arrive before the list has this booking — fetch it on its own.
  useEffect(() => {
    if (id && !loading && !bookingsDb.snapshot().some(x => x.id === id)) void bookingsDb.get(id)
  }, [id, loading])
  const confirm = useConfirm()
  const toast = useToast()

  if (!b) {
    return (
      <Card>
        <EmptyState title={loading ? 'Loading booking…' : 'Booking not found'} text={loading ? undefined : `No booking with id ${id}`} action={<Link to="/bookings" className="text-sm font-medium text-brand-600">Back to bookings</Link>} />
      </Card>
    )
  }

  const open = b.status !== 'completed' && b.status !== 'cancelled'
  // A puja can be marked completed only once its slot has started (the API refuses earlier).
  const startsAt = slotStart(b.date, b.slot)
  const tooEarly = startsAt !== null && Date.now() < startsAt
  const next = nextStatus(b)
  const stamp = () => new Date().toISOString()
  const log = (label: string, note?: string): Booking['history'] => [...b.history, { label, at: stamp(), note }]

  const advance = async (to: BookingStatus) => {
    const ok = await confirm({ title: `Mark as ${to}?`, message: to === 'completed' ? (b.panditId ? 'The pandit earnings will be released to their wallet and the customer asked to rate the puja.' : 'The customer is told the puja was performed and asked to rate it.') : `Status will move from ${b.status} to ${to}.`, confirmLabel: titleCase(to), tone: to === 'completed' ? 'success' : 'primary' })
    if (ok === false) return
    await update(b.id, { status: to, history: log(to === 'completed' ? 'Puja completed' : titleCase(to), 'Updated by admin') })
    toast(`Booking marked ${to}`)
  }

  const assign = async (panditId: string, name: string) => {
    const re = !!b.panditId
    await update(b.id, { panditId, history: log(re ? 'Pandit reassigned' : 'Pandit assigned', re ? `${b.panditName} → ${name}` : name) })
    setModal(null)
    toast(`${name} ${re ? 'reassigned' : 'assigned'} — the booking is in their Pandit app`)
  }

  const reschedule = async (v: RescheduleInput) => {
    await update(b.id, { date: v.date, slot: v.slot, history: log('Rescheduled', `${b.date} ${b.slot} → ${v.date} ${v.slot} · ${v.reason}`) })
    setModal(null)
    toast('Booking rescheduled')
  }

  const cancel = async (c: Omit<BookingCancellation, 'at'>) => {
    await update(b.id, {
      status: 'cancelled',
      cancellation: { ...c, at: stamp() },
      history: log('Cancelled', `${c.reason} · refund ${formatINR(c.refundAmount)} (${c.refundPct}%)`),
    })
    setModal(null)
    toast(c.refundAmount > 0 ? `Cancelled · ${formatINR(c.refundAmount)} refunded to the customer's wallet` : 'Booking cancelled')
  }

  const p = b.price

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Puja Bookings', to: '/bookings' }, { label: b.reference }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {b.reference} <StatusBadge status={b.status} />
          </span>
        }
        subtitle={`${b.puja} · ${formatDate(b.date)} at ${b.slot} · ${b.mode === 'online' ? 'Online' : 'With pandit'}`}
        actions={
          open && (
            <>
              <Button variant="outline" icon={<UserPlus className="size-4" />} onClick={() => setModal('assign')}>
                {b.panditId ? 'Reassign' : 'Assign pandit'}
              </Button>
              {b.status === 'upcoming' && (
                <Button variant="outline" icon={<CalendarClock className="size-4" />} onClick={() => setModal('reschedule')}>
                  Reschedule
                </Button>
              )}
              <Button variant="outline" icon={<XCircle className="size-4" />} onClick={() => setModal('cancel')} className="text-red-600">
                Cancel
              </Button>
              {next && next !== 'completed' && b.panditStatus && (
                <span className="inline-flex items-center gap-1.5 self-center text-xs text-muted">
                  <ArrowRight className="size-3.5" /> {b.panditStatus}
                </span>
              )}
              <Button
                variant="success"
                icon={<CheckCircle2 className="size-4" />}
                onClick={() => advance('completed')}
                disabled={tooEarly}
                title={tooEarly ? `Can be marked completed after the puja starts (${b.slot})` : undefined}
              >
                Mark completed
              </Button>
              {tooEarly && <span className="self-center text-xs text-muted">Can be completed after {b.slot}</span>}
            </>
          )
        }
      />

      {!b.panditId && open && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>No pandit assigned — Shree Astro performs this puja (live stream). Assign a pandit to send it to their Pandit app.</span>
          <Button size="sm" onClick={() => setModal('assign')}>
            Assign now
          </Button>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader title="Status" />
        <CardBody>
          <StatusFlow booking={b} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Booking details" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Puja', value: b.puja },
                  { label: 'Mode', value: b.mode === 'online' ? 'Online (live stream)' : 'With pandit' },
                  { label: 'Date', value: formatDate(b.date) },
                  { label: 'Slot', value: b.slot },
                  { label: 'Address', value: b.address },
                  { label: 'Gotra', value: b.gotra || '—' },
                  { label: 'Booked on', value: formatDateTime(b.createdAt) },
                  { label: 'Payment', value: <span className="flex items-center gap-2">{b.paymentMethod} <StatusBadge status={b.paymentStatus} /></span> },
                  ...(b.notes ? [{ label: 'Customer notes', value: b.notes }] : []),
                  ...(b.streamUrl ? [{ label: 'Live stream', value: b.streamUrl }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader title="Customer" />
              <CardBody>
                <Link to={`/customers/${b.customerId}`} className="flex items-center gap-3 hover:text-brand-600">
                  <Avatar name={b.customerName} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.customerName}</p>
                    <p className="text-xs text-muted">{b.customerPhone || b.customerId}</p>
                  </div>
                </Link>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Pandit" />
              <CardBody>
                {b.panditId ? (
                  <Link to={`/pandits/${b.panditId}`} className="flex items-center gap-3 hover:text-brand-600">
                    <Avatar name={b.panditName} size={44} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.panditName}</p>
                      <p className="text-xs text-muted">{[b.panditPhone, b.panditStatus].filter(Boolean).join(' · ')}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="amber">Unassigned</Badge>
                    {open && (
                      <Button size="sm" variant="secondary" onClick={() => setModal('assign')}>
                        Assign
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Review" />
            <CardBody>
              {b.rating ? (
                <div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={i < b.rating! ? 'size-5 fill-amber-400 text-amber-400' : 'size-5 text-gray-300'} />
                    ))}
                  </div>
                  {b.review && <p className="mt-2 text-sm">“{b.review}”</p>}
                </div>
              ) : (
                <p className="text-sm text-muted">{b.status === 'completed' ? "Customer hasn't rated this puja yet." : 'Available after the puja is completed.'}</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Price breakdown" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Puja price" value={formatINR(p.base)} />
              {b.discount > 0 && <Row label={`Discount${b.coupon ? ` (${b.coupon})` : ''}`} value={`− ${formatINR(b.discount)}`} />}
              <div className="flex justify-between border-t border-line pt-2.5 font-semibold">
                <span>Total</span>
                <span>{formatINR(b.total)}</span>
              </div>
              {b.cancellation && (
                <div className="flex justify-between text-red-600">
                  <span>Refund ({b.cancellation.refundPct}%)</span>
                  <span className="font-medium">− {formatINR(b.cancellation.refundAmount)}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <CardBody>
              <ol className="relative space-y-4 border-l border-line pl-5">
                {[...b.history].reverse().map((h, i) => (
                  <li key={`${h.at}-${i}`} className="relative">
                    <span className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-white ${i === 0 ? 'bg-brand-600' : 'bg-gray-300'}`} />
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="text-xs text-muted">{formatDateTime(h.at)}</p>
                    {h.note && <p className="mt-0.5 text-xs text-muted">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      {modal === 'assign' && <AssignPanditModal booking={b} onClose={() => setModal(null)} onAssign={assign} />}
      {modal === 'reschedule' && <RescheduleModal booking={b} onClose={() => setModal(null)} onSave={reschedule} />}
      {modal === 'cancel' && <CancelBookingModal booking={b} onClose={() => setModal(null)} onConfirm={cancel} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/** '2026-10-15' + '06:00 PM' (IST) → epoch ms, or null if the slot can't be read. */
function slotStart(date: string, slot: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(slot.trim())
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return Date.parse(`${date}T${String(h).padStart(2, '0')}:${m[2]}:00+05:30`)
}
