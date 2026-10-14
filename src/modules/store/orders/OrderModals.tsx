import { useState } from 'react'
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { COURIERS, ORDER_STATUS_LABEL, ordersDb, orderEvent } from '../data'
import { nextStatuses } from '../lib'
import type { Order, OrderStatus } from '../types'

/** Moves an order forward through Placed → Packed → Out for Delivery → Delivered. */
export function UpdateStatusModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const toast = useToast()
  const options = nextStatuses(order)
  const [status, setStatus] = useState<OrderStatus>(options[0] ?? order.status)
  const [courier, setCourier] = useState(order.courier ?? COURIERS[0]!)
  const [awb, setAwb] = useState(order.awb ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const needsAwb = (status === 'transit' || status === 'delivered') && !order.awb
  const awbError = needsAwb && awb.trim().length > 0 && awb.trim().length < 8 ? 'AWB looks too short' : undefined
  const canSave = !needsAwb || awb.trim().length >= 8

  const save = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const patch: Partial<Order> = { status }
    const events = []
    if (status !== 'processing' && !order.packedAt) {
      patch.packedAt = now
      events.push(orderEvent('Packed'))
    }
    if ((status === 'transit' || status === 'delivered') && !order.shippedAt) {
      patch.shippedAt = now
      patch.courier = courier
      patch.awb = awb.trim()
      events.push(orderEvent('Shipped', 'admin', `${courier} · AWB ${awb.trim()}`))
    }
    if (status === 'delivered') {
      patch.deliveredAt = now
      if (order.paymentMethod === 'COD') {
        patch.paymentStatus = 'paid'
        events.push(orderEvent('COD payment collected', 'courier'))
      }
      events.push(orderEvent('Delivered'))
    }
    if (note.trim()) events.push(orderEvent('Note', 'admin', note.trim()))
    patch.activity = [...events.reverse(), ...order.activity]
    try {
      await ordersDb.update(order.id, patch)
      toast(`Order marked ${ORDER_STATUS_LABEL[status]}`)
      onClose()
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
      size="sm"
      title="Update status"
      subtitle={`#${order.reference} · currently ${ORDER_STATUS_LABEL[order.status]}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!canSave} onClick={save}>
            Update
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="New status" value={status} onChange={e => setStatus(e.target.value as OrderStatus)} options={options.map(s => ({ label: ORDER_STATUS_LABEL[s], value: s }))} />
        {needsAwb && (
          <>
            <Select label="Courier" value={courier} options={COURIERS} onChange={e => setCourier(e.target.value)} />
            <Input label="AWB / tracking number" value={awb} error={awbError} onChange={e => setAwb(e.target.value.replace(/\s/g, ''))} placeholder="e.g. 1490811234567" />
          </>
        )}
        <Textarea label="Internal note (optional)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
        <p className="text-xs text-muted">The customer receives an “Order shipped” / delivery notification for this update.</p>
      </div>
    </Modal>
  )
}

/** Adds or edits courier + AWB; optionally moves a packed order to In Transit. */
export function CourierModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const toast = useToast()
  const [courier, setCourier] = useState(order.courier ?? COURIERS[0]!)
  const [awb, setAwb] = useState(order.awb ?? '')
  const [ship, setShip] = useState(order.status === 'processing' || order.status === 'packed')
  const [saving, setSaving] = useState(false)
  const valid = awb.trim().length >= 8

  const save = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const patch: Partial<Order> = { courier, awb: awb.trim() }
    const events = [orderEvent(order.awb ? 'Tracking updated' : 'Courier assigned', 'admin', `${courier} · AWB ${awb.trim()}`)]
    if (ship && (order.status === 'processing' || order.status === 'packed')) {
      patch.status = 'transit'
      patch.packedAt = order.packedAt ?? now
      patch.shippedAt = now
      events.unshift(orderEvent('Shipped'))
    }
    patch.activity = [...events, ...order.activity]
    try {
      await ordersDb.update(order.id, patch)
      toast(patch.status ? 'Courier assigned · order in transit' : 'Tracking saved')
      onClose()
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
      size="sm"
      title={order.awb ? 'Edit tracking' : 'Add courier & AWB'}
      subtitle={`#${order.reference}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!valid} onClick={save}>
            Save
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="Courier partner" value={courier} options={COURIERS} onChange={e => setCourier(e.target.value)} />
        <Input
          label="AWB number"
          value={awb}
          placeholder="e.g. 1490811234567"
          error={awb && !valid ? 'At least 8 characters' : undefined}
          onChange={e => setAwb(e.target.value.replace(/\s/g, ''))}
        />
        {(order.status === 'processing' || order.status === 'packed') && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ship} onChange={e => setShip(e.target.checked)} className="size-4 accent-brand-600" />
            Mark as shipped (In Transit)
          </label>
        )}
      </div>
    </Modal>
  )
}
