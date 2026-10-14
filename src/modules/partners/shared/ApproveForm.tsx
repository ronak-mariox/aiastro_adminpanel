import { Input, Toggle } from '@/components/ui'
import type { ServiceRate } from '../actions'
import type { ApproveOptions } from './approveOptions'

/** Opening rates + commission — what approving an astrologer sets (POST /admin/astrologers/:id/approve). */
export function ApproveForm({ value, onChange }: { value: ApproveOptions; onChange: (v: ApproveOptions) => void }) {
  const setRate = (type: ServiceRate['type'], patch: Partial<ServiceRate>) =>
    onChange({ ...value, services: value.services.map(s => (s.type === type ? { ...s, ...patch } : s)) })
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <Input label="Platform commission %" type="number" min={0} max={100} value={String(value.commissionPercent)} onChange={e => onChange({ ...value, commissionPercent: Number(e.target.value) })} />
      {value.services.map(s => (
        <div key={s.type} className="flex items-center gap-3">
          <Toggle checked={s.isEnabled} onChange={v => setRate(s.type, { isEnabled: v })} />
          <span className="w-14 text-sm font-medium text-ink capitalize">{s.type}</span>
          <div className="flex-1">
            <Input type="number" min={1} value={String(s.ratePerMinute)} disabled={!s.isEnabled} onChange={e => setRate(s.type, { ratePerMinute: Number(e.target.value) })} />
          </div>
          <span className="text-xs text-muted">₹/min</span>
        </div>
      ))}
    </div>
  )
}
