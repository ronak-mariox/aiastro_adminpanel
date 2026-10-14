import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Avatar, Card, CardHeader, StatusBadge } from '@/components/ui'
import { astrologersDb, panditsDb } from '@/data'
import { useCollection } from '@/lib/store'
import { formatINR, formatNumber } from '@/lib/utils'

type Row = { id: string; name: string; sub: string; rating: number; volume: number; volumeLabel: string; earnings: number; status: string }

function PartnerTable({ title, subtitle, rows, base, loading }: { title: string; subtitle: string; rows: Row[]; base: string; loading: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Link to={base} className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70 text-left text-xs font-medium tracking-wide text-muted uppercase">
              <th className="px-5 py-2.5">#</th>
              <th className="px-2 py-2.5">Name</th>
              <th className="px-2 py-2.5">Rating</th>
              <th className="px-2 py-2.5 text-right">Volume</th>
              <th className="px-5 py-2.5 text-right">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-3.5">
                    <div className="h-4 animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                  No active partners yet
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-brand-50/40">
                  <td className="px-5 py-3 text-muted">{i + 1}</td>
                  <td className="px-2 py-3">
                    <Link to={`${base}/${r.id}`} className="flex items-center gap-2.5">
                      <Avatar name={r.name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:text-brand-600">{r.name}</span>
                        <span className="block truncate text-xs text-muted">{r.sub}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-gold-400 text-gold-400" />
                      {r.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">
                    {formatNumber(r.volume)} <span className="text-xs text-muted">{r.volumeLabel}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                    {formatINR(r.earnings)}
                    {r.status !== 'active' && <StatusBadge status={r.status} className="ml-2" />}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function TopPartners() {
  const astro = useCollection(astrologersDb)
  const pandits = useCollection(panditsDb)

  const astroRows: Row[] = astro.items
    .filter(a => a.status === 'active')
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      name: a.name,
      sub: [a.skills.slice(0, 2).join(', '), `${a.experienceYears} yrs`].filter(Boolean).join(' · '),
      rating: a.rating,
      volume: a.sessions,
      volumeLabel: 'sessions',
      earnings: a.earnings,
      status: a.status,
    }))

  const panditRows: Row[] = pandits.items
    .filter(p => p.status === 'active')
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      sub: [p.city, p.expertise.slice(0, 2).join(', ')].filter(Boolean).join(' · '),
      rating: p.rating,
      volume: p.bookings,
      volumeLabel: 'pujas',
      earnings: p.earnings,
      status: p.status,
    }))

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PartnerTable title="Top astrologers" subtitle="By lifetime earnings" rows={astroRows} base="/astrologers" loading={astro.loading} />
      <PartnerTable title="Top pandits" subtitle="By lifetime earnings" rows={panditRows} base="/pandits" loading={pandits.loading} />
    </div>
  )
}
