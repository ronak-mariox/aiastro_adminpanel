import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn('rounded-2xl border border-line/90 bg-white shadow-card', className)} />
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line/80 px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-[1.05rem] font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[0.82rem] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn('p-5', className)} />
}
