import { useState } from 'react'
import { Button, Modal, Select, Textarea } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { refundTier } from './pricing'
import type { Booking, BookingCancellation } from './types'

const REASONS = ['Customer requested', 'Pandit unavailable', 'No pandit available in area', 'Payment issue', 'Duplicate booking', 'Other']

export default function CancelBookingModal({ booking, onClose, onConfirm }: { booking: Booking; onClose: () => void; onConfirm: (c: Omit<BookingCancellation, 'at'>) => Promise<void> }) {
  const tier = refundTier(booking)
  const [by, setBy] = useState<BookingCancellation['by']>('customer')
  const [reason, setReason] = useState(REASONS[0]!)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // A cancellation from the panel always refunds what was paid, in full, to the customer's wallet.
  const paid = booking.paymentStatus === 'paid'
  const pct = paid ? 100 : 0
  const refund = paid ? booking.total : 0
  const noteError = reason === 'Other' && !note.trim() ? 'Describe the reason' : undefined

  const submit = async () => {
    if (noteError) return
    setSaving(true)
    try {
      await onConfirm({ by, reason: note.trim() ? `${reason} — ${note.trim()}` : reason, refundPct: pct, refundAmount: refund })
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel booking"
      subtitle={`${booking.reference} · ${booking.puja}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Keep booking
          </Button>
          <Button variant="danger" loading={saving} disabled={!!noteError} onClick={submit}>
            Cancel & refund {formatINR(refund)}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Cancelled by"
            value={by}
            onChange={e => setBy(e.target.value as BookingCancellation['by'])}
            options={[
              { label: 'Customer', value: 'customer' },
              { label: 'Pandit', value: 'pandit' },
              { label: 'Admin / platform', value: 'admin' },
            ]}
          />
          <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)} options={REASONS} />
        </div>
        <Textarea label="Note" rows={2} value={note} onChange={e => setNote(e.target.value)} error={noteError} />

        <div className="rounded-xl border border-line bg-canvas/60 p-4 text-sm">
          <p className="font-medium">Refund</p>
          <p className="mt-1 text-muted">
            {tier.hours > 0 ? `${Math.floor(tier.hours)}h until the puja. ` : 'Puja time has passed. '}
            {paid ? 'Cancelling from the panel refunds the full amount paid to the customer’s wallet, and the pandit (if any) is told.' : 'Nothing was collected for this booking, so there is nothing to refund.'}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span>
              Refund ({pct}% of {formatINR(booking.total)})
            </span>
            <span className="text-base font-semibold text-brand-600">{formatINR(refund)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
