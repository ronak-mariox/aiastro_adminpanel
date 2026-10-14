import { cn } from '@/lib/utils'

export type TabItem<K extends string> = { key: K; label: string; count?: number }

export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line/90', className)}>
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[0.88rem] font-semibold whitespace-nowrap transition',
            value === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-gold-700',
          )}>
          {t.label}
          {t.count !== undefined && (
            <span className={cn('rounded-md px-1.5 py-px text-[11px] font-bold', value === t.key ? 'bg-brand-gradient text-white' : 'bg-[#F1F5F9] text-muted')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Compact pill switcher for filters inside cards. */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="inline-flex rounded-[10px] bg-[#F1F5F9]/80 p-1">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[0.78rem] font-semibold transition',
            value === o.key ? 'bg-white text-brand-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-muted hover:text-ink',
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
