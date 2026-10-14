import { useMemo, useState } from 'react'
import { BellRing, CalendarClock, Copy, Download, MailOpen, Send, Trash2, XCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailList, Drawer, PageHeader, StatCard, StatusBadge, Tabs, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDateTime, formatNumber } from '@/lib/utils'
import { ComposeCampaign } from './ComposeCampaign'
import { emptyCompose, type ComposeDraft } from './compose'
import { TemplatesTab } from './TemplatesTab'
import { AUDIENCES, CHANNELS, NOTIFICATION_TYPES, campaignsDb, templatesDb } from './data'
import { downloadCsv, pct } from './utils'
import type { Campaign } from './types'

type TabKey = 'history' | 'compose' | 'templates'

const audienceText = (c: Campaign) =>
  `${AUDIENCES.find(a => a.value === c.audience)?.label}${c.segment ? ` · ${c.segment}` : ''}${c.city ? ` · ${c.city}` : ''}`

export default function NotificationsPage() {
  const { items, loading, update, remove } = useCollection(campaignsDb)
  const { items: templates } = useCollection(templatesDb)
  const confirm = useConfirm()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('history')
  const [compose, setCompose] = useState<{ key: number; draft: ComposeDraft }>({ key: 0, draft: emptyCompose })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find(c => c.id === selectedId)

  const openCompose = (draft: ComposeDraft = emptyCompose) => {
    setCompose(c => ({ key: c.key + 1, draft }))
    setSelectedId(null)
    setTab('compose')
  }

  const stats = useMemo(() => {
    const sent = items.filter(c => c.status === 'sent')
    const recipients = sent.reduce((s, c) => s + c.recipients, 0)
    const delivered = sent.reduce((s, c) => s + c.delivered, 0)
    const opened = sent.reduce((s, c) => s + c.opened, 0)
    return { sent: sent.length, recipients, delivery: pct(delivered, recipients), open: pct(opened, delivered), scheduled: items.filter(c => c.status === 'scheduled').length }
  }, [items])

  const chart = useMemo(
    () =>
      items
        .filter(c => c.status === 'sent')
        .sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''))
        .slice(-10)
        .map(c => ({ name: c.title.length > 14 ? `${c.title.slice(0, 14)}…` : c.title, Delivered: c.delivered, Opened: c.opened })),
    [items],
  )

  const cancel = async (c: Campaign) => {
    const ok = await confirm({ title: 'Cancel scheduled campaign?', message: c.title, confirmLabel: 'Cancel campaign', tone: 'danger' })
    if (ok === false) return
    await update(c.id, { status: 'cancelled' })
    toast('Campaign cancelled')
  }

  const sendNow = async (c: Campaign) => {
    const ok = await confirm({ title: 'Send this campaign now?', message: c.title, confirmLabel: 'Send now' })
    if (ok === false) return
    const saved = await update(c.id, { status: 'sent' })
    toast(`Campaign sent to ${formatNumber(saved.delivered)} recipients`)
  }

  const del = async (c: Campaign) => {
    const ok = await confirm({ title: 'Delete campaign?', message: c.title, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(c.id)
    setSelectedId(null)
    toast('Campaign deleted')
  }

  const duplicate = (c: Campaign) => openCompose({ title: c.title, body: c.body, channels: c.channels, audience: c.audience, segment: c.segment, city: c.city, type: c.type, deepLink: c.deepLink })

  const columns: Column<Campaign>[] = [
    {
      key: 'title',
      header: 'Campaign',
      sortValue: c => c.title,
      render: c => (
        <div className="min-w-56">
          <p className="font-medium">{c.title}</p>
          <p className="truncate text-xs text-muted">{audienceText(c)}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: c => <Badge tone="brand">{c.type}</Badge> },
    {
      key: 'channels',
      header: 'Channels',
      render: c => (
        <div className="flex gap-1">
          {c.channels.map(ch => (
            <Badge key={ch}>{CHANNELS.find(x => x.value === ch)?.label}</Badge>
          ))}
        </div>
      ),
    },
    { key: 'when', header: 'Sent / scheduled', sortValue: c => c.scheduledAt, render: c => <span className="text-xs whitespace-nowrap">{formatDateTime(c.sentAt ?? c.scheduledAt)}</span> },
    { key: 'recipients', header: 'Audience', align: 'right', sortValue: c => c.recipients, render: c => formatNumber(c.recipients) },
    { key: 'delivered', header: 'Delivered', align: 'right', sortValue: c => c.delivered, render: c => (c.delivered ? `${pct(c.delivered, c.recipients)}%` : '—') },
    { key: 'opened', header: 'Opened', align: 'right', sortValue: c => pct(c.opened, c.delivered), render: c => (c.opened ? `${pct(c.opened, c.delivered)}%` : '—') },
    { key: 'status', header: 'Status', render: c => <StatusBadge status={c.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Push, SMS & in-app campaigns for customers, astrologers and pandits"
        actions={
          <Button icon={<Send className="size-4" />} onClick={() => openCompose()}>
            New campaign
          </Button>
        }
      />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'history', label: 'History', count: items.length },
          { key: 'compose', label: 'Compose' },
          { key: 'templates', label: 'Templates', count: templates.length },
        ]}
      />

      {tab === 'compose' && <ComposeCampaign key={compose.key} initial={compose.draft} onDone={() => setTab('history')} />}

      {tab === 'templates' && (
        <TemplatesTab onUse={t => openCompose({ ...emptyCompose, title: t.title, body: t.body, deepLink: t.deepLink, type: t.type, channels: [t.channel] })} />
      )}

      {tab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Campaigns sent" value={stats.sent} icon={BellRing} hint={`${formatNumber(stats.recipients)} recipients`} />
            <StatCard label="Delivery rate" value={`${stats.delivery}%`} icon={Send} tone="green" />
            <StatCard label="Open rate" value={`${stats.open}%`} icon={MailOpen} tone="gold" hint="all time" />
            <StatCard label="Scheduled" value={stats.scheduled} icon={CalendarClock} tone="purple" hint="queued" />
          </div>

          <Card>
            <CardHeader title="Recent campaign performance" subtitle="Last 10 sent campaigns" />
            <CardBody className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece9ea" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip formatter={v => formatNumber(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Delivered" fill="#e9832b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Opened" fill="#c8102e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <DataTable
            rows={items}
            columns={columns}
            rowKey={c => c.id}
            loading={loading}
            searchText={c => `${c.title} ${c.body} ${c.city ?? ''} ${c.segment ?? ''}`}
            searchPlaceholder="Search campaigns…"
            onRowClick={c => setSelectedId(c.id)}
            filters={[
              { key: 'status', label: 'Status', options: ['sent', 'scheduled', 'draft', 'failed', 'cancelled'], match: (c, v) => c.status === v },
              { key: 'type', label: 'Type', options: NOTIFICATION_TYPES, match: (c, v) => c.type === v },
              { key: 'audience', label: 'Audience', options: AUDIENCES.map(a => a.label), match: (c, v) => AUDIENCES.find(a => a.value === c.audience)?.label === v },
            ]}
            toolbar={
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="size-4" />}
                onClick={() =>
                  downloadCsv(
                    'notification-campaigns.csv',
                    items.map(c => ({ id: c.id, title: c.title, type: c.type, channels: c.channels.join('+'), audience: audienceText(c), status: c.status, scheduledAt: c.scheduledAt, recipients: c.recipients, delivered: c.delivered, opened: c.opened })),
                  )
                }>
                Export
              </Button>
            }
          />
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? ''}
        subtitle={selected && `${selected.id} · by ${selected.createdBy}`}
        footer={
          selected && (
            <>
              {(selected.status === 'draft' || selected.status === 'cancelled' || selected.status === 'failed') && (
                <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => del(selected)}>
                  Delete
                </Button>
              )}
              {selected.status === 'scheduled' && (
                <Button variant="outline" icon={<XCircle className="size-4" />} onClick={() => cancel(selected)}>
                  Cancel
                </Button>
              )}
              <Button variant="outline" icon={<Copy className="size-4" />} onClick={() => duplicate(selected)}>
                Duplicate
              </Button>
              {(selected.status === 'scheduled' || selected.status === 'draft' || selected.status === 'failed') && (
                <Button icon={<Send className="size-4" />} onClick={() => sendNow(selected)}>
                  {selected.status === 'failed' ? 'Retry' : 'Send now'}
                </Button>
              )}
            </>
          )
        }>
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-gray-50 p-4">
              <p className="font-semibold">{selected.title}</p>
              <p className="mt-1 text-sm text-muted">{selected.body}</p>
              <p className="mt-2 font-mono text-xs text-brand-600">{selected.deepLink}</p>
            </div>
            <StatusBadge status={selected.status} />
            {selected.status === 'sent' && (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: 'Sent', v: formatNumber(selected.recipients) },
                  { l: 'Delivered', v: `${pct(selected.delivered, selected.recipients)}%` },
                  { l: 'Opened', v: `${pct(selected.opened, selected.delivered)}%` },
                ].map(s => (
                  <div key={s.l} className="rounded-xl border border-line p-3">
                    <p className="text-lg font-semibold">{s.v}</p>
                    <p className="text-xs text-muted">{s.l}</p>
                  </div>
                ))}
              </div>
            )}
            <DetailList
              items={[
                { label: 'Audience', value: audienceText(selected) },
                { label: 'Type', value: selected.type },
                { label: 'Channels', value: selected.channels.map(ch => CHANNELS.find(x => x.value === ch)?.label).join(', ') },
                { label: selected.sentAt ? 'Sent at' : 'Scheduled for', value: formatDateTime(selected.sentAt ?? selected.scheduledAt) },
                { label: 'Recipients', value: formatNumber(selected.recipients) },
                { label: 'Delivered', value: formatNumber(selected.delivered) },
                { label: 'Opened', value: formatNumber(selected.opened) },
                { label: 'Created', value: formatDateTime(selected.createdAt) },
              ]}
            />
          </div>
        )}
      </Drawer>
    </>
  )
}
