import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlarmClock, CheckCircle2, Download, Inbox, Plus, Timer } from 'lucide-react'
import { Badge, Button, DataTable, PageHeader, Segmented, StatCard, StatusBadge, useToast, type Column, type Filter } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import { downloadCsv } from './csv'
import { agentsDb, assigneeLabel, isOverdue, requesterName, ticketsDb } from './data'
import NewTicketModal from './NewTicketModal'
import { RAISED_BY, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type Ticket } from './types'
import { cap, formatDuration, timeAgo, useNow } from './format'
import { PriorityBadge, RaisedByBadge } from './ui'

const priorityRank = { low: 0, medium: 1, high: 2, urgent: 3 }

type Source = 'all' | Ticket['kind']

export default function TicketsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { items: all, loading, error } = useCollection(ticketsDb)
  const { items: agents } = useCollection(agentsDb)
  const [creating, setCreating] = useState(false)
  const [source, setSource] = useState<Source>('all')
  const items = useMemo(() => (source === 'all' ? all : all.filter(t => t.kind === source)), [all, source])
  const unreadChats = all.filter(t => (t.unread ?? 0) > 0).length

  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])

  const now = useNow()
  const stats = useMemo(() => {
    const startOfDay = new Date(now).setHours(0, 0, 0, 0)
    const responded = items.filter(t => t.firstResponseAt)
    const avgFirst = responded.length
      ? responded.reduce((s, t) => s + (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / 60_000, 0) / responded.length
      : 0
    return {
      open: items.filter(t => t.status === 'open' || t.status === 'in progress').length,
      unassigned: items.filter(t => t.status === 'open' && !t.assigneeId).length,
      overdue: items.filter(t => isOverdue(t, now)).length,
      avgFirst,
      resolvedToday: items.filter(t => t.resolvedAt && new Date(t.resolvedAt).getTime() >= startOfDay).length,
    }
  }, [items, now])

  const columns: Column<Ticket>[] = [
    {
      key: 'id',
      header: 'Ticket',
      sortValue: t => t.code,
      render: t => (
        <div className="min-w-56">
          <p className="font-medium text-ink">
            {t.subject}
            {!!t.unread && (
              <Badge tone="red" className="ml-2 align-middle">
                {t.unread} new
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted">
            {t.code} · {cap(t.category)}
            {t.kind === 'chat' && ' · Chat'}
            {t.reference && ` · ${t.reference.id}`}
          </p>
        </div>
      ),
    },
    {
      key: 'raisedBy',
      header: 'Raised by',
      sortValue: t => requesterName(t),
      render: t => (
        <div className="whitespace-nowrap">
          <p className="text-ink">{requesterName(t)}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <RaisedByBadge type={t.raisedByType} />
            {t.requester?.code && <span className="text-xs text-muted">{t.requester.code}</span>}
          </div>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', sortValue: t => priorityRank[t.priority], render: t => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', sortValue: t => t.status, render: t => <StatusBadge status={t.status} /> },
    {
      key: 'assignee',
      header: 'Assignee',
      sortValue: t => assigneeLabel(t),
      render: t => <span className={t.assigneeId ? 'whitespace-nowrap' : 'text-muted italic'}>{assigneeLabel(t)}</span>,
    },
    {
      key: 'sla',
      header: 'SLA due',
      sortValue: t => t.slaDueAt,
      render: t =>
        t.status === 'resolved' || t.status === 'closed' ? (
          <span className="text-xs text-muted">Met</span>
        ) : (
          <span className={isOverdue(t, now) ? 'font-medium whitespace-nowrap text-red-600' : 'whitespace-nowrap text-ink'}>
            {isOverdue(t, now) ? `Overdue ${timeAgo(t.slaDueAt, now).replace(' ago', '')}` : timeAgo(t.slaDueAt, now)}
          </span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: t => t.createdAt,
      render: t => <span className="text-xs whitespace-nowrap text-muted">{formatDateTime(t.createdAt)}</span>,
    },
  ]

  const filters: Filter<Ticket>[] = [
    { key: 'status', label: 'Status', options: TICKET_STATUSES.map(cap), match: (t, v) => t.status === v.toLowerCase() },
    { key: 'priority', label: 'Priority', options: TICKET_PRIORITIES.map(cap), match: (t, v) => t.priority === v.toLowerCase() },
    { key: 'category', label: 'Category', options: TICKET_CATEGORIES.map(cap), match: (t, v) => t.category === v.toLowerCase() },
    { key: 'raisedBy', label: 'Raised by', options: RAISED_BY.map(cap), match: (t, v) => t.raisedByType === v.toLowerCase() },
    {
      key: 'assignee',
      label: 'Assignee',
      options: ['Unassigned', ...agents.map(a => a.name)],
      match: (t, v) => assigneeLabel(t) === v,
    },
    { key: 'sla', label: 'SLA', options: ['Overdue', 'On track'], match: (t, v) => (v === 'Overdue' ? isOverdue(t, now) : !isOverdue(t, now)) },
  ]

  const exportCsv = () =>
    downloadCsv(
      'support-tickets',
      items.map(t => ({
        id: t.code,
        source: t.kind === 'chat' ? 'Chat' : 'Ticket',
        channel: t.channel,
        subject: t.subject,
        category: t.category,
        raisedByType: t.raisedByType,
        raisedById: t.raisedById,
        raisedBy: requesterName(t),
        priority: t.priority,
        status: t.status,
        assignee: assigneeLabel(t),
        reference: t.reference ? `${t.reference.type} ${t.reference.id}` : '',
        slaDueAt: t.slaDueAt,
        createdAt: t.createdAt,
      })),
    )

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle="Help requests, in-app support chats, astrologer disputes and pandit issues"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New ticket
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tickets" value={stats.open} icon={Inbox} hint={`${stats.unassigned} unassigned`} />
        <StatCard label="Overdue SLA" value={stats.overdue} icon={AlarmClock} tone="gold" hint="Past resolution deadline" />
        <StatCard label="Avg first response" value={formatDuration(stats.avgFirst)} icon={Timer} tone="blue" hint="Across responded tickets" />
        <StatCard label="Resolved today" value={stats.resolvedToday} icon={CheckCircle2} tone="green" />
      </div>
      <DataTable
        rows={items}
        columns={columns}
        rowKey={t => t.id}
        loading={loading}
        searchText={t => `${t.code} ${t.subject} ${t.raisedById} ${requesterName(t)} ${t.reference?.id ?? ''}`}
        searchPlaceholder="Search ticket, subject, requester…"
        filters={filters}
        onRowClick={t => navigate(`/support/${t.id}`)}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                { key: 'all', label: 'All' },
                { key: 'ticket', label: 'Tickets' },
                { key: 'chat', label: unreadChats ? `Chats (${unreadChats})` : 'Chats' },
              ]}
            />
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export
            </Button>
          </div>
        }
      />
      <NewTicketModal open={creating} onClose={() => setCreating(false)} onCreated={id => navigate(`/support/${id}`)} />
    </div>
  )
}
