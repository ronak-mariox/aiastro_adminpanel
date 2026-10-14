import { Star } from 'lucide-react'
import type { Astrologer } from '@/data'
import { Badge, DataTable, StatusBadge, type Column } from '@/components/ui'
import { formatDateTime, formatINR } from '@/lib/utils'
import type { AstrologerProfile, AstroSession } from '../types'

export function AstroSessionsTab({ profile }: { astrologer: Astrologer; profile?: AstrologerProfile }) {
  const rows = profile?.sessions ?? []
  const columns: Column<AstroSession>[] = [
    { key: 'id', header: 'Session', render: s => <span className="font-mono text-xs">{s.id.slice(-8).toUpperCase()}</span> },
    { key: 'customer', header: 'Customer', sortValue: s => s.customerName, render: s => <span className="font-medium">{s.customerName}</span> },
    { key: 'type', header: 'Type', render: s => <Badge tone={s.type === 'chat' ? 'blue' : s.type === 'call' ? 'green' : 'purple'}>{s.type}</Badge> },
    { key: 'min', header: 'Duration', align: 'right', sortValue: s => s.minutes, render: s => (s.minutes ? `${s.minutes} min` : '—') },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: s => s.amount, render: s => (s.amount ? formatINR(s.amount) : '—') },
    {
      key: 'rating',
      header: 'Rating',
      render: s =>
        s.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-gold-400 text-gold-400" />
            {s.rating}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: s => <StatusBadge status={s.status} /> },
    { key: 'at', header: 'Started', sortValue: s => s.startedAt, render: s => <span className="whitespace-nowrap text-muted">{formatDateTime(s.startedAt)}</span> },
  ]
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={s => s.id}
      searchText={s => `${s.id} ${s.customerName}`}
      loading={!profile}
      filters={[{ key: 'type', label: 'Type', options: ['chat', 'call', 'video'], match: (s, v) => s.type === v }]}
      empty="No sessions yet"
    />
  )
}
