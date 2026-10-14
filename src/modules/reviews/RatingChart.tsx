import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { REVIEW_TARGET_TYPES, type Review } from './types'
import { Stars } from './Stars'

const typeLabel = { astrologer: 'Astrologers', pandit: 'Pandits', product: 'Products', consultation: 'Consultations' }

export default function RatingChart({ reviews }: { reviews: Review[] }) {
  const data = [5, 4, 3, 2, 1].map(star => ({ star: `${star} ★`, count: reviews.filter(r => r.rating === star).length, low: star <= 2 }))
  const byType = REVIEW_TARGET_TYPES.map(t => {
    const list = reviews.filter(r => r.targetType === t)
    return { type: t, count: list.length, avg: list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0 }
  })

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Rating distribution" subtitle="All reviews, including hidden and flagged" />
        <CardBody className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }} barCategoryGap={6}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="star" width={44} tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(200,16,46,0.05)' }}
                formatter={value => [`${String(value)} reviews`, 'Count']}
                contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fill: '#374151' }}>
                {data.map(d => (
                  <Cell key={d.star} fill={d.low ? '#e9832b' : '#c8102e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Average by type" />
        <CardBody className="space-y-4">
          {byType.map(t => (
            <div key={t.type} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{typeLabel[t.type]}</p>
                <p className="text-xs text-muted">{t.count} reviews</p>
              </div>
              <div className="flex items-center gap-2">
                <Stars value={t.avg} />
                <span className="w-8 text-right text-sm font-semibold">{t.avg.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
