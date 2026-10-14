import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Download, Flame, Plus, ShieldAlert, Star } from 'lucide-react'
import { panditsDb, type Pandit } from '@/data'
import { Avatar, Badge, Button, DataTable, PageHeader, StatCard, StatusBadge, type Column, type Filter } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatINR, formatNumber } from '@/lib/utils'
import { errorMessage, fileUrl } from '@/lib/api'
import { exportCsv } from '../shared/csv'
import { PanditFormModal } from './PanditFormModal'

export default function PanditsPage() {
  const navigate = useNavigate()
  const { items, loading, error } = useCollection(panditsDb)
  const [adding, setAdding] = useState(false)

  const cities = [...new Set(items.map(p => p.city).filter(Boolean))].sort()
  const accepting = items.filter(p => p.status === 'active' && p.acceptingBookings).length
  const pendingVerification = items.filter(p => p.kyc === 'pending' || p.certificates.some(c => c.status === 'under review')).length
  const rated = items.filter(p => p.rating > 0)
  const avgRating = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0

  const columns: Column<Pandit>[] = [
    {
      key: 'name',
      header: 'Pandit',
      sortValue: p => p.name,
      render: p => (
        <div className="flex items-center gap-3">
          <Avatar name={p.name.replace('Pandit ', '')} src={p.photoUrl ? fileUrl(p.photoUrl) : undefined} />
          <div>
            <p className="font-medium text-ink">{p.name}</p>
            <p className="text-xs text-muted">
              {p.code || p.id} · {p.experienceYears} yrs exp
            </p>
          </div>
        </div>
      ),
    },
    { key: 'city', header: 'City', sortValue: p => p.city, render: p => <span>{p.city || '—'} {p.serviceRadiusKm > 0 && <span className="text-xs text-muted">· {p.serviceRadiusKm} km</span>}</span> },
    { key: 'pujas', header: 'Expertise', render: p => <span className="text-xs text-muted">{p.expertise.slice(0, 3).join(', ')}{p.expertise.length > 3 ? ` +${p.expertise.length - 3}` : ''}</span> },
    { key: 'fee', header: 'Base fee', align: 'right', sortValue: p => p.baseFee, render: p => formatINR(p.baseFee) },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      sortValue: p => p.rating,
      render: p => (
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-gold-400 text-gold-400" />
          {p.rating.toFixed(1)}
        </span>
      ),
    },
    { key: 'bookings', header: 'Bookings', align: 'right', sortValue: p => p.bookings, render: p => formatNumber(p.bookings) },
    { key: 'online', header: 'Online puja', render: p => (p.onlinePuja ? <Badge tone="blue">Yes</Badge> : <Badge>No</Badge>) },
    { key: 'kyc', header: 'KYC', render: p => <StatusBadge status={p.kyc} /> },
    { key: 'status', header: 'Status', sortValue: p => p.status, render: p => <StatusBadge status={p.status} /> },
  ]

  const filters: Filter<Pandit>[] = [
    { key: 'status', label: 'Status', options: ['Active', 'Pending', 'Suspended', 'Rejected'], match: (p, v) => p.status === v.toLowerCase() },
    { key: 'city', label: 'City', options: cities, match: (p, v) => p.city === v },
    { key: 'kyc', label: 'KYC', options: ['Verified', 'Pending', 'Rejected'], match: (p, v) => p.kyc === v.toLowerCase() },
    { key: 'online', label: 'Online puja', options: ['Yes', 'No'], match: (p, v) => p.onlinePuja === (v === 'Yes') },
  ]

  const download = () =>
    exportCsv('pandits.csv', items, [
      { header: 'Code', value: p => p.code ?? p.id },
      { header: 'Name', value: p => p.name },
      { header: 'Phone', value: p => p.phone },
      { header: 'Email', value: p => p.email },
      { header: 'City', value: p => p.city },
      { header: 'Radius km', value: p => p.serviceRadiusKm },
      { header: 'Base fee', value: p => p.baseFee },
      { header: 'Expertise', value: p => p.expertise.join('; ') },
      { header: 'Online puja', value: p => (p.onlinePuja ? 'Yes' : 'No') },
      { header: 'Rating', value: p => p.rating },
      { header: 'Bookings', value: p => p.bookings },
      { header: 'Earnings', value: p => p.earnings },
      { header: 'Status', value: p => p.status },
      { header: 'KYC', value: p => p.kyc },
    ])

  return (
    <>
      <PageHeader
        title="Pandits"
        subtitle="Puja partners on the Pandit app — verification, service area and bookings."
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={download}>
              Export
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              Add pandit
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pandits" value={items.length} icon={Flame} hint={`${cities.length} cities`} />
        <StatCard label="Accepting bookings" value={accepting} icon={CalendarCheck} tone="green" hint={`${items.filter(p => p.onlinePuja).length} offer online puja`} />
        <StatCard label="Pending verification" value={pendingVerification} icon={ShieldAlert} tone="gold" hint="KYC or certificates" />
        <StatCard label="Average rating" value={avgRating.toFixed(2)} icon={Star} tone="purple" hint={`${formatNumber(items.reduce((s, p) => s + p.bookings, 0))} bookings`} />
      </div>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={p => p.id}
        loading={loading}
        searchText={p => `${p.name} ${p.id} ${p.phone} ${p.email} ${p.city} ${p.expertise.join(' ')}`}
        searchPlaceholder="Search name, city, puja…"
        filters={filters}
        onRowClick={p => navigate(`/pandits/${p.id}`)}
        empty={error ? `Could not load pandits — ${errorMessage(error)}` : undefined}
      />

      <PanditFormModal open={adding} onClose={() => setAdding(false)} onSaved={id => navigate(`/pandits/${id}`)} />
    </>
  )
}
