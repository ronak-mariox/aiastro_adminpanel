import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { CONSULT_COLORS, type Overview } from './data'

export default function ConsultTypeChart({ mix }: { mix: Overview['consultationsByType'] }) {
  const consultationsByType = [
    { name: 'Chat', value: mix.chat, color: CONSULT_COLORS.chat },
    { name: 'Call', value: mix.call, color: CONSULT_COLORS.call },
    { name: 'Video', value: mix.video, color: CONSULT_COLORS.video },
  ].filter(d => d.name !== 'Video' || d.value > 0)
  const total = consultationsByType.reduce((a, d) => a + d.value, 0)
  // An all-zero pie draws nothing; show one neutral ring until there is data.
  const pieData = total ? consultationsByType : [{ name: 'No sessions', value: 1, color: '#ece9ea' }]
  return (
    <Card>
      <CardHeader title="Consultations by type" subtitle="Last 30 days" />
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={total ? 2 : 0} stroke="none">
              {pieData.map(d => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={v => formatNumber(Number(v))} contentStyle={{ borderRadius: 12, borderColor: '#ece9ea', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{formatNumber(total)}</span>
          <span className="text-xs text-muted">sessions</span>
        </div>
      </div>
      <ul className="space-y-2 px-5 pb-5">
        {consultationsByType.map(d => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted">{d.name}</span>
            <span className="ml-auto font-medium">{formatNumber(d.value)}</span>
            <span className="w-12 text-right text-xs text-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
