import { Link } from 'react-router-dom'
import { Activity as ActivityIcon, Banknote, CalendarCheck, LifeBuoy, MessagesSquare, Package, ShieldCheck, Star, Undo2, UserPlus, type LucideIcon } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Activity, ActivityKind } from './data'

const KIND: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  consultation: { icon: MessagesSquare, tone: 'bg-brand-50 text-brand-600' },
  booking: { icon: CalendarCheck, tone: 'bg-orange-50 text-orange-600' },
  order: { icon: Package, tone: 'bg-sky-50 text-sky-600' },
  signup: { icon: UserPlus, tone: 'bg-emerald-50 text-emerald-600' },
  payout: { icon: Banknote, tone: 'bg-violet-50 text-violet-600' },
  approval: { icon: ShieldCheck, tone: 'bg-amber-50 text-amber-600' },
  refund: { icon: Undo2, tone: 'bg-gray-100 text-gray-600' },
  review: { icon: Star, tone: 'bg-gold-100 text-gold-500' },
  support: { icon: LifeBuoy, tone: 'bg-sky-50 text-sky-600' },
}

const ago = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export default function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <Card>
      <CardHeader title="Recent activity" subtitle="Across all apps" />
      {items.length === 0 && <EmptyState icon={ActivityIcon} title="No activity yet" text="New consultations, orders, bookings and sign-ups will show up here." />}
      <ul className="divide-y divide-line">
        {items.map(a => {
          const { icon: Icon, tone } = KIND[a.kind] ?? KIND.support
          const body = (
            <>
              <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-xl', tone)}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.title}</span>
                <span className="block truncate text-xs text-muted">{a.detail}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{ago(a.at)}</span>
            </>
          )
          return (
            <li key={a.id}>
              {a.to ? (
                <Link to={a.to} className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
