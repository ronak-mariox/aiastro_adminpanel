import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { toDateKey } from './pricing'
import type { Booking } from './types'

/** Scheduled pujas for the next 14 days (excluding cancelled). */
export default function BookingsChart({ rows }: { rows: Booking[] }) {
  const [today] = useState(() => new Date())
  const data = useMemo(() => {
    const start = today
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const key = toDateKey(d)
      const day = rows.filter(b => b.date === key && b.status !== 'cancelled')
      return {
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        assigned: day.filter(b => b.panditId).length,
        unassigned: day.filter(b => !b.panditId).length,
      }
    })
  }, [rows, today])

  return (
    <Card>
      <CardHeader title="Schedule load" subtitle="Pujas booked for the next 14 days" />
      <CardBody className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="assigned" name="Pandit assigned" stackId="a" fill="#c8102e" />
            <Bar dataKey="unassigned" name="Needs pandit" stackId="a" fill="#ffd700" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}
