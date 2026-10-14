import { cn, formatDateTime } from '@/lib/utils'

export type TimelineEvent = { label: string; at?: string; note?: string; tone?: 'default' | 'success' | 'danger' | 'live' }

const dot = { default: 'bg-gray-300', success: 'bg-emerald-500', danger: 'bg-red-500', live: 'bg-brand-600 animate-pulse' }

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {events.map((e, i) => (
        <li key={`${e.label}-${i}`} className="relative">
          <span className={cn('absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-white', dot[e.tone ?? 'default'])} />
          <p className="text-sm font-medium">{e.label}</p>
          {e.at && <p className="text-xs text-muted">{formatDateTime(e.at)}</p>}
          {e.note && <p className="mt-0.5 text-xs text-muted">{e.note}</p>}
        </li>
      ))}
    </ol>
  )
}
