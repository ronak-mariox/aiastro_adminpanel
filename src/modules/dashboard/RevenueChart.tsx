import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, Segmented } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import type { RevenuePoint } from './data'

const SERIES = [
  { key: 'consultations', name: 'Consultations', color: '#c8102e' },
  { key: 'pujas', name: 'Pujas', color: '#e9832b' },
  { key: 'store', name: 'Store', color: '#f2b705' },
] as const

type Range = '7' | '14' | '30'

const compact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n / 1000)}k`)

export default function RevenueChart({ trend }: { trend: RevenuePoint[] }) {
  const [range, setRange] = useState<Range>('30')
  const data = useMemo(() => trend.slice(-Number(range)), [trend, range])
  const total = data.reduce((a, p) => a + p.consultations + p.pujas + p.store, 0)

  return (
    <Card>
      <CardHeader
        title="Revenue trend"
        subtitle={`GMV ${formatINR(total)} in the last ${range} days`}
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
      <div className="h-80 px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map(s => (
                <linearGradient key={s.key} id={`rev-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#717182' }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={v => compact(Number(v))} tick={{ fontSize: 11, fill: '#717182' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip formatter={v => formatINR(Number(v))} contentStyle={{ borderRadius: 12, borderColor: '#ece9ea', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            {SERIES.map(s => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#rev-${s.key})`} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
