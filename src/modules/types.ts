import type { LucideIcon } from 'lucide-react'
import type { RouteObject } from 'react-router-dom'

export type NavGroup = 'Overview' | 'Partners' | 'Operations' | 'Store' | 'Finance' | 'Growth' | 'Content' | 'Support' | 'System'

export const NAV_GROUPS: NavGroup[] = ['Overview', 'Partners', 'Operations', 'Store', 'Finance', 'Growth', 'Content', 'Support', 'System']

export type NavItem = {
  label: string
  /** Absolute path, e.g. '/astrologers'. */
  path: string
  icon: LucideIcon
  group: NavGroup
  /** Small count pill (e.g. pending approvals); read on each render. */
  badge?: () => number
  /** Backend permission(s) needed to see this item (any of them); hidden otherwise. */
  permission?: string | string[]
}

/**
 * Each feature folder (src/modules/<name>/index.tsx) exports one AdminModule.
 * `routes` paths are relative to the app root ('astrologers', 'astrologers/:id').
 */
export type AdminModule = {
  nav: NavItem[]
  routes: RouteObject[]
}
