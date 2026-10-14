import { useMemo, useState } from 'react'
import { Download, IndianRupee, Save, Share2, TrendingUp, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, CardBody, CardHeader, DataTable, Input, StatCard, Textarea, Toggle, useConfirm, useToast, type Column } from '@/components/ui'
import { useCollection, useRecord } from '@/lib/store'
import { formatDate, formatINR, formatNumber } from '@/lib/utils'
import { referralSettingsDb, referralStatsDb } from './data'
import { downloadCsv, pct } from './utils'
import type { ReferralSettings, ReferralStat } from './types'

type Row = ReferralStat

export function ReferralTab() {
  const { record } = useRecord(referralSettingsDb, 'default')
  const { items: stats, loading } = useCollection(referralStatsDb)

  const rows: Row[] = useMemo(() => [...stats].sort((a, b) => b.converted - a.converted || b.invited - a.invited), [stats])
  const totals = useMemo(() => {
    const invited = rows.reduce((s, r) => s + r.invited, 0)
    const converted = rows.reduce((s, r) => s + r.converted, 0)
    return { invited, converted, earned: rows.reduce((s, r) => s + r.earned, 0), rate: pct(converted, invited) }
  }, [rows])

  const columns: Column<Row>[] = [
    {
      key: 'rank',
      header: '#',
      render: r => <span className="text-muted">{rows.indexOf(r) + 1}</span>,
    },
    {
      key: 'name',
      header: 'Referrer',
      sortValue: r => r.name,
      render: r => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            <p className="text-xs text-muted">{r.phone || r.customerId}</p>
          </div>
        </div>
      ),
    },
    { key: 'code', header: 'Code', render: r => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'invited', header: 'Invited', align: 'right', sortValue: r => r.invited, render: r => r.invited },
    { key: 'converted', header: 'Converted', align: 'right', sortValue: r => r.converted, render: r => <span className="font-medium">{r.converted}</span> },
    { key: 'rate', header: 'Conv. %', align: 'right', sortValue: r => pct(r.converted, r.invited), render: r => `${pct(r.converted, r.invited)}%` },
    { key: 'earned', header: 'Earned', align: 'right', sortValue: r => r.earned, render: r => formatINR(r.earned) },
    { key: 'last', header: 'Last referral', sortValue: r => r.lastReferralAt, render: r => <span className="whitespace-nowrap">{formatDate(r.lastReferralAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Friends signed up" value={formatNumber(totals.invited)} icon={Share2} tone="blue" />
        <StatCard label="Successful referrals" value={formatNumber(totals.converted)} icon={UserPlus} hint="reward paid" />
        <StatCard label="Conversion rate" value={`${totals.rate}%`} icon={TrendingUp} tone="purple" />
        <StatCard label="Rewards paid" value={formatINR(totals.earned)} icon={IndianRupee} tone="gold" />
      </div>

      {record ? <ReferralSettingsCard key={record.updatedAt} settings={record} /> : <Card className="h-48 animate-pulse" />}

      <div>
        <h3 className="mb-3 text-base font-semibold">Top referrers</h3>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={r => r.id}
          loading={loading}
          searchText={r => `${r.name} ${r.phone} ${r.customerId} ${r.code}`}
          searchPlaceholder="Search referrer, phone, code…"
          toolbar={
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() =>
                downloadCsv(
                  'top-referrers.csv',
                  rows.map(r => ({ customerId: r.customerId, name: r.name, phone: r.phone, code: r.code, invited: r.invited, converted: r.converted, earned: r.earned })),
                )
              }>
              Export
            </Button>
          }
        />
      </div>
    </div>
  )
}

function ReferralSettingsCard({ settings }: { settings: ReferralSettings }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const set = <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) => setDraft(d => ({ ...d, [k]: v }))
  const invalid = draft.referrerReward < 0 || draft.minFirstTransaction < 0 || !draft.shareMessage.includes('{{code}}')

  const save = async () => {
    const ok = await confirm({ title: 'Update referral program?', message: 'Changes apply to new referrals only.', confirmLabel: 'Save' })
    if (ok === false) return
    setSaving(true)
    try {
      await referralSettingsDb.update('default', draft)
      toast('Referral program updated')
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Referral program" subtitle="Only the referrer is credited, after the friend's first consultation of at least the minimum spend" action={<Toggle checked={draft.enabled} onChange={v => set('enabled', v)} label="Enabled" />} />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Referrer reward (₹)" type="number" min={0} value={draft.referrerReward} onChange={e => setDraft(d => ({ ...d, referrerReward: Number(e.target.value), refereeReward: Number(e.target.value) }))} />
          <Input label="Referee reward (₹)" hint="the referred friend gets nothing" type="number" disabled value={0} />
          <Input label="Min first consultation (₹)" type="number" min={0} value={draft.minFirstTransaction} onChange={e => set('minFirstTransaction', Number(e.target.value))} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea
              label="Share message"
              hint="Must include {{code}}"
              rows={2}
              value={draft.shareMessage}
              error={draft.shareMessage.includes('{{code}}') ? undefined : 'Add {{code}} placeholder'}
              onChange={e => set('shareMessage', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!dirty} onClick={() => setDraft(settings)}>
            Reset
          </Button>
          <Button icon={<Save className="size-4" />} disabled={!dirty || invalid} loading={saving} onClick={save}>
            Save program
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
