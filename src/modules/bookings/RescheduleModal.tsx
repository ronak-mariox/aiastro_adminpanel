import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { bookingsDb, pujasDb } from './data'
import { bookingStart, SLOTS } from './pricing'
import type { Booking } from './types'

export type RescheduleInput = { date: string; slot: string; reason: string }

export default function RescheduleModal({ booking, onClose, onSave }: { booking: Booking; onClose: () => void; onSave: (v: RescheduleInput) => Promise<void> }) {
  const [date, setDate] = useState(booking.date)
  // The puja's own slots (the API refuses any other); "9:00 AM" as the page shows "09:00 AM".
  const slots = (pujasDb.snapshot().find(p => p.id === booking.pujaId)?.timeSlots ?? SLOTS).map(t => t.replace(/^(\d):/, '0$1:'))
  const [slot, setSlot] = useState(slots.includes(booking.slot) ? booking.slot : (slots[0] ?? booking.slot))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [now] = useState(() => Date.now())

  const inPast = bookingStart({ date, slot }).getTime() < now
  const unchanged = date === booking.date && slot === booking.slot
  const conflict =
    !!booking.panditId &&
    bookingsDb.snapshot().some(b => b.id !== booking.id && b.panditId === booking.panditId && b.date === date && b.slot === slot && b.status !== 'cancelled')
  const errors = {
    date: !date ? 'Pick a date' : inPast ? 'Pick a future date & slot' : unchanged ? 'Choose a different date or slot' : undefined,
    reason: !reason.trim() ? 'Reason is required' : undefined,
  }

  const submit = async () => {
    setTouched(true)
    if (errors.date || errors.reason) return
    setSaving(true)
    try {
      await onSave({ date, slot, reason: reason.trim() })
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Reschedule booking"
      subtitle={`Currently ${booking.date} at ${booking.slot}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Reschedule
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} error={touched ? errors.date : undefined} />
          <Select label="Slot" value={slot} onChange={e => setSlot(e.target.value)} options={slots} />
        </div>
        {conflict && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle className="mt-px size-4 shrink-0" />
            The assigned pandit already has a booking in this slot. You may need to reassign.
          </p>
        )}
        <Textarea label="Reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} error={touched ? errors.reason : undefined} placeholder="Shared with the customer and pandit" />
      </div>
    </Modal>
  )
}
