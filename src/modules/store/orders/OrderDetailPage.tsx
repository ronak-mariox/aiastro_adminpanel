import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRightCircle, Check, Gift, MapPin, Phone, Printer, Truck, Undo2, X, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, useConfirm, useToast } from '@/components/ui'
import { useCollection, useRecord } from '@/lib/store'
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { GST_RATE, ordersDb, orderEvent, productsDb } from '../data'
import { OrderStatusBadge, PaymentBadge, ProductThumb } from '../shared'
import type { Order } from '../types'
import Invoice from './Invoice'
import { nextStatuses } from '../lib'
import { CourierModal, UpdateStatusModal } from './OrderModals'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { record: order, loading } = useRecord(ordersDb, id)
  const { items: products } = useCollection(productsDb)
  // Deep links may arrive before the list has this order — fetch it on its own.
  useEffect(() => {
    if (id && !loading && !ordersDb.snapshot().some(o => o.id === id)) void ordersDb.get(id)
  }, [id, loading])
  const [modal, setModal] = useState<'status' | 'courier' | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  if (!order) {
    return (
      <>
        <PageHeader title="Order" breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: id ?? '' }]} />
        <Card>{loading ? <div className="h-40 animate-pulse" /> : <EmptyState title="Order not found" action={<Button onClick={() => navigate('/orders')}>Back to orders</Button>} />}</Card>
      </>
    )
  }

  const canCancel = order.status === 'processing' || order.status === 'packed' || order.status === 'transit'
  const canTrack = canCancel
  const openReturn = order.returnRequest?.status === 'requested'
  const refundable = order.paymentStatus === 'paid'
  // Every refund lands in the customer's wallet (the API credits a `refund` wallet row).
  const refundTo = 'customer wallet'

  const patch = (p: Partial<Order>, label: string, note?: string) => ordersDb.update(order.id, { ...p, activity: [orderEvent(label, 'admin', note), ...order.activity] })

  const cancel = async () => {
    const reason = await confirm({
      title: `Cancel order #${order.reference}?`,
      message: refundable ? `${formatINR(order.total)} will be refunded to the ${refundTo} and the stock restored.` : 'No payment was collected, so no refund is needed. The stock is restored.',
      confirmLabel: 'Cancel order',
      tone: 'danger',
      withReason: true,
      reasonLabel: 'Cancellation reason (shared with customer)',
    })
    if (reason === false) return
    await patch(
      { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: reason, ...(refundable ? { paymentStatus: 'refunded' as const, refundAmount: order.total } : {}) },
      refundable ? 'Order cancelled · refund issued' : 'Order cancelled',
      reason,
    )
    toast(refundable ? `Order cancelled · ${formatINR(order.total)} refund initiated` : 'Order cancelled')
  }

  const approveReturn = async () => {
    const ok = await confirm({
      title: 'Approve return?',
      message: `Reverse pickup will be scheduled and ${formatINR(order.total)} refunded to the ${refundTo} once the item is received.`,
      confirmLabel: 'Approve & refund',
      tone: 'success',
    })
    if (ok === false || !order.returnRequest) return
    await patch(
      { status: 'returned', paymentStatus: 'refunded', refundAmount: order.total, returnRequest: { ...order.returnRequest, status: 'approved', resolvedAt: new Date().toISOString() } },
      'Return approved · refund issued',
    )
    toast('Return approved')
  }

  const rejectReturn = async () => {
    const reason = await confirm({ title: 'Reject return request?', confirmLabel: 'Reject', tone: 'danger', withReason: true, reasonLabel: 'Reason (shared with customer)' })
    if (reason === false || !order.returnRequest) return
    await patch({ returnRequest: { ...order.returnRequest, status: 'rejected', resolvedAt: new Date().toISOString(), note: reason } }, 'Return rejected', reason)
    toast('Return request rejected', 'info')
  }

  return (
    <>
      <Invoice order={order} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            #{order.reference} <OrderStatusBadge status={order.status} />
          </span>
        }
        subtitle={`Placed ${formatDateTime(order.placedAt)} · ${order.items.reduce((s, i) => s + i.qty, 0)} items · ${formatINR(order.total)}`}
        breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: order.reference }]}
        actions={
          <>
            <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Invoice
            </Button>
            {canTrack && (
              <Button variant="outline" icon={<Truck className="size-4" />} onClick={() => setModal('courier')}>
                {order.awb ? 'Edit tracking' : 'Add courier'}
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" icon={<XCircle className="size-4" />} onClick={cancel}>
                Cancel
              </Button>
            )}
            {nextStatuses(order).length > 0 && (
              <Button icon={<ArrowRightCircle className="size-4" />} onClick={() => setModal('status')}>
                Update status
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {openReturn && order.returnRequest && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Undo2 className="size-6 shrink-0 text-orange-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Return requested · {order.returnRequest.reason}</p>
                  <p className="text-sm text-muted">
                    “{order.returnRequest.comment}” · {formatDateTime(order.returnRequest.requestedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" icon={<X className="size-4" />} onClick={rejectReturn}>
                    Reject
                  </Button>
                  <Button variant="success" icon={<Check className="size-4" />} onClick={approveReturn}>
                    Approve
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Items" subtitle={order.coupon ? `Coupon ${order.coupon} applied` : undefined} />
            <ul className="divide-y divide-line">
              {order.items.map((i, idx) => {
                const p = products.find(x => x.id === i.productId)
                return (
                  <li key={idx} className="flex items-center gap-3 px-5 py-3">
                    <ProductThumb src={i.imageUrl ?? p?.images[0]} name={i.name} />
                    <div className="min-w-0 flex-1">
                      {p && !i.gift ? (
                        <Link to={`/products/${p.id}`} className="block truncate text-sm font-medium hover:text-brand-600">
                          {i.name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium">{i.name}</p>
                      )}
                      <p className="text-xs text-muted">
                        {i.variant ? `${i.variant} · ` : ''}Qty {i.qty} × {formatINR(i.price)}
                      </p>
                    </div>
                    {i.gift ? (
                      <Badge tone="brand">
                        <Gift className="size-3" /> Free gift
                      </Badge>
                    ) : (
                      <span className="text-sm font-medium">{formatINR(i.price * i.qty)}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <TotalRow label="Subtotal" value={formatINR(order.subtotal)} />
              {order.discount > 0 && <TotalRow label={`Discount${order.coupon ? ` (${order.coupon})` : ''}`} value={`− ${formatINR(order.discount)}`} className="text-emerald-600" />}
              <TotalRow label="Shipping" value={order.shipping ? formatINR(order.shipping) : 'Free'} />
              <TotalRow label={`GST (${GST_RATE * 100}%)`} value={formatINR(order.gst)} />
              <TotalRow label="Total" value={formatINR(order.total)} className="border-t border-line pt-2 text-base font-semibold" />
              {order.refundAmount !== undefined && <TotalRow label="Refunded" value={formatINR(order.refundAmount)} className="text-red-600" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Tracking" subtitle={order.awb ? `${order.courier} · AWB ${order.awb}` : 'No courier assigned yet'} />
            <CardBody>
              <TrackingTimeline order={order} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ul className="divide-y divide-line">
              {order.activity.map((e, i) => (
                <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.label}</p>
                    {e.note && <p className="text-muted">{e.note}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted">
                    <p>{formatDateTime(e.at)}</p>
                    <p className="capitalize">{e.by}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={order.customerName} size={44} />
                <div className="min-w-0">
                  {order.customerId ? (
                    <Link to={`/customers/${order.customerId}`} className="block truncate font-medium hover:text-brand-600">
                      {order.customerName}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{order.customerName}</p>
                  )}
                  <p className="text-xs text-muted">{order.customerId}</p>
                </div>
              </div>
              <DetailList
                columns={1}
                items={[
                  { label: 'Email', value: order.customerEmail || '—' },
                  { label: 'Phone', value: order.customerPhone || '—' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Shipping address" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium">{order.address.name}</p>
              <p className="flex gap-2 text-muted">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  {order.address.line1}
                  {order.address.line2 && `, ${order.address.line2}`}, {order.address.city}, {order.address.state} — {order.address.pincode}
                </span>
              </p>
              <p className="flex items-center gap-2 text-muted">
                <Phone className="size-4" /> {order.address.phone}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment" />
            <CardBody>
              <DetailList
                columns={1}
                items={[
                  { label: 'Method', value: order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod },
                  { label: 'Status', value: <PaymentBadge status={order.paymentStatus} /> },
                  ...(order.refundAmount !== undefined ? [{ label: 'Refund', value: `${formatINR(order.refundAmount)} → ${refundTo}` }] : []),
                  ...(order.cancelReason ? [{ label: 'Cancellation reason', value: order.cancelReason }] : []),
                  ...(order.returnRequest && order.returnRequest.status !== 'requested'
                    ? [{ label: 'Return', value: `${order.returnRequest.status === 'approved' ? 'Approved' : 'Rejected'} · ${order.returnRequest.reason}${order.returnRequest.note ? ` — ${order.returnRequest.note}` : ''}` }]
                    : []),
                ]}
              />
            </CardBody>
          </Card>
        </aside>
      </div>

      {modal === 'status' && <UpdateStatusModal order={order} onClose={() => setModal(null)} />}
      {modal === 'courier' && <CourierModal order={order} onClose={() => setModal(null)} />}
    </>
  )
}

function TotalRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span className={className ? undefined : 'text-muted'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function TrackingTimeline({ order }: { order: Order }) {
  const steps: { label: string; at?: string; tone?: 'red' | 'gray' }[] = [
    { label: 'Placed', at: order.placedAt },
    { label: 'Packed', at: order.packedAt },
    { label: 'Out for Delivery', at: order.shippedAt },
    { label: 'Delivered', at: order.deliveredAt },
  ]
  if (order.status === 'cancelled') {
    const reached = steps.filter(s => s.at)
    steps.splice(0, steps.length, ...reached, { label: 'Cancelled', at: order.cancelledAt, tone: 'red' })
  }
  if (order.returnRequest) {
    steps.push({ label: 'Return requested', at: order.returnRequest.requestedAt })
    if (order.returnRequest.status !== 'requested')
      steps.push({ label: order.returnRequest.status === 'approved' ? 'Returned & refunded' : 'Return rejected', at: order.returnRequest.resolvedAt, tone: order.returnRequest.status === 'rejected' ? 'red' : 'gray' })
  }
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const done = !!s.at
        const last = i === steps.length - 1
        return (
          <li key={s.label} className="relative flex gap-3 pb-6 last:pb-0">
            {!last && <span className={cn('absolute top-6 left-[11px] h-[calc(100%-24px)] w-0.5', steps[i + 1]?.at ? 'bg-brand-600' : 'bg-line')} />}
            <span
              className={cn(
                'relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                !done && 'border-line bg-white',
                done && s.tone === 'red' && 'border-red-600 bg-red-600 text-white',
                done && s.tone === 'gray' && 'border-gray-500 bg-gray-500 text-white',
                done && !s.tone && 'border-brand-600 bg-brand-600 text-white',
              )}>
              {done && (s.tone === 'red' ? <X className="size-3.5" /> : <Check className="size-3.5" />)}
            </span>
            <div>
              <p className={cn('text-sm font-medium', !done && 'text-muted')}>{s.label}</p>
              <p className="text-xs text-muted">{s.at ? formatDateTime(s.at) : 'Pending'}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
