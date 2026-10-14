import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, CheckCircle2, Landmark, Mail, MapPin, Pencil, Phone, RotateCcw, Star, XCircle } from 'lucide-react'
import { panditsDb } from '@/data'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatusBadge, Toggle, useConfirm, useToast } from '@/components/ui'
import { useRecord } from '@/lib/store'
import { formatDate, formatINR, formatNumber } from '@/lib/utils'
import { errorMessage, fileUrl } from '@/lib/api'
import { approvePandit, rejectOnboarding, reopenApplication, reviewPanditBank, setBank, setPartnerSuspended } from '../actions'
import { usePanditProfile } from '../data'
import { BankFormModal } from '../shared/BankFormModal'
import { MiniStat } from '../shared/MiniStat'
import { PendingRequestsBanner } from '../shared/PendingRequestsBanner'
import { PanditCalendarCard } from './PanditCalendarCard'
import { PanditCertificatesCard } from './PanditCertificatesCard'
import { PanditFormModal } from './PanditFormModal'

export default function PanditDetail() {
  const { id } = useParams()
  const { record: p, loading } = useRecord(panditsDb, id)
  const { record: profile } = usePanditProfile(id)
  const confirm = useConfirm()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  const run = async (work: () => Promise<unknown>, done: string, tone: 'success' | 'info' = 'success') => {
    try {
      await work()
      toast(done, tone)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!p)
    return (
      <Card>
        {loading ? (
          <div className="h-64 animate-pulse" />
        ) : (
          <EmptyState title="Pandit not found" text={`No pandit with id ${id}.`} action={<Link to="/pandits" className="text-sm font-medium text-brand-600">Back to pandits</Link>} />
        )}
      </Card>
    )

  const approve = async () => {
    const ok = await confirm({ title: 'Approve pandit?', message: `${p.name} will be verified and can start accepting bookings.`, confirmLabel: 'Approve', tone: 'success' })
    if (ok === false) return
    await run(() => approvePandit(p.id), `${p.name} approved`)
  }

  const reject = async () => {
    const reason = await confirm({ title: 'Reject application?', message: 'The pandit will be notified with your reason.', confirmLabel: 'Reject', tone: 'danger', withReason: true })
    if (reason === false) return
    await run(() => rejectOnboarding('pandit', p.id, reason), `${p.name} rejected`, 'info')
  }

  const toggleSuspend = async () => {
    const suspending = p.status !== 'suspended'
    const reason = await confirm({
      title: suspending ? `Suspend ${p.name}?` : `Reactivate ${p.name}?`,
      message: suspending ? 'Upcoming bookings must be reassigned. The pandit will be hidden from customers.' : 'The pandit will be visible to customers again.',
      confirmLabel: suspending ? 'Suspend' : 'Reactivate',
      tone: suspending ? 'danger' : 'success',
      withReason: suspending,
    })
    if (reason === false) return
    await run(() => setPartnerSuspended('pandit', p.id, suspending, reason), suspending ? `${p.name} suspended` : `${p.name} reactivated`, suspending ? 'info' : 'success')
  }

  const decideBank = async (decision: 'approved' | 'rejected') => {
    const res = await confirm({
      title: decision === 'approved' ? 'Approve bank change?' : 'Reject bank change?',
      message: decision === 'approved' ? 'Future payouts will go to the new account.' : 'The pandit keeps the current account.',
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      tone: decision === 'approved' ? 'success' : 'danger',
      withReason: decision === 'rejected',
    })
    if (res === false) return
    await run(() => reviewPanditBank(p.id, decision, res), decision === 'approved' ? 'Bank change approved' : 'Bank change rejected', decision === 'approved' ? 'success' : 'info')
  }

  const setAccepting = async (v: boolean) => {
    await run(() => panditsDb.update(p.id, { acceptingBookings: v }), v ? 'Now accepting bookings' : 'Bookings paused')
  }

  return (
    <>
      <PageHeader title="Pandit profile" breadcrumbs={[{ label: 'Pandits', to: '/pandits' }, { label: p.name }]} />

      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <Avatar name={p.name.replace('Pandit ', '')} src={p.photoUrl ? fileUrl(p.photoUrl) : undefined} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{p.name}</h2>
              <StatusBadge status={p.status} />
              <Badge tone={p.kyc === 'verified' ? 'green' : p.kyc === 'rejected' ? 'red' : 'amber'}>KYC {p.kyc}</Badge>
              {p.onlinePuja && <Badge tone="blue">Online puja</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted">
              {p.code || p.id} · {p.experienceYears} yrs experience · Joined {formatDate(p.joinedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Phone className="size-4" />{p.phone || '—'}</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="size-4" />{p.email || '—'}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{p.city || '—'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status === 'pending' && (
              <>
                <Button variant="success" icon={<CheckCircle2 className="size-4" />} onClick={approve}>Approve</Button>
                <Button variant="danger" icon={<XCircle className="size-4" />} onClick={reject}>Reject</Button>
              </>
            )}
            {(p.status === 'active' || p.status === 'suspended') && (
              <Button variant={p.status === 'suspended' ? 'success' : 'outline'} icon={p.status === 'suspended' ? <RotateCcw className="size-4" /> : <Ban className="size-4" />} onClick={toggleSuspend}>
                {p.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </Button>
            )}
            {p.status === 'rejected' && (
              <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => run(() => reopenApplication('pandit', p.id), 'Moved back to pending review', 'info')}>
                Reopen application
              </Button>
            )}
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Edit</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat label="Total bookings" value={formatNumber(p.bookings)} />
          <MiniStat label="Completed" value={formatNumber(profile?.completedBookings ?? 0)} />
          <MiniStat label="Cancelled" value={formatNumber(profile?.cancelledBookings ?? 0)} hint={p.bookings ? `${(((profile?.cancelledBookings ?? 0) / p.bookings) * 100).toFixed(1)}%` : undefined} />
          <MiniStat label="Upcoming" value={profile?.upcomingBookings ?? 0} />
          <MiniStat label="Rating" value={<span className="inline-flex items-center gap-1"><Star className="size-4 fill-gold-400 text-gold-400" />{p.rating.toFixed(1)}</span>} hint={`${p.reviews} reviews`} />
          <MiniStat label="Earnings" value={formatINR(p.earnings)} hint={`Wallet ${formatINR(p.walletBalance)}${profile?.earnings.pendingWithdrawal ? ` · ${formatINR(profile.earnings.pendingWithdrawal)} requested` : ''}`} />
        </div>
      </Card>

      {p.status === 'rejected' && profile?.rejectionReason && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Rejected: {profile.rejectionReason}</p>}

      <PendingRequestsBanner partnerId={p.id} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Profile & service"
              action={<Toggle checked={p.acceptingBookings} onChange={setAccepting} disabled={p.status !== 'active'} label="Accepting bookings" />}
            />
            <CardBody className="space-y-5">
              {profile?.about && <p className="text-sm leading-relaxed text-ink">{profile.about}</p>}
              <DetailList
                items={[
                  { label: 'Base fee', value: formatINR(p.baseFee) },
                  { label: 'Service radius', value: p.serviceRadiusKm ? `${p.serviceRadiusKm} km from ${profile?.serviceArea || p.city || '—'}` : '—' },
                  { label: 'Online puja', value: p.onlinePuja ? 'Offered' : 'Not offered' },
                  { label: 'Address', value: profile?.address || '—' },
                  { label: 'Languages', value: <div className="flex flex-wrap gap-1">{p.languages.map(l => <Badge key={l}>{l}</Badge>)}</div> },
                  { label: 'Experience', value: `${p.experienceYears} years` },
                ]}
              />
              <div>
                <p className="mb-2 text-xs text-muted">Expertise pujas</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.expertise.map(e => (
                    <Badge key={e} tone="brand">{e}</Badge>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <PanditCertificatesCard pandit={p} profile={profile} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Bank account"
              action={
                <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setBankOpen(true)}>
                  Update
                </Button>
              }
            />
            <CardBody>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <Landmark className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{p.bank.bank || 'No account on file'}</p>
                  {p.bank.accountLast4 && <p className="font-mono text-xs text-muted">•••• •••• {p.bank.accountLast4}</p>}
                </div>
              </div>
              <DetailList columns={1} items={[{ label: 'Account holder', value: p.bank.holder || '—' }, { label: 'IFSC', value: <span className="font-mono">{p.bank.ifsc || '—'}</span> }]} />
              {profile?.pendingBank && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-800">Change requested{profile.pendingBank.submittedAt ? ` · ${formatDate(profile.pendingBank.submittedAt)}` : ''}</p>
                  <p className="mt-1 text-ink">
                    {profile.pendingBank.bank} <span className="font-mono text-xs">••{profile.pendingBank.accountLast4} · {profile.pendingBank.ifsc}</span>
                  </p>
                  <p className="text-xs text-muted">Holder: {profile.pendingBank.holder}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="success" icon={<CheckCircle2 className="size-3.5" />} onClick={() => decideBank('approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" icon={<XCircle className="size-3.5" />} onClick={() => decideBank('rejected')}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {profile ? <PanditCalendarCard profile={profile} /> : <Card className="h-64 animate-pulse" />}
        </div>
      </div>

      <PanditFormModal open={editing} onClose={() => setEditing(false)} pandit={p} about={profile?.about} address={profile?.street} />
      <BankFormModal
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        initial={p.bank}
        onSave={async bank => {
          try {
            await setBank('pandit', p.id, bank)
            toast('Bank account updated')
          } catch (e) {
            toast(errorMessage(e), 'error')
            throw e
          }
        }}
      />
    </>
  )
}
