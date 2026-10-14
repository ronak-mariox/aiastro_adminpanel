import { useEffect, useRef, useState } from 'react'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export default function AccountMenu() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const name = admin?.name ?? 'Admin'

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="rounded-full border-2 border-gold-500/35 p-[3px] transition hover:border-gold-500 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]">
        <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-full text-[0.95rem] font-bold text-white">{name.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-3 w-[220px] rounded-[14px] border border-line/85 bg-white p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_16px_-6px_rgba(245,158,11,0.1)]">
          <div className="px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[0.9rem] font-bold text-ink">
              <ShieldCheck className="size-[17px] text-gold-700" />
              {name}
            </p>
            <p className="mt-0.5 truncate text-[0.76rem] text-muted">{admin?.email ?? ''}</p>
          </div>
          <div className="my-1 border-t border-line/80" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/admins')
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.86rem] font-medium text-ink-2 transition hover:bg-gold-500/8 hover:text-gold-700">
            <UserRound className="size-[18px] text-body" />
            Profile
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.86rem] font-semibold text-[#EF4444] transition hover:bg-[rgba(239,68,68,0.08)]">
            <LogOut className="size-[18px]" />
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
