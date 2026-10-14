import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type Size = 'sm' | 'md' | 'lg'

// Mirrors the deployed console's MUI button overrides (gradient + lift on hover).
const variants: Record<Variant, string> = {
  primary: 'bg-brand-gradient text-white shadow-brand hover:bg-brand-gradient-hover hover:-translate-y-px active:translate-y-0',
  secondary: 'border-[1.5px] border-gold-500 bg-transparent text-gold-600 hover:bg-gold-500/8 hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
  outline: 'border-[1.5px] border-[#CBD5E1] bg-white text-muted hover:border-subtle hover:bg-soft',
  ghost: 'text-body hover:bg-gold-500/8 hover:text-gold-700',
  danger: 'bg-[#EF4444] text-white shadow-[0_6px_18px_-3px_rgba(239,68,68,0.35)] hover:bg-[#DC2626] hover:-translate-y-px',
  success: 'bg-[#10B981] text-white shadow-[0_6px_18px_-3px_rgba(16,185,129,0.35)] hover:bg-[#059669] hover:-translate-y-px',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8rem] gap-1.5',
  md: 'h-10 px-4 text-[0.88rem] gap-2',
  lg: 'h-12 px-6 text-[0.95rem] gap-2',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] font-semibold tracking-[0.015em] whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[10px] text-body transition hover:bg-gold-500/12 hover:text-gold-700',
        className,
      )}
    />
  )
}
