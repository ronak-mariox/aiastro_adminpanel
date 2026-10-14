import { useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { Avatar, Badge, Button, DetailList, Drawer, Input, Modal, Select, StatusBadge, Textarea } from '@/components/ui'
import { formatDateTime, formatINR } from '@/lib/utils'
import { SOURCE_LABEL, partnerName, partyName, suggestRefund } from './data'
import type { Refund, RefundDestination } from './types'

const customerName = (id: string) => partyName('customer', id)

const partnerOf = (r: Refund) =>
  r.partnerId ? partnerName(r.source === 'puja' ? 'pandit' : 'astrologer', r.partnerId) : undefined

export function PolicyChip({ refund }: { refund: Refund }) {
  const p = suggestRefund(refund)
  return (
    <Badge tone={p.percent === 100 ? 'green' : p.percent === 0 ? 'red' : 'amber'}>
      {p.percent}%{p.credit > 0 && ` + ₹${p.credit}`}
    </Badge>
  )
}

type Actions = { onApprove: (r: Refund) => void; onReject: (r: Refund) => void; onProcess: (r: Refund) => void }

export function RefundDrawer({ refund, onClose, onApprove, onReject, onProcess }: { refund: Refund | null; onClose: () => void } & Actions) {
  if (!refund) return null
  const policy = suggestRefund(refund)
  const customer = customerName(refund.customerId)
  const partner = partnerOf(refund)

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Refund ${refund.id}`}
      subtitle={`${SOURCE_LABEL[refund.source]} · ${refund.referenceId}`}
      footer={
        <>
          {refund.status === 'pending' && (
            <>
              <Button variant="outline" icon={<X className="size-4" />} onClick={() => onReject(refund)}>
                Reject
              </Button>
              <Button icon={<Check className="size-4" />} onClick={() => onApprove(refund)}>
                Approve
              </Button>
            </>
          )}
          {refund.status === 'approved' && (
            <Button variant="success" icon={<Send className="size-4" />} onClick={() => onProcess(refund)}>
              Mark processed
            </Button>
          )}
          {(refund.status === 'processed' || refund.status === 'rejected') && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }>
      <div className="flex items-center gap-3">
        <Avatar name={customer} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{customer}</p>
          <p className="text-xs text-muted">{refund.customerId}</p>
        </div>
        <StatusBadge status={refund.status} />
      </div>

      <div className="mt-6 rounded-2xl border border-gold-400/60 bg-gold-100/40 p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Policy tier applied</p>
        <p className="mt-1 font-semibold">{policy.tier}</p>
        <p className="text-sm text-muted">{policy.detail}</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
          <span>
            Suggested: <span className="font-semibold text-ink">{formatINR(policy.amount)}</span> ({policy.percent}% of {formatINR(refund.amountPaid)})
          </span>
          {policy.credit > 0 && (
            <span>
              + wallet credit <span className="font-semibold text-ink">{formatINR(policy.credit)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <DetailList
          items={[
            { label: 'Source', value: SOURCE_LABEL[refund.source] },
            { label: 'Reference', value: refund.referenceId },
            { label: refund.source === 'puja' ? 'Pandit' : 'Astrologer', value: partner ?? '—' },
            { label: 'Paid via', value: refund.paidVia },
            { label: 'Amount paid', value: formatINR(refund.amountPaid) },
            { label: 'Amount requested', value: formatINR(refund.amountRequested) },
            { label: 'Destination', value: refund.destination === 'wallet' ? 'VedRashi wallet' : `Original method (${refund.paidVia})` },
            { label: 'Requested', value: formatDateTime(refund.requestedAt) },
            ...(refund.approvedAmount !== undefined
              ? [{ label: 'Approved amount', value: `${formatINR(refund.approvedAmount)}${refund.creditAmount ? ` + ${formatINR(refund.creditAmount)} credit` : ''}` }]
              : []),
            ...(refund.decidedAt ? [{ label: 'Decided', value: formatDateTime(refund.decidedAt) }] : []),
          ]}
        />
      </div>

      <h4 className="mt-6 mb-1 text-sm font-semibold">{refund.kind === 'ledger' ? 'Ledger entry' : 'Reason'}</h4>
      <p className="rounded-xl bg-canvas px-4 py-3 text-sm">{refund.reason}</p>
      {refund.rejectReason && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Rejected: {refund.rejectReason}</p>
      )}
      {refund.adminNote && <p className="mt-4 text-sm text-muted">Admin note: {refund.adminNote}</p>}
    </Drawer>
  )
}

export type ApprovePayload = { amount: number; credit: number; destination: RefundDestination; note: string }

export function ApproveRefundModal({ refund, onClose, onSubmit }: { refund: Refund; onClose: () => void; onSubmit: (p: ApprovePayload) => Promise<void> }) {
  const policy = suggestRefund(refund)
  const [amount, setAmount] = useState(String(policy.amount))
  const [credit, setCredit] = useState(String(policy.credit))
  const [destination, setDestination] = useState<RefundDestination>(refund.destination)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const a = Number(amount)
    const c = Number(credit || 0)
    if (!Number.isFinite(a) || a < 0 || a > refund.amountPaid) {
      setError(`Amount must be between ₹0 and ${formatINR(refund.amountPaid)}`)
      return
    }
    if (!Number.isFinite(c) || c < 0) {
      setError('Credit must be a positive number')
      return
    }
    if (a !== policy.amount && !note.trim()) {
      setError('Add a note explaining the deviation from policy')
      return
    }
    setSaving(true)
    await onSubmit({ amount: Math.round(a), credit: Math.round(c), destination, note: note.trim() })
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Approve refund"
      subtitle={`${refund.id} · ${customerName(refund.customerId)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Approve {formatINR(Number(amount) || 0)}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
          <span className="font-medium">{policy.tier}</span> → policy suggests {formatINR(policy.amount)}
          {policy.credit > 0 && ` + ${formatINR(policy.credit)} credit`}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Refund amount (₹)"
            hint={`max ${formatINR(refund.amountPaid)}`}
            type="number"
            min={0}
            value={amount}
            onChange={e => {
              setAmount(e.target.value)
              setError('')
            }}
          />
          <Input label="Bonus wallet credit (₹)" type="number" min={0} value={credit} onChange={e => setCredit(e.target.value)} />
        </div>
        <Select
          label="Refund to"
          value={destination}
          onChange={e => setDestination(e.target.value as RefundDestination)}
          options={[
            { label: 'VedRashi wallet (instant)', value: 'wallet' },
            { label: `Original method — ${refund.paidVia} (5–7 days)`, value: 'original' },
          ]}
        />
        <Textarea label="Admin note" hint={Number(amount) !== policy.amount ? 'required' : 'optional'} rows={2} value={note} onChange={e => setNote(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
