import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from './Button'

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: Props) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]" onClick={onClose} />
      <div role="dialog" aria-modal className={cn('relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[18px] border border-line/85 bg-white shadow-pop', widths[size])}>
        <div className="bg-brand-gradient h-1 shrink-0" />
        <div className="flex items-start justify-between gap-4 border-b border-line/80 px-6 py-4">
          <div>
            <h2 className="text-[1.1rem] font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[0.82rem] text-muted">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-[#F1F5F9] bg-soft/60 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

/** Right-side panel for record details. */
export function Drawer({ open, onClose, title, subtitle, children, footer }: Omit<Props, 'size'>) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-xl flex-col border-l border-line/85 bg-white shadow-pop">
        <div className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-line/85 bg-soft px-6">
          <div className="min-w-0">
            <h2 className="truncate text-[1.05rem] font-bold text-ink">{title}</h2>
            {subtitle && <p className="truncate text-[0.8rem] text-muted">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-[#F1F5F9] bg-soft/60 px-6 py-4">{footer}</div>}
      </aside>
    </div>
  )
}
