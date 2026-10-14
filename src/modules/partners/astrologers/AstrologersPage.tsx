import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Plus, ShieldAlert, Sparkles, Star, Wifi } from 'lucide-react'
import { astrologersDb, type Astrologer } from '@/data'
import { Avatar, Badge, Button, DataTable, PageHeader, StatCard, StatusBadge, type Column, type Filter } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatINR, formatNumber } from '@/lib/utils'
import { errorMessage, fileUrl } from '@/lib/api'
import { ASTRO_LANGUAGES, ASTRO_SKILLS } from '../data'
import { exportCsv } from '../shared/csv'
import { AstrologerFormModal } from './AstrologerFormModal'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function AstrologersPage() {
  const navigate = useNavigate()
  const { items, loading, error } = useCollection(astrologersDb)
  const [adding, setAdding] = useState(false)

  const online = items.filter(a => a.availability === 'online').length
  const pendingKyc = items.filter(a => a.kyc === 'pending').length
  const rated = items.filter(a => a.rating > 0)
  const avgRating = rated.length ? rated.reduce((s, a) => s + a.rating, 0) / rated.length : 0

  const columns: Column<Astrologer>[] = [
    {
      key: 'name',
      header: 'Astrologer',
      sortValue: a => a.name,
      render: a => (
        <div className="flex items-center gap-3">
          <Avatar name={a.name} src={a.photoUrl ? fileUrl(a.photoUrl) : undefined} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-ink">
              {a.name}
              {a.badge && <Badge tone={a.badge === 'Celebrity' ? 'purple' : a.badge === 'Top Choice' ? 'brand' : 'amber'}>{a.badge}</Badge>}
            </p>
            <p className="text-xs text-muted">
              {[a.code || 'No astro code', a.city].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'skills', header: 'Skills', render: a => <span className="text-xs text-muted">{a.skills.slice(0, 3).join(', ')}</span> },
    { key: 'exp', header: 'Exp', sortValue: a => a.experienceYears, render: a => `${a.experienceYears} yrs`, align: 'right' },
    {
      key: 'price',
      header: 'Chat / Call',
      sortValue: a => a.pricing.chat,
      align: 'right',
      render: a => (
        <span className="whitespace-nowrap">
          ₹{a.pricing.chat} / ₹{a.pricing.call}
          <span className="text-xs text-muted">/min</span>
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      sortValue: a => a.rating,
      align: 'right',
      render: a => (
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-gold-400 text-gold-400" />
          {a.rating.toFixed(1)}
          <span className="text-xs text-muted">({formatNumber(a.reviews)})</span>
        </span>
      ),
    },
    { key: 'earn', header: 'Earnings', sortValue: a => a.earnings, align: 'right', render: a => formatINR(a.earnings) },
    { key: 'avail', header: 'Availability', render: a => <StatusBadge status={a.availability} /> },
    { key: 'kyc', header: 'KYC', render: a => <StatusBadge status={a.kyc} /> },
    { key: 'status', header: 'Status', sortValue: a => a.status, render: a => <StatusBadge status={a.status} /> },
  ]

  const filters: Filter<Astrologer>[] = [
    { key: 'status', label: 'Status', options: ['Active', 'Pending', 'Suspended', 'Rejected'], match: (a, v) => a.status === v.toLowerCase() },
    { key: 'kyc', label: 'KYC', options: ['Verified', 'Pending', 'Rejected'], match: (a, v) => a.kyc === v.toLowerCase() },
    { key: 'avail', label: 'Availability', options: ['Online', 'Busy', 'Offline'], match: (a, v) => a.availability === v.toLowerCase() },
    { key: 'skill', label: 'Skill', options: ASTRO_SKILLS, match: (a, v) => a.skills.includes(v) },
    { key: 'lang', label: 'Language', options: ASTRO_LANGUAGES, match: (a, v) => a.languages.includes(v) },
  ]

  const download = () =>
    exportCsv('astrologers.csv', items, [
      { header: 'Astro code', value: a => a.code },
      { header: 'Name', value: a => a.name },
      { header: 'Phone', value: a => a.phone },
      { header: 'Email', value: a => a.email },
      { header: 'City', value: a => a.city },
      { header: 'Skills', value: a => a.skills.join('; ') },
      { header: 'Languages', value: a => a.languages.join('; ') },
      { header: 'Chat ₹/min', value: a => a.pricing.chat },
      { header: 'Call ₹/min', value: a => a.pricing.call },
      { header: 'Video ₹/min', value: a => a.pricing.video },
      { header: 'Rating', value: a => a.rating },
      { header: 'Sessions', value: a => a.sessions },
      { header: 'Earnings', value: a => a.earnings },
      { header: 'Status', value: a => cap(a.status) },
      { header: 'KYC', value: a => cap(a.kyc) },
    ])

  return (
    <>
      <PageHeader
        title="Astrologers"
        subtitle="Consultation partners on the Astro app — onboarding, KYC, pricing and performance."
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={download}>
              Export
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              Add astrologer
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total astrologers" value={formatNumber(items.length)} icon={Sparkles} hint={`${items.filter(a => a.status === 'active').length} active`} />
        <StatCard label="Online now" value={online} icon={Wifi} tone="green" hint={`${items.filter(a => a.availability === 'busy').length} in a session`} />
        <StatCard label="Pending KYC" value={pendingKyc} icon={ShieldAlert} tone="gold" hint="Awaiting document review" />
        <StatCard label="Average rating" value={avgRating.toFixed(2)} icon={Star} tone="purple" hint={`${formatNumber(items.reduce((s, a) => s + a.reviews, 0))} reviews`} />
      </div>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={a => a.id}
        loading={loading}
        searchText={a => `${a.name} ${a.id} ${a.code} ${a.phone} ${a.email} ${a.city}`}
        searchPlaceholder="Search name, ID, phone…"
        filters={filters}
        onRowClick={a => navigate(`/astrologers/${a.id}`)}
        empty={error ? `Could not load astrologers — ${errorMessage(error)}` : undefined}
      />

      <AstrologerFormModal open={adding} onClose={() => setAdding(false)} onSaved={id => navigate(`/astrologers/${id}`)} />
    </>
  )
}
