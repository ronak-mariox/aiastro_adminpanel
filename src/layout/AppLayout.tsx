import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { modules } from '@/modules/registry'
import AccountMenu from './AccountMenu'
import Sidebar from './Sidebar'

const navItems = modules.flatMap(m => m.nav)
const COLLAPSE_KEY = 'sidebar_collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  const current =
    navItems.find(i => (i.path === '/' ? pathname === '/' : pathname === i.path)) ??
    navItems.filter(i => i.path !== '/').find(i => pathname.startsWith(`${i.path}/`))
  const title = current?.label ?? 'Dashboard'

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    document.title = `${title} · VedRashi Admin`
  }, [title])

  const sidebarWidth = collapsed ? 'lg:w-[78px]' : 'lg:w-[250px]'
  const contentOffset = collapsed ? 'lg:pl-[78px]' : 'lg:pl-[250px]'

  return (
    <div className="min-h-full">
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:block', sidebarWidth)}>
        <Sidebar collapsed={collapsed} onExpand={() => setCollapsed(false)} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[250px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            <Sidebar collapsed={false} isMobile onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn('flex min-h-full min-w-0 flex-col overflow-x-clip transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]', contentOffset)}>
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-line/85 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-[10px] bg-gold-500/8 p-2 text-gold-700 transition hover:bg-gold-500/15 lg:hidden">
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle sidebar collapse"
              className="hidden rounded-[10px] bg-[#F1F5F9]/80 p-[7px] text-body transition hover:bg-gold-500/12 hover:text-gold-700 lg:flex">
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>
            <h1 className="truncate text-[1.2rem] font-bold tracking-[-0.01em] text-ink sm:text-[1.4rem]">{title}</h1>
          </div>
          <AccountMenu />
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-7">
          <div className="mx-auto max-w-[1400px] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
