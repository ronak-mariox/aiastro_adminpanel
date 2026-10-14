import { useState } from 'react'
import { Award, Check, ExternalLink, FileText, X } from 'lucide-react'
import type { Pandit } from '@/data'
import { Button, Card, CardBody, CardHeader, EmptyState, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { reviewDocument } from '../actions'
import type { KycDocument, PanditProfile } from '../types'

const CERT_LABEL: Record<KycDocument['status'], string> = { verified: 'verified', pending: 'under review', rejected: 'rejected' }

/** Certificates and ID documents the pandit filed from the app, each with approve / reject. */
export function PanditCertificatesCard({ pandit, profile }: { pandit: Pandit; profile?: PanditProfile }) {
  const confirm = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const docs = profile?.documents ?? []
  const certificates = docs.filter(d => d.rawType === 'certificate')
  const identity = docs.filter(d => d.rawType !== 'certificate')
  const review = docs.filter(d => d.status === 'pending').length

  const decide = async (doc: KycDocument, status: 'verified' | 'rejected') => {
    const res = await confirm({
      title: status === 'verified' ? `Verify "${doc.type}"?` : `Reject "${doc.type}"?`,
      message: status === 'verified' ? 'It will show as verified on the pandit profile.' : 'The pandit will be asked to upload a valid copy.',
      confirmLabel: status === 'verified' ? 'Verify' : 'Reject',
      tone: status === 'verified' ? 'success' : 'danger',
      withReason: status === 'rejected',
    })
    if (res === false) return
    setBusy(doc.id)
    try {
      await reviewDocument('pandit', pandit.id, doc.id, status === 'verified' ? 'approved' : 'rejected', res)
      toast(`${doc.rawType === 'certificate' ? 'Certificate' : 'Document'} ${status}`, status === 'verified' ? 'success' : 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const row = (d: KycDocument, cert: boolean) => (
    <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
      <span className={cert ? 'inline-flex size-9 items-center justify-center rounded-lg bg-gold-100 text-gold-500' : 'inline-flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600'}>
        {cert ? <Award className="size-4" /> : <FileText className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{d.type}</p>
        <p className="truncate text-xs text-muted">
          {[d.issuer, d.year, d.number !== '—' ? d.number : '', d.fileName].filter(Boolean).join(' · ')}
        </p>
        {d.note && <p className="mt-1 text-xs text-amber-700">Update requested: “{d.note}”</p>}
        {d.reason && <p className="mt-1 text-xs text-red-700">Rejected: {d.reason}</p>}
      </div>
      {d.fileUrl && (
        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          Open <ExternalLink className="size-3" />
        </a>
      )}
      <StatusBadge status={cert ? CERT_LABEL[d.status] : d.status} />
      {d.status !== 'verified' && (
        <div className="flex gap-1.5">
          <Button size="sm" variant="success" icon={<Check className="size-3.5" />} loading={busy === d.id} disabled={!!busy} onClick={() => decide(d, 'verified')}>
            Approve
          </Button>
          {d.status === 'pending' && (
            <Button size="sm" variant="outline" icon={<X className="size-3.5" />} disabled={!!busy} onClick={() => decide(d, 'rejected')}>
              Reject
            </Button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader title="Certificates & documents" subtitle={review ? `${review} under review` : docs.length ? 'All reviewed' : undefined} />
      <CardBody className="space-y-3">
        {!profile && <div className="h-24 animate-pulse rounded-xl bg-gray-50" />}
        {profile && docs.length === 0 && <EmptyState icon={Award} title="No certificates" text="Certificates and ID proofs added in the Pandit app appear here for review." />}
        {certificates.map(d => row(d, true))}
        {identity.length > 0 && certificates.length > 0 && <p className="pt-2 text-xs font-semibold tracking-wide text-muted uppercase">ID documents</p>}
        {identity.map(d => row(d, false))}
      </CardBody>
    </Card>
  )
}
