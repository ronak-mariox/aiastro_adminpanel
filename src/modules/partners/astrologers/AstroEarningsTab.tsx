import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Astrologer } from '@/data'
import { Button, Card, CardBody, CardHeader, Input, useToast } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { errorMessage } from '@/lib/api'
import { setCommission } from '../actions'
import { MiniStat } from '../shared/MiniStat'
import type { AstrologerProfile } from '../types'

type Props = { astrologer: Astrologer; profile?: AstrologerProfile }

export function AstroEarningsTab({ astrologer: a, profile }: Props) {
  const toast = useToast()
  const pct = a.commissionPct ?? profile?.commissionPct ?? 25
  const [draft, setDraft] = useState(String(pct))
  const [saving, setSaving] = useState(false)
  const data = profile?.earnings.monthly ?? []
  const gross = profile?.earnings.gross ?? 0
  const net = profile?.earnings.net ?? a.earnings
  const commission = Math.max(0, gross - net)
  const draftNum = Number(draft)
  const invalid = !draft || Number.isNaN(draftNum) || draftNum < 0 || draftNum > 100

  const saveCommission = async () => {
    if (invalid) return
    setSaving(true)
    try {
      await setCommission(a.id, draftNum)
      toast(`Commission set to ${draftNum}%`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Lifetime gross" value={formatINR(gross)} hint={`${profile?.earnings.sessions ?? a.sessions} paid sessions`} />
        <MiniStat label={`Platform commission (now ${pct}%)`} value={formatINR(commission)} />
        <MiniStat label="Net to astrologer" value={formatINR(net)} hint={`Credited lifetime ${formatINR(a.earnings)}`} />
        <MiniStat
          label="Withdrawable balance"
          value={formatINR(a.walletBalance)}
          hint={profile?.earnings.pendingWithdrawal ? `${formatINR(profile.earnings.pendingWithdrawal)} requested` : 'In astrologer wallet'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly gross earnings" subtitle="Last 6 months, all services" />
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={v => `₹${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip formatter={v => formatINR(Number(v))} cursor={{ fill: '#fdf2f3' }} />
                  <Bar dataKey="amount" name="Gross" fill="#c8102e" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Commission" subtitle="Platform share on every paid minute" />
          <CardBody className="space-y-4">
            <Input label="Commission %" type="number" value={draft} onChange={e => setDraft(e.target.value)} error={invalid ? '0–100%' : undefined} />
            <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Example: 10 min chat</span>
                <span>{formatINR(a.pricing.chat * 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Platform ({invalid ? pct : draftNum}%)</span>
                <span>{formatINR(Math.round((a.pricing.chat * 10 * (invalid ? pct : draftNum)) / 100))}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Astrologer receives</span>
                <span>{formatINR(Math.round(a.pricing.chat * 10 * (1 - (invalid ? pct : draftNum) / 100)))}</span>
              </div>
            </div>
            <Button className="w-full" loading={saving} disabled={invalid || draftNum === pct} onClick={saveCommission}>
              Save commission
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
