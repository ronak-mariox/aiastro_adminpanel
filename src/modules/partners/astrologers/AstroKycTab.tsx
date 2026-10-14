import { useState } from 'react'
import { Check, ExternalLink, FileText, Landmark, Pencil, X } from 'lucide-react'
import type { Astrologer } from '@/data'
import { Button, Card, CardBody, CardHeader, DetailList, EmptyState, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { reviewAstroBank, reviewDocument, setBank } from '../actions'
import { BankFormModal } from '../shared/BankFormModal'
import { DocPreview } from '../shared/DocPreview'
import type { AstrologerProfile, BankAccount, KycDocument } from '../types'

type Props = { astrologer: Astrologer; profile?: AstrologerProfile }

export function AstroKycTab({ astrologer: a, profile }: Props) {
  const toast = useToast()
  const confirm = useConfirm()
  const [bankOpen, setBankOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  if (!profile) return <Card className="h-48 animate-pulse" />

  const run = async (key: string, work: () => Promise<unknown>, done: string, tone: 'success' | 'info' = 'success') => {
    setBusy(key)
    try {
      await work()
      toast(done, tone)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const decide = async (doc: KycDocument, status: 'verified' | 'rejected') => {
    const res = await confirm({
      title: status === 'verified' ? `Verify ${doc.type}?` : `Reject ${doc.type}?`,
      message: status === 'verified' ? `Confirm the ${doc.type} details match ${a.name}.` : 'The astrologer will be asked to re-upload this document.',
      confirmLabel: status === 'verified' ? 'Verify' : 'Reject',
      tone: status === 'verified' ? 'success' : 'danger',
      withReason: status === 'rejected',
    })
    if (res === false) return
    await run(`doc-${doc.id}`, () => reviewDocument('astrologer', a.id, doc.id, status === 'verified' ? 'approved' : 'rejected', res), `${doc.type} ${status}`, status === 'verified' ? 'success' : 'info')
  }

  const decideBank = async (acc: BankAccount, status: 'approved' | 'rejected') => {
    const res = await confirm({
      title: status === 'approved' ? 'Verify payout account?' : 'Reject payout account?',
      message: status === 'approved' ? `Payouts will go to ${acc.bank} ••${acc.accountLast4 || acc.upi}.` : 'The astrologer will be asked to add a valid account.',
      confirmLabel: status === 'approved' ? 'Verify' : 'Reject',
      tone: status === 'approved' ? 'success' : 'danger',
      withReason: status === 'rejected',
    })
    if (res === false) return
    await run(`bank-${acc.id}`, () => reviewAstroBank(a.id, acc.id, status, res), status === 'approved' ? 'Payout account verified' : 'Payout account rejected', status === 'approved' ? 'success' : 'info')
  }

  const others = profile.bankAccounts.filter(acc => acc.id !== profile.bank.id)

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="KYC documents" subtitle={`Overall KYC: ${a.kyc}`} action={<StatusBadge status={a.kyc} />} />
        <CardBody>
          {profile.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded" text="The astrologer has not uploaded Aadhaar / PAN from the app yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profile.documents.map(doc => (
                <div key={doc.id} className="flex flex-col rounded-xl border border-line">
                  <DocPreview compact title={doc.rawType === 'award' || doc.rawType === 'certificate' ? 'Certificate' : doc.type} subtitle={doc.number} file={doc.fileName} url={doc.fileUrl} mimeType={doc.mimeType} />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{doc.type}</p>
                        <p className="truncate text-xs text-muted">
                          {doc.number !== '—' ? `${doc.number} · ` : ''}
                          {doc.uploadedAt ? formatDate(doc.uploadedAt) : doc.fileName}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                    {doc.reason && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Rejected: {doc.reason}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                          Open <ExternalLink className="size-3" />
                        </a>
                      )}
                      {doc.status !== 'verified' && (
                        <Button size="sm" variant="success" icon={<Check className="size-3.5" />} loading={busy === `doc-${doc.id}`} disabled={!!busy} onClick={() => decide(doc, 'verified')}>
                          Approve
                        </Button>
                      )}
                      {doc.status === 'pending' && (
                        <Button size="sm" variant="outline" icon={<X className="size-3.5" />} disabled={!!busy} onClick={() => decide(doc, 'rejected')}>
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Bank & UPI"
          subtitle="Payout destination for withdrawals"
          action={
            <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setBankOpen(true)}>
              Update
            </Button>
          }
        />
        <CardBody>
          {profile.bank.id ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <Landmark className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{profile.bank.bank}</p>
                  <p className="font-mono text-xs text-muted">{profile.bank.accountLast4 ? `•••• •••• ${profile.bank.accountLast4}` : 'UPI only'}</p>
                </div>
                {profile.bank.status && <StatusBadge status={profile.bank.status} />}
              </div>
              <DetailList
                columns={1}
                items={[
                  { label: 'Account holder', value: profile.bank.holder || '—' },
                  { label: 'IFSC', value: <span className="font-mono">{profile.bank.ifsc || '—'}</span> },
                  { label: 'UPI ID', value: profile.bank.upi || '—' },
                ]}
              />
              {(() => {
                const primary = profile.bankAccounts.find(x => x.id === profile.bank.id)
                return primary?.proofUrl ? (
                  <div className="mt-4 w-48">
                    <DocPreview compact title="Passbook / cheque" file={primary.proofFile ?? 'Passbook / cheque'} url={primary.proofUrl} mimeType={primary.proofMime} />
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted">No passbook / cheque scan attached.</p>
                )
              })()}
              {profile.bank.status !== 'verified' && (
                <BankActions acc={profile.bankAccounts.find(x => x.id === profile.bank.id)!} busy={busy} onDecide={decideBank} />
              )}
            </>
          ) : (
            <EmptyState icon={Landmark} title="No payout account" text="The astrologer has not added bank details yet." />
          )}

          {others.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-line pt-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Other accounts on file</p>
              {others.map(acc => (
                <div key={acc.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{acc.bank}</p>
                      <p className="font-mono text-xs text-muted">
                        {acc.accountLast4 ? `••${acc.accountLast4}` : ''} {acc.ifsc} {acc.upi}
                      </p>
                    </div>
                    <StatusBadge status={acc.status} />
                  </div>
                  {acc.reason && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Rejected: {acc.reason}</p>}
                  {acc.status !== 'verified' && <BankActions acc={acc} busy={busy} onDecide={decideBank} />}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <BankFormModal
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        initial={profile.bank}
        withUpi
        onSave={async bank => {
          try {
            await setBank('astrologer', a.id, bank)
            toast('Payout account updated')
          } catch (e) {
            toast(errorMessage(e), 'error')
            throw e
          }
        }}
      />
    </div>
  )
}

function BankActions({ acc, busy, onDecide }: { acc: BankAccount; busy: string | null; onDecide: (acc: BankAccount, s: 'approved' | 'rejected') => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {acc.proofUrl && (
        <a href={acc.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          Passbook / cheque <ExternalLink className="size-3" />
        </a>
      )}
      <Button size="sm" variant="success" icon={<Check className="size-3.5" />} loading={busy === `bank-${acc.id}`} disabled={!!busy} onClick={() => onDecide(acc, 'approved')}>
        Verify
      </Button>
      {acc.status === 'pending' && (
        <Button size="sm" variant="outline" icon={<X className="size-3.5" />} disabled={!!busy} onClick={() => onDecide(acc, 'rejected')}>
          Reject
        </Button>
      )}
    </div>
  )
}
