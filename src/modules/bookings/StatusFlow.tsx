import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { flowFor } from './pricing'
import type { Booking } from './types'

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Horizontal stepper for upcoming → en route → arrived → in progress → completed. */
export default function StatusFlow({ booking }: { booking: Booking }) {
  const flow = flowFor(booking.mode)
  const cancelled = booking.status === 'cancelled'
  const current = cancelled ? -1 : flow.indexOf(booking.status)

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[460px] items-start">
        {flow.map((s, i) => {
          const done = i < current || (i === current && s === 'completed')
          const active = i === current && s !== 'completed'
          return (
            <li key={s} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={cn('h-0.5 flex-1', i === 0 ? 'invisible' : i <= current ? 'bg-brand-600' : 'bg-line')} />
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    done && 'border-brand-600 bg-brand-600 text-white',
                    active && 'border-brand-600 bg-white text-brand-600 ring-4 ring-brand-100',
                    !done && !active && 'border-line bg-white text-muted',
                  )}>
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn('h-0.5 flex-1', i === flow.length - 1 ? 'invisible' : i < current ? 'bg-brand-600' : 'bg-line')} />
              </div>
              <span className={cn('mt-2 text-xs', active || done ? 'font-medium text-ink' : 'text-muted')}>{label(s)}</span>
            </li>
          )
        })}
      </ol>
      {cancelled && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <X className="size-4" /> Booking cancelled{booking.cancellation ? ` by ${booking.cancellation.by} — ${booking.cancellation.reason}` : ''}
        </p>
      )}
    </div>
  )
}
