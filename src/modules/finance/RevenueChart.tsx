import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader, Segmented } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { INFLOW_TYPES } from './data'
import type { FinanceSummary } from './api'
import type { PaymentMethod, Transaction } from './types'

type Range = '7' | '14' | '30'

const dayKey = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })

/** Daily gateway volume vs platform commission, from GET /admin/finance/summary (30 days). */
export function RevenueChart({ summary }: { summary: FinanceSummary | null }) {
  const [range, setRange] = useState<Range>('14')

  const data = useMemo(() => {
    const days = summary?.days ?? []
    return days.slice(-Number(range)).map(d => ({
      day: dayKey(new Date(`${d.date}T00:00:00+05:30`)),
      volume: d.volume,
      commission: d.commission,
    }))
  }, [summary, range])

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Revenue"
        subtitle="Gateway volume vs platform commission (successful only)"
        action={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { key: '7', label: '7D' },
              { key: '14', label: '14D' },
              { key: '30', label: '30D' },
            ]}
          />
        }
      />
      <CardBody className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="finVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8102e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#c8102e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="finCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e9832b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#e9832b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
            />
            <Tooltip formatter={v => formatINR(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
            <Area type="monotone" dataKey="volume" name="Gateway volume" stroke="#c8102e" strokeWidth={2} fill="url(#finVolume)" />
            <Area type="monotone" dataKey="commission" name="Commission" stroke="#e9832b" strokeWidth={2} fill="url(#finCommission)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  UPI: '#c8102e',
  Card: '#e9832b',
  NetBanking: '#ffd700',
  Wallet: '#6b7280',
  COD: '#d1d5db',
  Gateway: '#9333ea',
}

export function MethodSplit({ txns }: { txns: Transaction[] }) {
  const rows = useMemo(() => {
    const totals = new Map<PaymentMethod, number>()
    for (const t of txns) {
      if (t.status !== 'success' || !INFLOW_TYPES.includes(t.type)) continue
      totals.set(t.method, (totals.get(t.method) ?? 0) + t.amount + t.gst)
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([method, value]) => ({ method, value, pct: (value / sum) * 100 }))
  }, [txns])

  return (
    <Card>
      <CardHeader title="Payment methods" subtitle="Share of successful inflow" />
      <CardBody className="space-y-4">
        {rows.map(r => (
          <div key={r.method}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{r.method}</span>
              <span className="text-muted">
                {formatINR(r.value)} · {r.pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full" style={{ width: `${r.pct}%`, background: METHOD_COLORS[r.method] }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No successful payments yet.</p>}
      </CardBody>
    </Card>
  )
}
