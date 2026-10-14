import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { billing } from './helpers'
import type { Consultation } from './types'

/** Gross session revenue for the last 14 days, split by consultation type. */
export default function RevenueChart({ rows, now }: { rows: Consultation[]; now: number }) {
  const data = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (13 - i))
      return { key: d.toDateString(), label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), chat: 0, call: 0, video: 0 }
    })
    for (const c of rows) {
      if (c.status === 'missed' || c.status === 'cancelled') continue
      const day = days.find(d => d.key === new Date(c.startedAt).toDateString())
      if (day) day[c.type] += billing(c, now).gross
    }
    return days
  }, [rows, now])

  return (
    <Card>
      <CardHeader title="Session revenue" subtitle="Last 14 days · gross (charges + gifts)" />
      <CardBody className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`} />
            <Tooltip formatter={v => formatINR(Number(v))} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="chat" name="Chat" stackId="a" fill="#c8102e" />
            <Bar dataKey="call" name="Call" stackId="a" fill="#e9832b" />
            <Bar dataKey="video" name="Video" stackId="a" fill="#ffd700" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}
