import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Circle, ExternalLink, Landmark, MessageCircle, Phone, Video, X } from 'lucide-react'
import { Avatar, Badge, Button, DetailList, Drawer, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDateTime, formatINR } from '@/lib/utils'
import { reviewAstroBank, reviewDocument } from '../partners/actions'
import { ApproveForm } from '../partners/shared/ApproveForm'
import { approveBody, approveDefaults, approveFormError, type ApproveOptions } from '../partners/shared/approveOptions'
import { DocPreview } from '../partners/shared/DocPreview'
import type { BankAccount, KycDocument } from '../partners/types'
import { APPLICATION_STAGES, decideApproval, KIND_LABELS } from './data'
import { partnerPath } from './summary'
import type { Approval, BankView, TimelineEvent } from './types'

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Diff({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
        <p className="mb-1 text-xs font-medium text-red-700">Current</p>
        <div className="text-sm text-ink">{before}</div>
      </div>
      <ArrowRight className="mx-auto size-5 self-center text-muted max-sm:rotate-90" />
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="mb-1 text-xs font-medium text-emerald-700">Requested</p>
        <div className="text-sm text-ink">{after}</div>
      </div>
    </div>
  )
}

function Bank({ b }: { b: BankView }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 font-semibold">
        <Landmark className="size-4 text-muted" />
        {b.bank}
      </p>
      {b.accountLast4 && <p className="font-mono text-xs">A/C •••• {b.accountLast4}</p>}
      {b.ifsc && <p className="font-mono text-xs">IFSC {b.ifsc}</p>}
      {b.holder && <p className="text-xs">Holder: {b.holder}</p>}
      {b.upi && <p className="text-xs">UPI: {b.upi}</p>}
    </div>
  )
}

type Busy = (key: string, run: () => Promise<unknown>, done: string) => Promise<void>

/** One filed document inside an application, with its own approve / reject. */
function DocRow({ a, doc, busy, act }: { a: Approval; doc: KycDocument; busy: string | null; act: Busy }) {
  const confirm = useConfirm()
  const reject = async () => {
    const reason = await confirm({ title: `Reject ${doc.type}?`, message: 'The partner will be asked to upload it again.', confirmLabel: 'Reject', tone: 'danger', withReason: true, reasonLabel: 'Rejection reason' })
    if (reason === false) return
    await act(`doc-${doc.id}`, () => reviewDocument(a.partnerType, a.partnerId, doc.id, 'rejected', reason), `${doc.type} rejected`)
  }
  return (
    <div className="flex gap-3 rounded-xl border border-line p-3">
      <div className="w-28 shrink-0">
        <DocPreview compact title={doc.type} subtitle={doc.number} file={doc.fileName} url={doc.fileUrl} mimeType={doc.mimeType} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{doc.type}</p>
            <p className="truncate text-xs text-muted">
              {doc.number !== '—' ? `${doc.number} · ` : ''}
              {doc.uploadedAt ? formatDateTime(doc.uploadedAt) : doc.fileName}
            </p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
        {doc.reason && <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Rejected: {doc.reason}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              Open <ExternalLink className="size-3" />
            </a>
          )}
          {doc.status !== 'verified' && (
            <Button size="sm" variant="success" icon={<Check className="size-3.5" />} loading={busy === `doc-${doc.id}`} disabled={!!busy} onClick={() => act(`doc-${doc.id}`, () => reviewDocument(a.partnerType, a.partnerId, doc.id, 'approved'), `${doc.type} verified`)}>
              Approve
            </Button>
          )}
          {doc.status === 'pending' && (
            <Button size="sm" variant="outline" icon={<X className="size-3.5" />} disabled={!!busy} onClick={reject}>
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function BankRow({ a, acc, busy, act }: { a: Approval; acc: BankAccount; busy: string | null; act: Busy }) {
  const confirm = useConfirm()
  const reject = async () => {
    const reason = await confirm({ title: 'Reject bank account?', message: 'The partner will be asked to add a valid account.', confirmLabel: 'Reject', tone: 'danger', withReason: true, reasonLabel: 'Rejection reason' })
    if (reason === false) return
    await act(`bank-${acc.id}`, () => reviewAstroBank(a.partnerId, acc.id, 'rejected', reason), 'Bank account rejected')
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <Bank b={acc} />
        <StatusBadge status={acc.status} />
      </div>
      {acc.reason && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Rejected: {acc.reason}</p>}
      {acc.proofUrl ? (
        <div className="mt-3 w-40">
          <DocPreview compact title="Passbook / cheque" file={acc.proofFile ?? 'Passbook / cheque'} url={acc.proofUrl} mimeType={acc.proofMime} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">No passbook / cheque scan attached.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {acc.proofUrl && (
          <a href={acc.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            Passbook / cheque <ExternalLink className="size-3" />
          </a>
        )}
        {acc.status !== 'verified' && (
          <Button size="sm" variant="success" icon={<Check className="size-3.5" />} loading={busy === `bank-${acc.id}`} disabled={!!busy} onClick={() => act(`bank-${acc.id}`, () => reviewAstroBank(a.partnerId, acc.id, 'approved'), 'Bank account verified')}>
            Approve
          </Button>
        )}
        {acc.status === 'pending' && (
          <Button size="sm" variant="outline" icon={<X className="size-3.5" />} disabled={!!busy} onClick={reject}>
            Reject
          </Button>
        )}
      </div>
    </div>
  )
}

const STEP_LABELS: Record<string, string> = { kyc: 'KYC documents', profile: 'Profile setup', pricing: 'Pricing', bank: 'Bank / UPI', availability: 'Availability' }
const RATE_ICONS = { chat: MessageCircle, call: Phone, video: Video } as const
const to12h = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{children}</h3>
}

/** The timeline of an application: registered → KYC → bank → submitted → decided. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted">No dated events yet.</p>
  return (
    <ol className="relative ml-2 space-y-3 border-l border-line pl-5">
      {events.map(e => (
        <li key={e.key} className="relative">
          <span className="absolute top-1 -left-[26px] size-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
          <p className="text-sm font-medium text-ink">{e.label}</p>
          <p className="text-xs text-muted">{e.at ? formatDateTime(e.at) : '—'}</p>
        </li>
      ))}
    </ol>
  )
}

function Details({ a, busy, act, form, setForm }: { a: Approval; busy: string | null; act: Busy; form: ApproveOptions; setForm: (v: ApproveOptions) => void }) {
  switch (a.kind) {
    case 'onboarding':
      return (
        <>
          <DetailList
            items={[
              { label: 'Stage', value: APPLICATION_STAGES[a.applicationStatus] ?? a.applicationStatus },
              { label: 'Experience', value: `${a.experienceYears} years` },
              { label: 'City', value: a.city || '—' },
              ...(a.gender ? [{ label: 'Gender', value: a.gender }] : []),
              { label: 'Mobile', value: a.phone || '—' },
              { label: 'Email', value: a.email || '—' },
              { label: 'Languages', value: a.languages.join(', ') || '—' },
              ...(a.partnerType === 'pandit'
                ? [
                    { label: 'Base fee', value: a.baseFee ? formatINR(a.baseFee) : '—' },
                    { label: 'Service radius', value: a.serviceRadiusKm ? `${a.serviceRadiusKm} km` : '—' },
                  ]
                : a.availabilityNote
                  ? [{ label: 'Availability', value: a.availabilityNote }]
                  : []),
              {
                label: a.partnerType === 'astrologer' ? 'Skills' : 'Pujas',
                value: a.expertise.length ? <div className="flex flex-wrap gap-1">{a.expertise.map(e => <Badge key={e} tone="brand">{e}</Badge>)}</div> : '—',
              },
            ]}
          />
          {a.about && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-ink">{a.about}</p>}

          {a.photoUrl && (
            <div className="mt-6">
              <SubHeading>Profile photo</SubHeading>
              <div className="w-40">
                <DocPreview compact title="Profile photo" file="Photo" url={a.photoUrl} mimeType="image/*" />
              </div>
              <a href={a.photoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                Open full size <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          {a.partnerType === 'astrologer' && (
            <>
              <div className="mt-6">
                <SubHeading>Pricing filed in the app</SubHeading>
                {a.services.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {a.services.map(s => {
                      const Icon = RATE_ICONS[s.type]
                      return (
                        <div key={s.type} className="rounded-xl border border-line p-3">
                          <p className="flex items-center gap-1.5 text-xs text-muted capitalize">
                            <Icon className="size-3.5" />
                            {s.type}
                          </p>
                          <p className="mt-1 text-base font-semibold text-ink">{formatINR(s.ratePerMinute)}/min</p>
                          {!s.isEnabled && <p className="text-xs text-muted">Switched off</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No rates filed yet.</p>
                )}
              </div>

              <div className="mt-6">
                <SubHeading>Weekly availability</SubHeading>
                {a.schedule.length ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-line p-3 text-sm sm:grid-cols-2">
                    {a.schedule.map(d => (
                      <div key={d.day} className="flex justify-between gap-2">
                        <span className="font-medium text-ink">{d.day}</span>
                        <span className={d.enabled ? 'text-ink' : 'text-muted'}>{d.enabled ? `${to12h(d.from)} – ${to12h(d.to)}` : 'Off'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{a.availabilityNote || 'No working hours filed yet.'}</p>
                )}
              </div>

              {a.steps.length > 0 && (
                <div className="mt-6">
                  <SubHeading>App onboarding steps</SubHeading>
                  <div className="flex flex-wrap gap-2">
                    {a.steps.map(s => (
                      <span key={s.key} className={s.done ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-muted'}>
                        {s.done ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                        {STEP_LABELS[s.key] ?? s.key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {a.partnerType === 'pandit' && (
            <div className="mt-6">
              <SubHeading>Service area</SubHeading>
              <DetailList
                items={[
                  { label: 'Area / location', value: a.serviceArea || '—' },
                  { label: 'State', value: a.state || '—' },
                  { label: 'Address', value: a.address || '—' },
                  { label: 'Online puja', value: a.onlinePuja ? 'Offers online puja' : 'In person only' },
                ]}
              />
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Documents ({a.documents.length})</h3>
            {a.documents.length ? (
              <div className="space-y-3">
                {a.documents.map(d => (
                  <DocRow key={d.id} a={a} doc={d} busy={busy} act={act} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No documents uploaded yet.</p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Bank</h3>
            {a.partnerType === 'astrologer' ? (
              a.bankAccounts.length ? (
                <div className="space-y-3">
                  {a.bankAccounts.map(acc => (
                    <BankRow key={acc.id} a={a} acc={acc} busy={busy} act={act} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No payout account added yet.</p>
              )
            ) : a.bank ? (
              <div className="rounded-xl border border-line p-3">
                <Bank b={a.bank} />
              </div>
            ) : (
              <p className="text-sm text-muted">No bank account added yet.</p>
            )}
          </div>

          {a.partnerType === 'astrologer' && a.status === 'pending' && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">On approval</h3>
              <ApproveForm value={form} onChange={setForm} />
            </div>
          )}
        </>
      )
    case 'price': {
      const pct = a.currentRate ? Math.round(((a.requestedRate - a.currentRate) / a.currentRate) * 100) : 0
      return (
        <>
          <Diff before={<span className="text-lg font-semibold">{formatINR(a.currentRate)}/min</span>} after={<span className="text-lg font-semibold">{formatINR(a.requestedRate)}/min</span>} />
          <p className="mt-3 text-sm text-muted">
            Service: <span className="font-medium text-ink capitalize">{a.applyToAll ? 'all services' : a.service}</span> · Change{' '}
            <span className={a.requestedRate >= a.currentRate ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>
              {pct >= 0 ? '+' : ''}
              {pct}%
            </span>
            {a.offerPercent ? ` · ${a.offerPercent}% offer` : ''}
          </p>
        </>
      )
    }
    case 'bank':
      return (
        <>
          {a.oldBank ? (
            <Diff before={<Bank b={a.oldBank} />} after={<Bank b={a.newBank} />} />
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="mb-1 text-xs font-medium text-emerald-700">New payout account</p>
              <Bank b={a.newBank} />
            </div>
          )}
          {a.proofUrl && (
            <div className="mt-4">
              <DocPreview title="Passbook / cheque" subtitle={`${a.newBank.bank} ••${a.newBank.accountLast4}`} file={a.proofFile} url={a.proofUrl} />
            </div>
          )}
        </>
      )
    case 'certificate':
    case 'document':
      return (
        <>
          <DetailList
            items={[
              { label: a.kind === 'certificate' ? 'Certificate' : 'Document', value: a.docType },
              ...(a.issuer ? [{ label: 'Issued by', value: a.issuer }] : []),
              ...(a.year ? [{ label: 'Year', value: a.year }] : []),
              ...(a.number && a.number !== '—' ? [{ label: 'Number', value: <span className="font-mono">{a.number}</span> }] : []),
            ]}
          />
          <div className="mt-4">
            <DocPreview title={a.docType} subtitle={a.number !== '—' ? a.number : a.issuer} file={a.fileName} url={a.fileUrl} mimeType={a.mimeType} />
          </div>
        </>
      )
  }
}

export function ReviewDrawer({ approval: a, onClose }: { approval?: Approval; onClose: () => void }) {
  if (!a) return null
  return <ReviewPanel key={a.id} a={a} onClose={onClose} />
}

function ReviewPanel({ a, onClose }: { a: Approval; onClose: () => void }) {
  const confirm = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState<ApproveOptions>(() => approveDefaults(a.kind === 'onboarding' ? a.services : [], a.kind === 'onboarding' ? a.commissionPercent : undefined))

  const act: Busy = async (key, run, done) => {
    setBusy(key)
    try {
      await run()
      toast(done)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const approve = async () => {
    if (a.kind === 'onboarding' && a.partnerType === 'astrologer') {
      const problem = approveFormError(form)
      if (problem) {
        toast(problem, 'error')
        return
      }
    }
    const effect: Record<Approval['kind'], string> = {
      onboarding:
        a.partnerType === 'astrologer'
          ? 'The astrologer gets an astro code and goes live with the rates above.'
          : 'The pandit will be listed in the directory and can take bookings.',
      price: "The astrologer's live per-minute rate will be updated.",
      bank: 'Future payouts will go to this account.',
      certificate: 'The certificate will show as verified.',
      document: 'The document will be marked verified.',
    }
    const ok = await confirm({ title: `Approve ${KIND_LABELS[a.kind].toLowerCase()}?`, message: effect[a.kind], confirmLabel: 'Approve', tone: 'success' })
    if (ok === false) return
    await act('approve', () => decideApproval(a, 'approved', undefined, a.kind === 'onboarding' && a.partnerType === 'astrologer' ? approveBody(form) : undefined), `${a.ref} approved`)
  }

  const reject = async () => {
    const reason = await confirm({ title: 'Reject request?', message: `${a.partnerName} will be notified with your reason.`, confirmLabel: 'Reject', tone: 'danger', withReason: true, reasonLabel: 'Rejection reason' })
    if (reason === false) return
    await act('reject', () => decideApproval(a, 'rejected', reason), `${a.ref} rejected`)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={KIND_LABELS[a.kind]}
      subtitle={`${a.ref} · submitted ${formatDateTime(a.submittedAt)}`}
      footer={
        a.status === 'pending' ? (
          <>
            <Button variant="outline" icon={<X className="size-4" />} loading={busy === 'reject'} disabled={!!busy} onClick={reject}>
              Reject
            </Button>
            <Button variant="success" icon={<Check className="size-4" />} loading={busy === 'approve'} disabled={!!busy} onClick={approve}>
              Approve
            </Button>
          </>
        ) : undefined
      }>
      <Section title="Requester">
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <Avatar name={a.partnerName.replace('Pandit ', '')} src={a.photoUrl ?? undefined} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{a.partnerName}</p>
            <p className="text-xs text-muted">
              {a.partnerType === 'astrologer' ? 'Astrologer' : 'Pandit'}
              {a.partnerCode ? ` · ${a.partnerCode}` : ''}
            </p>
          </div>
          <Link to={partnerPath(a)} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            Profile <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </Section>

      <Section title="Request">
        <Details a={a} busy={busy} act={act} form={form} setForm={setForm} />
      </Section>

      {a.kind === 'onboarding' && (
        <Section title="Application timeline">
          <Timeline events={a.timeline} />
        </Section>
      )}

      {a.note && (
        <Section title="Note from partner">
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-ink">“{a.note}”</p>
        </Section>
      )}

      <Section title="Status">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={a.status} />
            {a.reviewedAt && (
              <span className="text-muted">
                {a.reviewedBy ? `by ${a.reviewedBy} · ` : ''}
                {formatDateTime(a.reviewedAt)}
              </span>
            )}
          </div>
          {a.reason && <p className={a.status === 'rejected' ? 'rounded-lg bg-red-50 p-3 text-red-700' : 'rounded-lg bg-gray-50 p-3'}>{a.reason}</p>}
        </div>
      </Section>
    </Drawer>
  )
}
