import { formatDate, formatINR } from '@/lib/utils'
import { GST_RATE } from '../data'
import type { Order } from '../types'

// Only the invoice is visible while printing; it stays hidden on screen.
const PRINT_CSS = `
#store-invoice { display: none; }
@media print {
  body * { visibility: hidden !important; }
  #store-invoice, #store-invoice * { visibility: visible !important; }
  #store-invoice { display: block; position: absolute; inset: 0 auto auto 0; width: 100%; padding: 32px; background: #fff; }
  @page { margin: 12mm; }
}
`

export default function Invoice({ order }: { order: Order }) {
  const a = order.address
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="store-invoice" className="text-[12px] text-black">
        <div className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <p className="text-xl font-bold text-brand-600">AstroVati by VedRashi</p>
            <p>VedRashi Spiritual Services Pvt. Ltd.</p>
            <p>Sector 63, Noida, Uttar Pradesh 201301</p>
            <p>GSTIN: 09AAKCV2026R1Z5 · support@vedrashi.com</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">TAX INVOICE</p>
            <p>Invoice #: INV-{order.reference.replace(/^ORD-/, '')}</p>
            <p>Order #: {order.reference}</p>
            <p>Date: {formatDate(order.placedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div>
            <p className="font-semibold">Bill to / Ship to</p>
            <p>{a.name || order.customerName}</p>
            <p>{a.line1}</p>
            {a.line2 && <p>{a.line2}</p>}
            <p>
              {a.city}, {a.state} — {a.pincode}
            </p>
            <p>{a.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Payment</p>
            <p>
              {order.paymentMethod} · {order.paymentStatus}
            </p>
            {order.awb && (
              <p>
                {order.courier} · AWB {order.awb}
              </p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-gray-300 text-left">
              <th className="py-2">#</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">
                  {i.name}
                  {i.variant && ` — ${i.variant}`}
                </td>
                <td className="py-2 text-right">{i.qty}</td>
                <td className="py-2 text-right">{formatINR(i.price)}</td>
                <td className="py-2 text-right">{formatINR(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-64 space-y-1">
          <Row label="Subtotal" value={formatINR(order.subtotal)} />
          {order.discount > 0 && <Row label={`Discount${order.coupon ? ` (${order.coupon})` : ''}`} value={`− ${formatINR(order.discount)}`} />}
          <Row label="Shipping" value={order.shipping ? formatINR(order.shipping) : 'Free'} />
          <Row label={`GST (${GST_RATE * 100}%)`} value={formatINR(order.gst)} />
          <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-bold">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-gray-500">Thank you for shopping with AstroVati. 7-day easy returns · This is a computer generated invoice.</p>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
