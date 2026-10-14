import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}) {
  return (
    <div className="mb-5">
      {breadcrumbs && (
        <nav className="mb-2 flex items-center gap-1 text-[0.78rem] font-medium text-subtle">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" />}
              {b.to ? (
                <Link to={b.to} className="transition hover:text-gold-700">
                  {b.label}
                </Link>
              ) : (
                <span className="text-body">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* Top-level pages show their title in the app bar (like the deployed console);
              detail pages (with breadcrumbs) repeat the record name here. */}
          {breadcrumbs ? (
            <h1 className="flex items-center gap-2 text-[1.5rem] font-bold tracking-[-0.01em] text-ink">
              {title}
              <Sparkles className="size-4 text-gold-600" />
            </h1>
          ) : (
            <h2 className="sr-only">{title}</h2>
          )}
          {subtitle && (
            <p className={cn('text-[0.88rem] text-muted', breadcrumbs ? 'mt-1' : 'flex items-center gap-1.5 font-medium')}>
              {!breadcrumbs && <Sparkles className="size-3.5 text-gold-600" />}
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  )
}

// Dashboard stat card from the deployed console: tinted icon tile, large value, growth pill.
const STAT_TONES = {
  brand: { color: '#C8102E', bg: 'rgba(200, 16, 46, 0.1)', accent: '#C8102E' },
  gold: { color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)', accent: '#F59E0B' },
  green: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', accent: '#10B981' },
  blue: { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)', accent: '#3B82F6' },
  purple: { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)', accent: '#8B5CF6' },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  hint,
  tone = 'brand',
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  /** Percent change vs previous period; sign decides colour. */
  change?: number
  hint?: ReactNode
  tone?: keyof typeof STAT_TONES
}) {
  const t = STAT_TONES[tone]
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-5px_rgba(200,16,46,0.07),0_20px_40px_-10px_rgba(245,158,11,0.1)]">
      <span className="absolute inset-x-0 top-0 h-[3px] opacity-80" style={{ background: `linear-gradient(90deg, ${t.accent}, transparent)` }} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.85rem] font-semibold text-muted">{label}</p>
        {Icon && (
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: t.bg, color: t.color }}>
            <Icon className="size-[22px]" />
          </span>
        )}
      </div>
      <p className="mt-1 mb-2 text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.02em] text-ink">{value}</p>
      <div className="flex flex-wrap items-center gap-2 text-[0.76rem]">
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-[3px] font-semibold',
              change >= 0 ? 'bg-[rgba(16,185,129,0.1)] text-[#059669]' : 'bg-[rgba(239,68,68,0.1)] text-[#DC2626]',
            )}>
            {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {change >= 0 ? '+' : '-'}
            {Math.abs(change)}%
          </span>
        )}
        {hint && <span className="font-medium text-subtle">{hint}</span>}
      </div>
    </Card>
  )
}

/** Label/value rows for detail views. */
export function DetailList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
      {items.map(i => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[0.76rem] font-semibold tracking-[0.02em] text-subtle uppercase">{i.label}</dt>
          <dd className="mt-1 text-[0.9rem] font-medium break-words text-ink-2">{i.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {Icon && (
        <span className="mb-2 inline-flex size-14 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.12)] text-gold-700">
          <Icon className="size-7" />
        </span>
      )}
      <p className="text-[1rem] font-bold text-ink">{title}</p>
      {text && <p className="max-w-sm text-[0.85rem] text-muted">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
