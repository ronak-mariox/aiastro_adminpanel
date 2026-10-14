import { useCallback, useEffect, useState } from 'react'
import { customersDb, toCustomer, type Customer } from '@/data'
import { api } from '@/lib/api'
import type { CustomerAction, CustomerBooking, CustomerConsultation, CustomerOrder, CustomerReview, PointsTxn, WalletTxn } from './types'

// Customer page data and actions, all against /admin/customers (backend routes/adminCustomers.routes.js).

export type CustomerHistory = {
  consultations: CustomerConsultation[]
  bookings: CustomerBooking[]
  orders: CustomerOrder[]
  wallet: WalletTxn[]
  points: PointsTxn[]
  reviews: CustomerReview[]
}

export type CustomerDetail = { customer: Customer; history: CustomerHistory; actions: CustomerAction[] }

/* eslint-disable @typescript-eslint/no-explicit-any */
type DetailBody = { customer: Record<string, any>; history: CustomerHistory; actions: CustomerAction[] }

const EMPTY_HISTORY: CustomerHistory = { consultations: [], bookings: [], orders: [], wallet: [], points: [], reviews: [] }

export async function fetchCustomerDetail(id: string): Promise<CustomerDetail> {
  const body = await api.get<DetailBody>(`/admin/customers/${id}`)
  return { customer: toCustomer(body.customer), history: { ...EMPTY_HISTORY, ...body.history }, actions: body.actions ?? [] }
}

/** Detail + history for one customer; `refresh()` after every change so the page shows the server's truth. */
export function useCustomerDetail(id: string | undefined) {
  // Keyed by id so switching customers never shows the previous one's data.
  const [state, setState] = useState<{ id: string; detail: CustomerDetail | null; error: unknown } | null>(null)

  /** `changed`: also re-fetch the customers list so its row (wallet, status…) follows. */
  const refresh = useCallback(
    async (changed = false) => {
      if (!id) return
      try {
        const detail = await fetchCustomerDetail(id)
        setState({ id, detail, error: null })
        if (changed) customersDb.refresh?.().catch(() => undefined)
      } catch (error) {
        setState(s => ({ id, detail: s?.id === id ? s.detail : null, error }))
      }
    },
    [id],
  )

  useEffect(() => {
    if (!id) return
    let alive = true
    fetchCustomerDetail(id)
      .then(detail => alive && setState({ id, detail, error: null }))
      .catch(error => alive && setState({ id, detail: null, error }))
    return () => {
      alive = false
    }
  }, [id])

  const current = state?.id === id ? state : null
  return { detail: current?.detail ?? null, loading: !current, error: current?.error ?? null, refresh }
}

export const customerActions = {
  setStatus: (id: string, status: Customer['status'], reason?: string) => api.patch(`/admin/customers/${id}/status`, { status, reason }),
  adjustWallet: (id: string, direction: 'credit' | 'debit', amount: number, reason: string) =>
    api.post(`/admin/customers/${id}/wallet`, { direction, amount, reason }),
  adjustPoints: (id: string, points: number, reason: string) => api.post(`/admin/customers/${id}/points`, { points, reason }),
  notify: (id: string, title: string, message: string, channels: string[]) => api.post(`/admin/customers/${id}/notify`, { title, message, channels }),
  /** `review.id` is "<kind>:<id>" (consultation | puja | product). */
  setReviewHidden: (reviewId: string, hidden: boolean) => {
    const [kind, rid] = reviewId.split(':')
    return api.patch(`/admin/reviews/${kind}/${rid}`, { hidden })
  },
}
