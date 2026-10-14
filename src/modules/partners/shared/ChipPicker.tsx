import { Label } from '@/components/ui'
import { cn } from '@/lib/utils'

/** Multi-select rendered as toggleable chips. */
export function ChipPicker({ label, options, value, onChange, error }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o])
  return (
    <div>
      <Label hint={`${value.length} selected`}>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              value.includes(o) ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-muted hover:border-gray-300 hover:text-ink',
            )}>
            {o}
          </button>
        ))}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  )
}
