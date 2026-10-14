import { useState } from 'react'
import { Gift, MessageCircle, Phone, RotateCcw, Save, ShoppingBag, Sparkles, Star, UserPlus } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Toggle, useConfirm, useToast } from '@/components/ui'
import { useRecord } from '@/lib/store'
import { formatDateTime, formatINR } from '@/lib/utils'
import { rewardRulesDb } from './data'
import type { RewardRules } from './types'

type NumKey = 'pointsPerChat' | 'pointsPerCall' | 'pointsPerPuja' | 'pointsPerOrder' | 'signupBonus' | 'pointsPerReferral'
const EARN_FIELDS: { key: NumKey; label: string; icon: typeof Star; hint: string }[] = [
  { key: 'pointsPerChat', label: 'Chat consultation', icon: MessageCircle, hint: 'per ₹100 spent on chats' },
  { key: 'pointsPerCall', label: 'Call consultation', icon: Phone, hint: 'per ₹100 spent on calls' },
  { key: 'pointsPerPuja', label: 'Puja booking', icon: Sparkles, hint: 'per ₹100 of a completed puja' },
  { key: 'pointsPerOrder', label: 'Store order', icon: ShoppingBag, hint: 'per ₹100 of a delivered order' },
  { key: 'signupBonus', label: 'Sign-up bonus', icon: Star, hint: 'once, on registration' },
  { key: 'pointsPerReferral', label: 'Successful referral', icon: UserPlus, hint: 'to the referrer, after the friend’s first consultation' },
]

export function RewardRulesTab() {
  const { record } = useRecord(rewardRulesDb, 'default')
  if (!record) return <Card className="h-64 animate-pulse" />
  return <RewardRulesForm key={record.updatedAt} rules={record} />
}

function RewardRulesForm({ rules }: { rules: RewardRules }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState(rules)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules)
  const set = (k: keyof RewardRules, v: number | boolean) => setDraft(d => ({ ...d, [k]: v }))

  const invalid = EARN_FIELDS.some(f => Number(draft[f.key]) < 0) || draft.rupeePerPoint < 0 || draft.minRedeemPoints < 1

  const save = async () => {
    const ok = await confirm({
      title: 'Update reward rules?',
      message: 'New rules apply to activities completed from now on. Already-earned points are not recalculated.',
      confirmLabel: 'Publish rules',
    })
    if (ok === false) return
    setSaving(true)
    await rewardRulesDb.update('default', { ...draft, updatedAt: new Date().toISOString() })
    setSaving(false)
    toast('Reward rules updated')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="Points earning rules"
          subtitle={`Last updated ${formatDateTime(rules.updatedAt)}`}
          action={<Toggle checked={draft.enabled} onChange={v => set('enabled', v)} label="Program on" />}
        />
        <CardBody className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {EARN_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted">{f.hint}</p>
                </div>
                <div className="w-24">
                  <Input type="number" min={0} aria-label={f.label} value={Number(draft[f.key])} onChange={e => set(f.key, Number(e.target.value))} />
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Redemption & cashback</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="₹ per point" type="number" step={0.1} min={0} value={draft.rupeePerPoint} onChange={e => set('rupeePerPoint', Number(e.target.value))} />
              <Input label="Min points to redeem" type="number" min={0} value={draft.minRedeemPoints} onChange={e => set('minRedeemPoints', Number(e.target.value))} />
              <div className="flex items-end pb-2">
                <Toggle checked={draft.redeemEnabled} onChange={v => set('redeemEnabled', v)} label="Redeem to wallet" />
              </div>
              <div className="flex items-end pb-2">
                <Toggle checked={draft.cashbackEnabled} onChange={v => set('cashbackEnabled', v)} label="Tier cashback" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" icon={<RotateCcw className="size-4" />} disabled={!dirty} onClick={() => setDraft(rules)}>
              Reset
            </Button>
            <Button icon={<Save className="size-4" />} disabled={!dirty || invalid} loading={saving} onClick={save}>
              Save rules
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How it looks to users" subtitle="UserApp › Rewards" />
        <CardBody className="space-y-4">
          <div className="rounded-2xl bg-brand-gradient p-5 text-white">
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Gift className="size-4" /> Shree Astro Rewards
            </div>
            <p className="mt-2 text-3xl font-bold">1,250 pts</p>
            <p className="text-sm opacity-90">Worth {formatINR(1250 * draft.rupeePerPoint)}</p>
          </div>
          <ul className="divide-y divide-line text-sm">
            {EARN_FIELDS.map(f => (
              <li key={f.key} className="flex justify-between py-2">
                <span className="text-muted">{f.label}</span>
                <span className="font-medium">+{Number(draft[f.key])} pts{f.key !== 'signupBonus' && f.key !== 'pointsPerReferral' ? ' / ₹100' : ''}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-xl bg-gray-50 p-3 text-xs text-muted">
            {draft.redeemEnabled ? `Redeem from ${draft.minRedeemPoints} pts into the wallet at ${formatINR(draft.rupeePerPoint)} per point.` : 'Redeeming points is switched off.'} {draft.cashbackEnabled ? 'Tier cashback is paid on consultations.' : ''}
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
