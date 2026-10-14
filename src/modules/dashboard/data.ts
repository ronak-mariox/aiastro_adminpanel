import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Platform overview from GET /admin/overview (backend services/adminOverview.service.js).

export type RevenuePoint = {
  date: string // ISO date (IST day)
  label: string // "12 Sep"
  consultations: number
  pujas: number
  store: number
  /** Platform share that day (commission on consultations/pujas + store sales). */
  platform: number
}

export type ActivityKind = 'consultation' | 'booking' | 'order' | 'signup' | 'payout' | 'approval' | 'refund' | 'review' | 'support'

export type Activity = {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  at: string // ISO datetime
  to?: string // admin route to open
}

export type Overview = {
  generatedAt: string
  revenueTrend: RevenuePoint[]
  live: {
    activeConsultations: number
    activeChat: number
    activeCall: number
    activeVideo: number
    astrologersOnline: number
    pujaBookingsToday: number
    pujaBookingsYesterday: number
    storeOrdersToday: number
    storeOrdersYesterday: number
    newUsersToday: number
    newUsersYesterday: number
  }
  queues: {
    pendingApprovals: number
    partnerOnboardings: number
    documentsPending: number
    payoutRequests: number
    payoutsDue: number
    refundRequests: number
    supportOpen: number
    flaggedReviews: number
    ordersToShip: number
  }
  consultationsByType: { chat: number; call: number; video: number }
  recentActivity: Activity[]
}

export const CONSULT_COLORS = { chat: '#c8102e', call: '#e9832b', video: '#ffd700' }

export const gmvOf = (p: RevenuePoint) => p.consultations + p.pujas + p.store

export const pctChange = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 1000) / 10 : 0)

/** Loads the overview and re-polls every minute while the dashboard is open. */
export function useOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .get<Overview>('/admin/overview', { days: 30 })
        .then(d => {
          if (!alive) return
          setData(d)
          setError(null)
        })
        .catch(e => alive && setError(e))
    load()
    const t = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return { data, error, loading: !data && !error }
}
