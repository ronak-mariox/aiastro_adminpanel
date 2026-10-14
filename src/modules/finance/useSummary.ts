import { useEffect, useState } from 'react'
import { fetchSummary, type FinanceSummary } from './api'

/** Revenue summary (GET /admin/finance/summary) for the chart and commission KPIs. */
export function useFinanceSummary(days = 30) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    let alive = true
    fetchSummary(days)
      .then(s => alive && setSummary(s))
      .catch(e => alive && setError(e))
    return () => {
      alive = false
    }
  }, [days])
  return { summary, error }
}
