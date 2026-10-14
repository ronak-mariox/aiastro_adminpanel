import { Copy, RotateCcw, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, DetailList, Drawer, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDateTime, formatINR } from '@/lib/utils'
import { createRefundRequest, markTopUpFailed } from './api'
import { INFLOW_TYPES, OUTFLOW_TYPES, TXN_TYPE_LABEL, partyName, refundsDb, transactionsDb } from './data'
import type { Transaction } from './types'

export function TransactionDrawer({ txn, onClose }: { txn: Transaction | null; onClose: () => void }) {
  const confirm = useConfirm()
  const toast = useToast()
  if (!txn) return null

  const name = partyName(txn.partyType, txn.partyId)
  const total = txn.amount + txn.gst
  const direction = INFLOW_TYPES.includes(txn.type) ? 'Inflow' : OUTFLOW_TYPES.includes(txn.type) ? 'Outflow' : 'Internal (wallet)'
  const target = txn.refundTarget
  // Only a pending wallet top-up can be failed by hand; success is confirmed by the gateway (webhook / checkout).
  const canFail = txn.status === 'pending' && txn.walletType === 'topup' && !!txn.txnId

  const markFailed = async () => {
    const ok = await confirm({
      title: 'Mark as failed?',
      message: `The top-up of ${formatINR(total)} will be marked failed. Nothing was credited; a late gateway capture still settles it.`,
      confirmLabel: 'Mark failed',
      tone: 'danger',
    })
    if (ok === false) return
    try {
      await markTopUpFailed(txn.txnId!)
      await transactionsDb.refresh?.()
      toast(`${txn.id} marked failed`)
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const initiateRefund = async () => {
    if (!target) return
    const ok = await confirm({
      title: 'Create refund request?',
      message: `A pending refund request for ${formatINR(total)} will be raised for ${name} and appear in Refunds for review.`,
      confirmLabel: 'Create request',
      withReason: true,
      reasonLabel: 'Reason for refund',
    })
    if (ok === false) return
    try {
      await createRefundRequest(target, ok)
      await refundsDb.refresh?.()
    } catch (e) {
      toast(errorMessage(e), 'error')
      return
    }
    toast('Refund request created')
    onClose()
  }

  const copyRef = () => {
    void navigator.clipboard?.writeText(txn.gatewayRef)
    toast('Gateway reference copied', 'info')
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={txn.id}
      subtitle={`${TXN_TYPE_LABEL[txn.type]} · ${formatDateTime(txn.date)}`}
      footer={
        <>
          {canFail && (
            <Button variant="outline" icon={<XCircle className="size-4" />} onClick={markFailed}>
              Mark failed
            </Button>
          )}
          {txn.status === 'success' && target && (
            <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={initiateRefund}>
              Initiate refund
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }>
      <div className="rounded-2xl bg-canvas p-5 text-center">
        <p className="text-xs tracking-wide text-muted uppercase">{direction}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{formatINR(total)}</p>
        <div className="mt-2 flex justify-center">
          <StatusBadge status={txn.status} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Avatar name={name} size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-muted">
            {txn.partyCode ?? txn.partyId} · <span className="capitalize">{txn.partyType}</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DetailList
          items={[
            { label: 'Type', value: TXN_TYPE_LABEL[txn.type] },
            { label: 'Method', value: <Badge tone="blue">{txn.method}</Badge> },
            { label: 'Base amount', value: formatINR(txn.amount) },
            { label: 'GST', value: txn.gst ? formatINR(txn.gst) : '—' },
            { label: 'Total', value: formatINR(total) },
            { label: 'Reference', value: txn.referenceId ?? '—' },
            {
              label: 'Gateway ref',
              value: (
                <button type="button" onClick={copyRef} className="inline-flex items-center gap-1 font-mono text-xs hover:text-brand-600">
                  {txn.gatewayRef}
                  <Copy className="size-3" />
                </button>
              ),
            },
            { label: 'Date', value: formatDateTime(txn.date) },
            { label: 'Note', value: txn.note ?? '—' },
          ]}
        />
      </div>
      {txn.status === 'failed' && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {txn.failureReason ? `Failed: ${txn.failureReason}. ` : 'Payment failed at the gateway. '}No money was captured or credited.
        </p>
      )}
    </Drawer>
  )
}
