import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatINR = (n: number) => inr.format(Number.isFinite(n) ? n : 0)

export const formatNumber = (n: number) => new Intl.NumberFormat('en-IN').format(Number.isFinite(n) ? n : 0)

const validDate = (iso: string | null | undefined) => !!iso && !Number.isNaN(new Date(iso).getTime())

export const formatDate = (iso: string) =>
  !validDate(iso) ? '—' : new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  !validDate(iso)
    ? '—'
    : new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('')

/** Deterministic id for newly created mock records. */
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase()}`
