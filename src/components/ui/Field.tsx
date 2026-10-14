import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// 1.5px slate border, amber focus ring — matches the console's MuiOutlinedInput override.
const control =
  'w-full rounded-[10px] border-[1.5px] border-line bg-white px-3.5 text-[0.9rem] text-ink outline-none transition placeholder:text-subtle hover:border-[#CBD5E1] focus:border-gold-500 focus:ring-[3px] focus:ring-gold-500/18 disabled:bg-soft'

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-[0.85rem] font-semibold text-ink-2">
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </span>
  )
}

type Wrap = { label?: ReactNode; hint?: ReactNode; error?: string }

export function Input({ label, hint, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & Wrap) {
  return (
    <label className="block">
      {label && <Label hint={hint}>{label}</Label>}
      <input {...rest} className={cn(control, 'h-[42px]', error && 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/18', className)} />
      {error && <span className="mt-1 ml-0.5 block text-[0.74rem] font-medium text-[#EF4444]">{error}</span>}
    </label>
  )
}

export function Textarea({ label, hint, error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap) {
  return (
    <label className="block">
      {label && <Label hint={hint}>{label}</Label>}
      <textarea rows={4} {...rest} className={cn(control, 'py-2.5', error && 'border-[#EF4444]', className)} />
      {error && <span className="mt-1 ml-0.5 block text-[0.74rem] font-medium text-[#EF4444]">{error}</span>}
    </label>
  )
}

export function Select({
  label,
  hint,
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & Wrap & { options: (string | { label: string; value: string })[] }) {
  return (
    <label className="block">
      {label && <Label hint={hint}>{label}</Label>}
      <select {...rest} className={cn(control, 'h-[42px] pr-8 font-medium', className)}>
        {options.map(o => {
          const opt = typeof o === 'string' ? { label: o, value: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand-gradient' : 'bg-[#CBD5E1]')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  )
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <svg className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input {...rest} className={cn(control, 'h-[42px] rounded-xl bg-soft pl-9 focus:bg-white')} />
    </div>
  )
}
