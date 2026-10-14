import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2, Circle, X } from 'lucide-react'
import { Avatar, Badge, Button, DetailList, Drawer, Input, Modal, StatusBadge } from '@/components/ui'
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { partnerName } from './data'
import type { Payout } from './types'
import { formatDuration, hoursBetween } from './utils'

type Actions = {
  onApprove: (p: Payout) => void
  onReject: (p: Payout) => void
  onMarkPaid: (p: Payout) => void
}

export function PayoutDrawer({ payout, onClose, onApprove, onReject, onMarkPaid }: { payout: Payout | null; onClose: () => void } & Actions) {
  if (!payout) return null
  const name = partnerName(payout.partnerType, payout.partnerId)
  const steps = [
    { label: 'Requested', at: payout.requestedAt, done: true },
    { label: 'Approved · processing', at: payout.processedAt, done: !!payout.processedAt },
    { label: payout.status === 'rejected' ? 'Rejected' : 'Paid', at: payout.completedAt, done: payout.status === 'completed' || payout.status === 'rejected' },
  ]

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Payout ${payout.id}`}
      subtitle={`Requested ${formatDateTime(payout.requestedAt)}`}
      footer={
        <>
          {(payout.status === 'pending' || payout.status === 'processing') && (
            <Button variant="outline" icon={<X className="size-4" />} onClick={() => onReject(payout)}>
              Reject
            </Button>
          )}
          {payout.status === 'pending' && (
            <Button icon={<Check className="size-4" />} onClick={() => onApprove(payout)}>
              Approve
            </Button>
          )}
          {payout.status === 'processing' && (
            <Button variant="success" icon={<CheckCircle2 className="size-4" />} onClick={() => onMarkPaid(payout)}>
              Mark paid
            </Button>
          )}
          {(payout.status === 'completed' || payout.status === 'rejected') && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }>
      <div className="flex items-center gap-3">
        <Avatar name={name} size={48} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/${payout.partnerType === 'astrologer' ? 'astrologers' : 'pandits'}/${payout.partnerId}`}
            className="truncate font-semibold hover:text-brand-600">
            {name}
          </Link>
          <p className="text-xs text-muted">
            {payout.partnerCode ?? payout.id} · <span className="capitalize">{payout.partnerType}</span>
          </p>
        </div>
        <StatusBadge status={payout.status} />
      </div>

      <div className="mt-6 rounded-2xl bg-canvas p-5 text-center">
        <p className="text-xs tracking-wide text-muted uppercase">Withdrawal amount</p>
        <p className="mt-1 text-3xl font-semibold">{formatINR(payout.amount)}</p>
      </div>

      <div className="mt-6">
        <DetailList
          items={[
            { label: 'Method', value: <Badge tone="blue">{payout.method === 'bank' ? 'Bank transfer' : 'UPI'}</Badge> },
            { label: 'Account', value: payout.account },
            { label: 'Account holder', value: payout.holderName ?? '—' },
            { label: 'IFSC', value: payout.ifsc ?? '—' },
            { label: 'UTR', value: payout.utr ? <span className="font-mono">{payout.utr}</span> : '—' },
            {
              label: 'Processing time',
              value: payout.completedAt ? formatDuration(hoursBetween(payout.requestedAt, payout.completedAt)) : '—',
            },
            { label: 'Reject reason', value: payout.rejectReason ?? '—' },
          ]}
        />
      </div>

      <h4 className="mt-8 mb-3 text-sm font-semibold">Timeline</h4>
      <ol className="space-y-3">
        {steps.map(s => (
          <li key={s.label} className="flex items-start gap-3">
            {s.done ? (
              <CheckCircle2 className={cn('mt-0.5 size-4', payout.status === 'rejected' && s.label === 'Rejected' ? 'text-red-600' : 'text-emerald-600')} />
            ) : (
              <Circle className="mt-0.5 size-4 text-gray-300" />
            )}
            <div>
              <p className={cn('text-sm', !s.done && 'text-muted')}>{s.label}</p>
              {s.at && <p className="text-xs text-muted">{formatDateTime(s.at)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Drawer>
  )
}

export function MarkPaidModal({ payout, onClose, onSubmit }: { payout: Payout | null; onClose: () => void; onSubmit: (utr: string) => Promise<void> }) {
  const [utr, setUtr] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!payout) return null

  const submit = async () => {
    const v = utr.trim().toUpperCase()
    if (!/^[A-Z0-9]{12,22}$/.test(v)) {
      setError('Enter a valid UTR / bank reference (12–22 letters or digits)')
      return
    }
    setSaving(true)
    await onSubmit(v)
    setSaving(false)
    setUtr('')
    setError('')
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Mark payout as paid"
      subtitle={`${formatINR(payout.amount)} to ${partnerName(payout.partnerType, payout.partnerId)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" loading={saving} onClick={submit}>
            Confirm payment
          </Button>
        </>
      }>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Transfer to <span className="font-medium text-ink">{payout.account}</span>
          {payout.ifsc && <> ({payout.ifsc})</>}, then enter the bank UTR below.
        </p>
        <Input
          label="UTR / Transaction reference"
          placeholder={payout.method === 'upi' ? '12-digit UPI ref' : 'e.g. N284261234567890'}
          value={utr}
          autoFocus
          onChange={e => {
            setUtr(e.target.value)
            setError('')
          }}
          error={error}
        />
      </div>
    </Modal>
  )
}
