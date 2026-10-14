import { useState } from 'react'
import { Gem } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL } from './data'
import type { OrderStatus, PaymentStatus, ProductStatus } from './types'

/** Product image with a branded fallback tile when the URL is missing or fails. */
export function ProductThumb({ src, name, size = 44, className }: { src?: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (src && !failed)
    return <img src={src} alt={name} style={style} onError={() => setFailed(true)} className={cn('shrink-0 rounded-xl border border-line object-cover', className)} />
  return (
    <span style={style} className={cn('inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-gold-100 text-brand-600', className)}>
      <Gem className="size-1/2" />
    </span>
  )
}

const ORDER_TONES: Record<OrderStatus, Tone> = {
  processing: 'amber',
  packed: 'purple',
  transit: 'blue',
  delivered: 'green',
  cancelled: 'red',
  returned: 'gray',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={ORDER_TONES[status]} dot>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  )
}

const PAY_TONES: Record<PaymentStatus, Tone> = { paid: 'green', pending: 'amber', refunded: 'gray', failed: 'red', cancelled: 'gray' }

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAY_TONES[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

const PRODUCT_TONES: Record<ProductStatus, Tone> = { active: 'green', draft: 'gray', 'out of stock': 'red' }

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge tone={PRODUCT_TONES[status]} dot>
      {status === 'out of stock' ? 'Out of stock' : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

/** Toggleable pill group for multi-select fields (purposes, zodiac, badges…). */
export function ChipSelect<V extends string | number>({ options, value, onChange }: { options: readonly V[]; value: V[]; onChange: (v: V[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = value.includes(o)
        return (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              on ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line bg-white text-muted hover:border-brand-200 hover:text-ink',
            )}>
            {String(o)}
          </button>
        )
      })}
    </div>
  )
}
