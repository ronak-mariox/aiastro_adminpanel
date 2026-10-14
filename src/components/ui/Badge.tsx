import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'gray' | 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'brand' | 'orange'

const tones: Record<Tone, string> = {
  gray: 'bg-[#F1F5F9] text-body',
  red: 'bg-[rgba(239,68,68,0.1)] text-[#DC2626]',
  green: 'bg-[rgba(16,185,129,0.1)] text-[#059669]',
  amber: 'bg-[rgba(245,158,11,0.12)] text-gold-700',
  blue: 'bg-[#EFF6FF] text-[#2563EB]',
  purple: 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]',
  brand: 'bg-[rgba(200,16,46,0.08)] text-brand-600',
  orange: 'bg-[rgba(249,115,22,0.1)] text-[#EA580C]',
}

export function Badge({ tone = 'gray', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[0.75rem] font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Shared status → colour mapping so every module renders statuses consistently. */
const STATUS_TONES: Record<string, Tone> = {
  active: 'green', approved: 'green', verified: 'green', completed: 'green', delivered: 'green', paid: 'green',
  success: 'green', resolved: 'green', published: 'green', online: 'green', confirmed: 'green', credited: 'green',
  pending: 'amber', 'under review': 'amber', review: 'amber', processing: 'amber', upcoming: 'blue', scheduled: 'blue',
  initiated: 'amber', open: 'amber', draft: 'gray', busy: 'orange', 'in progress': 'purple', 'en route': 'orange',
  arrived: 'purple', transit: 'blue', shipped: 'blue', ongoing: 'purple', live: 'red',
  rejected: 'red', blocked: 'red', cancelled: 'red', failed: 'red', suspended: 'red', refunded: 'gray',
  offline: 'gray', inactive: 'gray', expired: 'gray', closed: 'gray', missed: 'red',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONES[status.toLowerCase()] ?? 'gray'
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}
