import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: Kind; message: string }

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {})

export const useToast = () => useContext(ToastContext)

const STYLES: Record<Kind, { title: string; accent: string; tile: string; border: string; icon: typeof Info; iconColor: string }> = {
  success: { title: 'Success', accent: '#10B981', tile: '#ECFDF5', border: 'rgba(16,185,129,0.25)', icon: CheckCircle2, iconColor: '#059669' },
  error: { title: 'Error', accent: '#EF4444', tile: '#FEF2F2', border: 'rgba(239,68,68,0.25)', icon: XCircle, iconColor: '#DC2626' },
  info: { title: 'Notice', accent: '#C8102E', tile: 'rgba(200,16,46,0.08)', border: 'rgba(200,16,46,0.2)', icon: Info, iconColor: '#C8102E' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: number) => setItems(list => list.filter(t => t.id !== id)), [])
  const toast = useCallback(
    (message: string, kind: Kind = 'success') => {
      const id = Date.now() + Math.random()
      setItems(list => [...list, { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 4000 : 3500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-[420px] flex-col gap-2.5">
        {items.map(t => {
          const st = STYLES[t.kind]
          const Icon = st.icon
          return (
            <div
              key={t.id}
              style={{ borderColor: st.border }}
              className="shadow-pop pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-white py-3 pr-3.5 pl-4">
              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: st.accent }} />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: st.tile }}>
                <Icon className="size-[22px]" style={{ color: st.iconColor }} />
              </span>
              <div className="min-w-0 flex-1 pt-px">
                <p className="text-[0.86rem] leading-tight font-bold text-ink">{st.title}</p>
                <p className="mt-0.5 text-[0.82rem] leading-snug break-words text-body">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mt-0.5 -mr-1 rounded-md p-1 text-subtle transition hover:bg-[#F1F5F9] hover:text-ink">
                <X className="size-[18px]" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
