import { useState } from 'react'
import { CheckCircle2, PhoneCall, Trash2, XCircle } from 'lucide-react'
import { Badge, Button, DataTable, DetailList, Drawer, StatusBadge, Textarea, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import { appLeadsDb, inquiriesDb, subscribersDb } from './data'
import type { AppLead, Inquiry, Subscriber } from './types'
import { cap } from './format'

const leadTone = { new: 'blue', contacted: 'amber', converted: 'green', closed: 'gray' } as const

const APP_LINK_SMS: Record<string, string> = {
  '': 'Not sent (number not verified yet)',
  sent: 'Sent',
  not_configured: 'Not sent — set the MSG91 app-link template in Settings → Integrations',
  no_links: 'Not sent — add the store links in Settings → General',
  provider_error: 'Not sent — MSG91 rejected it',
}

function LeadStatus({ status }: { status: keyof typeof leadTone }) {
  return (
    <Badge tone={leadTone[status]} dot>
      {cap(status)}
    </Badge>
  )
}

/** Status buttons + notes shared by inquiry and app-lead drawers. */
function LeadActions({
  status,
  notes,
  allowClose,
  onStatus,
  onNotes,
}: {
  status: string
  notes: string
  allowClose: boolean
  onStatus: (s: 'contacted' | 'converted' | 'closed' | 'new') => void
  onNotes: (n: string) => void
}) {
  const [draft, setDraft] = useState(notes)
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" icon={<PhoneCall className="size-3.5" />} disabled={status === 'contacted'} onClick={() => onStatus('contacted')}>
          Mark contacted
        </Button>
        <Button variant="success" size="sm" icon={<CheckCircle2 className="size-3.5" />} disabled={status === 'converted'} onClick={() => onStatus('converted')}>
          Mark converted
        </Button>
        {allowClose && (
          <Button variant="ghost" size="sm" icon={<XCircle className="size-3.5" />} disabled={status === 'closed'} onClick={() => onStatus('closed')}>
            Close
          </Button>
        )}
      </div>
      <Textarea label="Notes" value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Call outcome, follow-up date…" />
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" disabled={draft === notes} onClick={() => onNotes(draft)}>
          Save notes
        </Button>
      </div>
    </div>
  )
}

export function InquiriesTable({ rows, loading }: { rows: Inquiry[]; loading: boolean }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find(r => r.id === openId)

  const columns: Column<Inquiry>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: i => i.name,
      render: i => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{i.name}</p>
          <p className="text-xs text-muted">{i.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: i => <span className="whitespace-nowrap">{i.phone}</span> },
    { key: 'service', header: 'Service', sortValue: i => i.service, render: i => <span className="whitespace-nowrap">{i.service}</span> },
    { key: 'message', header: 'Message', render: i => <p className="line-clamp-1 max-w-72 text-muted">{i.message}</p> },
    { key: 'status', header: 'Status', sortValue: i => i.status, render: i => <LeadStatus status={i.status} /> },
    { key: 'date', header: 'Received', sortValue: i => i.createdAt, render: i => <span className="text-xs whitespace-nowrap text-muted">{formatDateTime(i.createdAt)}</span> },
  ]

  const remove = async (i: Inquiry) => {
    const ok = await confirm({ title: 'Delete inquiry?', message: `${i.name}'s inquiry will be permanently removed.`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    try {
      await inquiriesDb.remove(i.id)
      setOpenId(null)
      toast('Inquiry deleted', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={i => i.id}
        loading={loading}
        searchText={i => `${i.name} ${i.phone} ${i.email} ${i.message}`}
        searchPlaceholder="Search name, phone, email…"
        filters={[
          { key: 'status', label: 'Status', options: ['New', 'Contacted', 'Converted', 'Closed'], match: (i, v) => i.status === v.toLowerCase() },
          { key: 'service', label: 'Service', options: [...new Set(rows.map(r => r.service))].sort(), match: (i, v) => i.service === v },
        ]}
        onRowClick={i => setOpenId(i.id)}
      />
      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ''}
        subtitle={open ? `${open.reference} · ${open.service}` : undefined}
        footer={
          open && (
            <Button variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => remove(open)}>
              Delete
            </Button>
          )
        }>
        {open && (
          <>
            <DetailList
              items={[
                { label: 'Status', value: <LeadStatus status={open.status} /> },
                { label: 'Received', value: formatDateTime(open.createdAt) },
                { label: 'Phone', value: <a href={`tel:${open.phone.replace(/\s/g, '')}`} className="text-brand-600">{open.phone}</a> },
                { label: 'Email', value: <a href={`mailto:${open.email}`} className="text-brand-600">{open.email}</a> },
              ]}
            />
            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm">{open.message}</div>
            <LeadActions
              key={open.id}
              status={open.status}
              notes={open.notes}
              allowClose
              onStatus={async s => {
                try {
                  await inquiriesDb.update(open.id, { status: s })
                  toast(`Marked as ${s}`)
                } catch (e) {
                  toast(errorMessage(e), 'error')
                }
              }}
              onNotes={async n => {
                try {
                  await inquiriesDb.update(open.id, { notes: n })
                  toast('Notes saved')
                } catch (e) {
                  toast(errorMessage(e), 'error')
                }
              }}
            />
          </>
        )}
      </Drawer>
    </>
  )
}

export function AppLeadsTable({ rows, loading }: { rows: AppLead[]; loading: boolean }) {
  const toast = useToast()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find(r => r.id === openId)

  const columns: Column<AppLead>[] = [
    { key: 'phone', header: 'Phone', sortValue: l => l.phone, render: l => <span className="font-medium whitespace-nowrap">{l.phone}</span> },
    { key: 'source', header: 'Source page', sortValue: l => l.sourcePage, render: l => <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{l.sourcePage}</code> },
    {
      key: 'otp',
      header: 'OTP',
      sortValue: l => Number(l.otpVerified),
      render: l => (l.otpVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="gray">Not verified</Badge>),
    },
    { key: 'status', header: 'Status', sortValue: l => l.status, render: l => <LeadStatus status={l.status} /> },
    { key: 'date', header: 'Date', sortValue: l => l.createdAt, render: l => <span className="text-xs whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</span> },
  ]

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={l => l.id}
        loading={loading}
        searchText={l => `${l.phone} ${l.sourcePage}`}
        searchPlaceholder="Search phone or page…"
        filters={[
          { key: 'otp', label: 'OTP', options: ['Verified', 'Not verified'], match: (l, v) => l.otpVerified === (v === 'Verified') },
          { key: 'status', label: 'Status', options: ['New', 'Contacted', 'Converted'], match: (l, v) => l.status === v.toLowerCase() },
          { key: 'source', label: 'Source', options: [...new Set(rows.map(r => r.sourcePage))].sort(), match: (l, v) => l.sourcePage === v },
        ]}
        onRowClick={l => setOpenId(l.id)}
      />
      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.phone ?? ''} subtitle={open ? `${open.reference} · App-download lead` : undefined}>
        {open && (
          <>
            <DetailList
              items={[
                { label: 'Status', value: <LeadStatus status={open.status} /> },
                { label: 'OTP verified', value: open.otpVerified ? 'Yes' : 'No' },
                { label: 'Download SMS', value: APP_LINK_SMS[open.appLinkSms] ?? open.appLinkSms },
                { label: 'Source page', value: open.sourcePage },
                { label: 'Captured', value: formatDateTime(open.createdAt) },
              ]}
            />
            <LeadActions
              key={open.id}
              status={open.status}
              notes={open.notes}
              allowClose={false}
              onStatus={async s => {
                try {
                  await appLeadsDb.update(open.id, { status: s === 'closed' ? 'new' : s })
                  toast(`Marked as ${s}`)
                } catch (e) {
                  toast(errorMessage(e), 'error')
                }
              }}
              onNotes={async n => {
                try {
                  await appLeadsDb.update(open.id, { notes: n })
                  toast('Notes saved')
                } catch (e) {
                  toast(errorMessage(e), 'error')
                }
              }}
            />
          </>
        )}
      </Drawer>
    </>
  )
}

export function SubscribersTable({ rows, loading }: { rows: Subscriber[]; loading: boolean }) {
  const toast = useToast()
  const confirm = useConfirm()

  const columns: Column<Subscriber>[] = [
    { key: 'email', header: 'Email', sortValue: s => s.email, render: s => <span className="font-medium">{s.email}</span> },
    { key: 'date', header: 'Subscribed', sortValue: s => s.subscribedAt, render: s => <span className="whitespace-nowrap text-muted">{formatDate(s.subscribedAt)}</span> },
    { key: 'status', header: 'Status', sortValue: s => Number(s.active), render: s => <StatusBadge status={s.active ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: s => (
        <div className="flex items-center justify-end gap-3">
          <Toggle
            checked={s.active}
            onChange={async v => {
              try {
                await subscribersDb.update(s.id, { active: v })
                toast(v ? 'Subscription re-activated' : 'Unsubscribed', v ? 'success' : 'info')
              } catch (e) {
                toast(errorMessage(e), 'error')
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete subscriber"
            icon={<Trash2 className="size-3.5" />}
            onClick={async () => {
              const ok = await confirm({ title: 'Remove subscriber?', message: s.email, confirmLabel: 'Remove', tone: 'danger' })
              if (ok === false) return
              try {
                await subscribersDb.remove(s.id)
                toast('Subscriber removed', 'info')
              } catch (e) {
                toast(errorMessage(e), 'error')
              }
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={s => s.id}
      loading={loading}
      searchText={s => s.email}
      searchPlaceholder="Search email…"
      filters={[{ key: 'active', label: 'Status', options: ['Active', 'Inactive'], match: (s, v) => s.active === (v === 'Active') }]}
    />
  )
}
