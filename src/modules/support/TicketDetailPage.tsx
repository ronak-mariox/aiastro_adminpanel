import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, LifeBuoy, Link2, RotateCcw, XCircle } from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailList,
  EmptyState,
  PageHeader,
  Select,
  StatusBadge,
  useConfirm,
  useToast,
} from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { ROLE_LABELS, type BackendAdminRole } from '@/lib/auth'
import { useCollection, useRecord } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import { agentsDb, isOverdue, requesterName, ticketsDb } from './data'
import { referencePath, requesterPath } from './references'
import TicketThread from './TicketThread'
import TicketNotes from './TicketNotes'
import { SLA_HOURS, TICKET_PRIORITIES, TICKET_STATUSES, type Ticket, type TicketPriority, type TicketStatus } from './types'
import { cap, formatDuration, timeAgo, useNow } from './format'
import { PriorityBadge, RaisedByBadge } from './ui'

export default function TicketDetailPage() {
  const { id } = useParams()
  const { record: ticket, loading, update } = useRecord(ticketsDb, id)
  const { items: agents } = useCollection(agentsDb)
  const toast = useToast()
  const confirm = useConfirm()
  const now = useNow()

  if (loading && !ticket) return <div className="h-64 animate-pulse rounded-2xl bg-white" />
  if (!ticket)
    return (
      <Card>
        <EmptyState icon={LifeBuoy} title="Ticket not found" text={`No ticket with id ${id}.`} />
      </Card>
    )

  // The server applies the change (and audits it); the fresh row comes back from the API.
  const patch = async (p: Partial<Ticket>, message: string) => {
    try {
      await update(ticket.id, p)
      toast(message)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const chat = ticket.kind === 'chat'
  const setStatus = (status: TicketStatus) => patch({ status }, chat && (status === 'resolved' || status === 'closed') ? 'Chat closed' : `Status changed to ${cap(status)}`)

  const setPriority = (priority: TicketPriority) => patch({ priority }, `Priority set to ${cap(priority)}`)

  const setAssignee = (assigneeId: string) => {
    const name = agents.find(a => a.id === assigneeId)?.name ?? 'Unassigned'
    return patch({ assigneeId: assigneeId || null }, assigneeId ? `Assigned to ${name}` : 'Ticket unassigned')
  }

  const closeTicket = async () => {
    const ok = await confirm({
      title: chat ? 'Close chat?' : 'Close ticket?',
      message: chat ? 'The conversation is marked resolved; their next message starts a new chat.' : 'The requester will be notified that this ticket is closed.',
      confirmLabel: chat ? 'Close chat' : 'Close ticket',
    })
    if (ok !== false) await setStatus('closed')
  }

  const person = ticket.requester
  const name = requesterName(ticket)
  const overdue = isOverdue(ticket, now)
  const firstResponseMin = ticket.firstResponseAt ? (new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime()) / 60_000 : null
  const done = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Support Tickets', to: '/support' }, { label: ticket.code }]}
        title={ticket.subject}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{ticket.code}</span>·<span>{cap(ticket.category)}</span>·<span>via {ticket.channel}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </span>
        }
        actions={
          done ? (
            <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => setStatus('open')}>
              Reopen
            </Button>
          ) : (
            <>
              <Button variant="outline" icon={<XCircle className="size-4" />} onClick={closeTicket}>
                Close
              </Button>
              <Button variant="success" icon={<CheckCircle2 className="size-4" />} onClick={() => setStatus('resolved')}>
                Mark resolved
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TicketThread ticket={ticket} />
          <TicketNotes ticket={ticket} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Properties" />
            <CardBody className="space-y-4">
              <Select label="Status" value={ticket.status} options={TICKET_STATUSES.map(s => ({ label: cap(s), value: s }))} onChange={e => setStatus(e.target.value as TicketStatus)} />
              <Select
                label="Priority"
                hint={`SLA ${SLA_HOURS[ticket.priority]}h`}
                value={ticket.priority}
                options={TICKET_PRIORITIES.map(p => ({ label: cap(p), value: p }))}
                onChange={e => setPriority(e.target.value as TicketPriority)}
              />
              <Select
                label="Assignee"
                value={ticket.assigneeId ?? ''}
                options={[
                  { label: 'Unassigned', value: '' },
                  ...(ticket.assigneeId && !agents.some(a => a.id === ticket.assigneeId) ? [{ label: ticket.assigneeName ?? 'Team member', value: ticket.assigneeId }] : []),
                  ...agents.map(a => ({ label: `${a.name} · ${ROLE_LABELS[a.role as BackendAdminRole] ?? a.role}`, value: a.id })),
                ]}
                onChange={e => setAssignee(e.target.value)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Raised by" />
            <CardBody>
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={name} size={42} />
                <div className="min-w-0">
                  <Link to={requesterPath(ticket.raisedByType, ticket.raisedById)} className="block truncate font-medium hover:text-brand-600">
                    {name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <RaisedByBadge type={ticket.raisedByType} />
                    {person?.code && <span className="text-xs text-muted">{person.code}</span>}
                  </div>
                </div>
              </div>
              <DetailList
                columns={1}
                items={[
                  { label: 'Phone', value: person?.phone },
                  { label: 'Email', value: person?.email },
                  { label: 'City', value: person?.city },
                  ...(ticket.issueType ? [{ label: 'Dispute issue type', value: ticket.issueType }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Linked reference" />
            <CardBody>
              {ticket.reference ? (
                (() => {
                  const ref = ticket.reference
                  const to = referencePath(ref)
                  const body = (
                    <>
                      <Link2 className="size-4 text-brand-600" />
                      <div>
                        <p className="text-xs text-muted">{ref.type}</p>
                        <p className="font-medium">{ref.id}</p>
                      </div>
                      {to && <span className="ml-auto text-xs font-medium text-brand-600">Open →</span>}
                    </>
                  )
                  const cls = 'flex items-center gap-3 rounded-xl border border-line bg-gray-50/60 px-4 py-3'
                  return to ? (
                    <Link to={to} className={`${cls} transition hover:border-brand-200 hover:bg-brand-50/40`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={cls}>{body}</div>
                  )
                })()
              ) : (
                <p className="text-sm text-muted">No booking, order or session linked.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="SLA & timeline" />
            <CardBody>
              <DetailList
                columns={1}
                items={[
                  { label: 'Created', value: formatDateTime(ticket.createdAt) },
                  {
                    label: 'First response',
                    value: ticket.firstResponseAt ? `${formatDateTime(ticket.firstResponseAt)} (${formatDuration(firstResponseMin ?? 0)})` : 'Awaiting response',
                  },
                  {
                    label: 'SLA due',
                    value: (
                      <span className={overdue ? 'text-red-600' : undefined}>
                        {formatDateTime(ticket.slaDueAt)} · {done ? 'closed' : overdue ? `overdue ${timeAgo(ticket.slaDueAt, now).replace(' ago', '')}` : timeAgo(ticket.slaDueAt, now)}
                      </span>
                    ),
                  },
                  { label: 'Resolved', value: ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—' },
                  { label: 'Last updated', value: formatDateTime(ticket.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
