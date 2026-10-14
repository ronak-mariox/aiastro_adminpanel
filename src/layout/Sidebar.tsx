import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Cog,
  Handshake,
  LifeBuoy,
  Megaphone,
  Newspaper,
  ShoppingBag,
  Sparkles,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import emblem from '@/assets/vedrashi-emblem.png'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { modules } from '@/modules/registry'
import { NAV_GROUPS, type NavGroup, type NavItem } from '@/modules/types'

const allNavItems = modules.flatMap(m => m.nav)

// "Overview" items sit at the top level; every other group is a collapsible section.
const GROUP_META: Record<Exclude<NavGroup, 'Overview'>, { label: string; icon: LucideIcon }> = {
  Partners: { label: 'Partners', icon: Handshake },
  Operations: { label: 'Operations', icon: Workflow },
  Store: { label: 'Ecommerce', icon: ShoppingBag },
  Finance: { label: 'Finance', icon: Wallet },
  Growth: { label: 'Marketing', icon: Megaphone },
  Content: { label: 'Content', icon: Newspaper },
  Support: { label: 'Support', icon: LifeBuoy },
  System: { label: 'System', icon: Cog },
}

export const APP_VERSION = '2.0'
const OPEN_KEY = 'sidebar_open_submenu'

function readOpen(): string | null {
  try {
    const v = localStorage.getItem(OPEN_KEY)
    return v !== null ? (JSON.parse(v) as string | null) : 'Partners'
  } catch {
    return 'Partners'
  }
}

const isActivePath = (pathname: string, path: string) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`))

function Count({ n, light }: { n: number; light?: boolean }) {
  if (n <= 0) return null
  return (
    <span className={cn('ml-auto rounded-md px-1.5 py-px text-[11px] font-bold', light ? 'bg-white/25 text-white' : 'bg-[rgba(200,16,46,0.1)] text-brand-600')}>
      {n}
    </span>
  )
}

const activeLink = 'bg-brand-gradient !text-white font-semibold shadow-[0_4px_15px_rgba(200,16,46,0.32)]'

function TopLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const count = item.badge?.() ?? 0
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-[10px] py-[9px] text-[0.9rem] font-medium text-body transition-all duration-200',
          collapsed ? 'justify-center px-2' : 'px-3',
          isActive ? activeLink : 'hover:bg-gold-500/8 hover:text-gold-700',
        )
      }>
      {({ isActive }) => (
        <>
          <item.icon className="size-5 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && <Count n={count} light={isActive} />}
          {collapsed && count > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-600" />}
        </>
      )}
    </NavLink>
  )
}

function SubLink({ item, onNavigate, flyout }: { item: NavItem; onNavigate?: () => void; flyout?: boolean }) {
  const count = item.badge?.() ?? 0
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[0.85rem] font-medium transition-all duration-200',
          flyout ? 'text-body' : 'text-muted',
          isActive ? cn(activeLink, 'shadow-[0_4px_12px_rgba(200,16,46,0.3)]') : 'hover:bg-gold-500/8 hover:text-gold-700',
          flyout && !isActive && 'hover:translate-x-0.5',
        )
      }>
      {({ isActive }) => (
        <>
          <item.icon className="size-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
          <Count n={count} light={isActive} />
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onNavigate, onExpand, isMobile }: { collapsed: boolean; onNavigate?: () => void; onExpand?: () => void; isMobile?: boolean }) {
  const { pathname } = useLocation()
  const [openGroup, setOpenGroup] = useState<string | null>(readOpen)
  const [hoverGroup, setHoverGroup] = useState<string | null>(null)
  const { can } = useAuth()
  const navItems = allNavItems.filter(i => can(i.permission))
  // Badges read live collections; re-render now and then so their counts follow the API.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  const toggle = (g: string) => {
    if (collapsed) {
      onExpand?.()
      setOpenGroup(g)
      return
    }
    setOpenGroup(cur => {
      const next = cur === g ? null : g
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-line/85 bg-white">
      <div className={cn('flex h-[68px] shrink-0 items-center border-b border-line/85', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        <NavLink to="/" onClick={onNavigate} className="flex items-center gap-3">
          <img
            src={emblem}
            alt="VedRashi"
            className={cn('object-contain drop-shadow-[0_2px_6px_rgba(200,16,46,0.2)] transition-all', collapsed ? 'size-10' : 'size-[42px]')}
          />
          {!collapsed && (
            <div className="leading-tight whitespace-nowrap">
              <p className="text-[1.08rem] font-extrabold tracking-[0.02em] text-ink">VedRashi</p>
              <p className="text-[0.68rem] font-semibold tracking-[0.06em] text-gold-700 uppercase">Admin Console</p>
            </div>
          )}
        </NavLink>
        {isMobile && (
          <button type="button" onClick={onNavigate} className="rounded-lg p-1.5 text-muted hover:bg-soft" aria-label="Close menu">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className={cn('flex flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto', collapsed ? 'p-2' : 'p-3.5')}>
        {navItems
          .filter(i => i.group === 'Overview')
          .map(item => (
            <TopLink key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}

        {NAV_GROUPS.filter((g): g is Exclude<NavGroup, 'Overview'> => g !== 'Overview').map(group => {
          const items = navItems.filter(i => i.group === group)
          if (!items.length) return null
          const meta = GROUP_META[group]
          const active = items.some(i => isActivePath(pathname, i.path))
          const open = openGroup === group
          const pending = items.reduce((n, i) => n + (i.badge?.() ?? 0), 0)

          if (collapsed) {
            return (
              <div key={group} className="relative" onMouseEnter={() => setHoverGroup(group)} onMouseLeave={() => setHoverGroup(null)}>
                <button
                  type="button"
                  onClick={() => toggle(group)}
                  className={cn(
                    'relative flex w-full items-center justify-center rounded-[10px] px-2 py-[9px] transition-all',
                    active ? 'bg-gold-500/12 text-gold-700' : 'text-body hover:bg-gold-500/14 hover:text-gold-700',
                  )}
                  aria-label={meta.label}>
                  <meta.icon className="size-5" />
                  {pending > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-600" />}
                </button>
                {hoverGroup === group && (
                  <div className="fixed left-[86px] z-[1400] -mt-11 min-w-[215px] rounded-[14px] border border-line/95 bg-white p-2.5 shadow-[0_14px_34px_-4px_rgba(15,23,42,0.14),0_4px_16px_-2px_rgba(245,158,11,0.12)]">
                    <div className="mb-1 flex items-center gap-2 border-b border-line/80 px-2.5 pt-1 pb-2">
                      <span className="size-1.5 rounded-full bg-[linear-gradient(135deg,#C8102E,#F59E0B)] shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                      <span className="text-[0.76rem] font-bold tracking-[0.06em] text-gold-700 uppercase">{meta.label}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {items.map(item => (
                        <SubLink key={item.path} item={item} onNavigate={onNavigate} flyout />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggle(group)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[10px] px-3 py-[9px] text-[0.9rem] transition-all duration-200',
                  active ? 'bg-gold-500/8 font-semibold text-gold-700' : 'font-medium text-body hover:bg-gold-500/12 hover:text-gold-700',
                )}>
                <span className="flex items-center gap-3">
                  <meta.icon className="size-5" />
                  {meta.label}
                </span>
                <span className="flex items-center gap-1.5 text-subtle">
                  {!open && pending > 0 && <Count n={pending} />}
                  {open ? <ChevronDown className="size-[18px]" /> : <ChevronRight className="size-[18px]" />}
                </span>
              </button>
              {open && (
                <div className="relative flex flex-col gap-1 py-1 pr-0.5 pl-[18px] before:absolute before:top-2 before:bottom-2 before:left-[20px] before:w-[1.5px] before:bg-line/90">
                  {items.map(item => (
                    <div key={item.path} className="pl-2.5">
                      <SubLink item={item} onNavigate={onNavigate} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="flex shrink-0 items-center gap-1.5 border-t border-line/85 px-4 py-3 text-subtle">
          <Sparkles className="size-[13px] text-gold-600" />
          <span className="text-[0.74rem] font-semibold">VedRashi v{APP_VERSION}</span>
        </div>
      )}
    </div>
  )
}
