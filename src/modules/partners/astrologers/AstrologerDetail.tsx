import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, CheckCircle2, Mail, MapPin, Pencil, Phone, RotateCcw, Star, XCircle } from 'lucide-react'
import { astrologersDb } from '@/data'
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, StatusBadge, Tabs, useConfirm, useToast } from '@/components/ui'
import { useRecord } from '@/lib/store'
import { formatDate, formatINR, formatNumber } from '@/lib/utils'
import { errorMessage, fileUrl } from '@/lib/api'
import { ApproveAstrologerModal } from './ApproveAstrologerModal'
import { rejectOnboarding, reopenApplication, setPartnerSuspended } from '../actions'
import { useAstroProfile } from '../data'
import { MiniStat } from '../shared/MiniStat'
import { PendingRequestsBanner } from '../shared/PendingRequestsBanner'
import { AstroEarningsTab } from './AstroEarningsTab'
import { AstroKycTab } from './AstroKycTab'
import { AstrologerFormModal } from './AstrologerFormModal'
import { AstroOverviewTab } from './AstroOverviewTab'
import { AstroScheduleCard } from './AstroScheduleCard'
import { AstroSessionsTab } from './AstroSessionsTab'

type TabKey = 'overview' | 'kyc' | 'earnings' | 'availability' | 'sessions'

export default function AstrologerDetail() {
  const { id } = useParams()
  const { record: a, loading } = useRecord(astrologersDb, id)
  const { record: profile } = useAstroProfile(id)
  const confirm = useConfirm()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('overview')
  const [editing, setEditing] = useState(false)
  const [approving, setApproving] = useState(false)

  const run = async (work: () => Promise<unknown>, done: string, tone: 'success' | 'info' = 'success') => {
    try {
      await work()
      toast(done, tone)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!a)
    return (
      <Card>
        {loading ? (
          <div className="h-64 animate-pulse" />
        ) : (
          <EmptyState title="Astrologer not found" text={`No astrologer with id ${id}.`} action={<Link to="/astrologers" className="text-sm font-medium text-brand-600">Back to astrologers</Link>} />
        )}
      </Card>
    )

  const approve = () => setApproving(true)

  const reject = async () => {
    const reason = await confirm({ title: 'Reject application?', message: 'The applicant will be notified with your reason.', confirmLabel: 'Reject', tone: 'danger', withReason: true })
    if (reason === false) return
    await run(() => rejectOnboarding('astrologer', a.id, reason), `${a.name} rejected`, 'info')
  }

  const toggleSuspend = async () => {
    const suspending = a.status !== 'suspended'
    const reason = await confirm({
      title: suspending ? `Suspend ${a.name}?` : `Reactivate ${a.name}?`,
      message: suspending ? 'They will be taken offline and hidden from customers until reactivated.' : 'They will be able to go online and take sessions again.',
      confirmLabel: suspending ? 'Suspend' : 'Reactivate',
      tone: suspending ? 'danger' : 'success',
      withReason: suspending,
    })
    if (reason === false) return
    await run(() => setPartnerSuspended('astrologer', a.id, suspending, reason), suspending ? `${a.name} suspended` : `${a.name} reactivated`, suspending ? 'info' : 'success')
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'kyc', label: 'KYC & bank', count: (profile ? profile.documents.filter(d => d.status === 'pending').length + profile.bankAccounts.filter(b => b.status === 'pending').length : 0) || undefined },
    { key: 'earnings', label: 'Earnings' },
    { key: 'availability', label: 'Availability' },
    { key: 'sessions', label: 'Recent sessions' },
  ]

  return (
    <>
      <PageHeader title="Astrologer profile" breadcrumbs={[{ label: 'Astrologers', to: '/astrologers' }, { label: a.name }]} />

      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <Avatar name={a.name} src={a.photoUrl ? fileUrl(a.photoUrl) : undefined} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{a.name}</h2>
              {a.badge && <Badge tone={a.badge === 'Celebrity' ? 'purple' : a.badge === 'Top Choice' ? 'brand' : 'amber'}>{a.badge}</Badge>}
              <StatusBadge status={a.status} />
              <StatusBadge status={a.availability} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {a.code ? `Astro code ${a.code}` : 'No astro code yet'} · {a.experienceYears} yrs · Joined {formatDate(a.joinedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Phone className="size-4" />{a.phone || '—'}</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="size-4" />{a.email || '—'}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{a.city || '—'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.status === 'pending' && (
              <>
                <Button variant="success" icon={<CheckCircle2 className="size-4" />} onClick={approve}>Approve</Button>
                <Button variant="danger" icon={<XCircle className="size-4" />} onClick={reject}>Reject</Button>
              </>
            )}
            {(a.status === 'active' || a.status === 'suspended') && (
              <Button variant={a.status === 'suspended' ? 'success' : 'outline'} icon={a.status === 'suspended' ? <RotateCcw className="size-4" /> : <Ban className="size-4" />} onClick={toggleSuspend}>
                {a.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </Button>
            )}
            {a.status === 'rejected' && (
              <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => run(() => reopenApplication('astrologer', a.id), 'Moved back to pending review', 'info')}>
                Reopen application
              </Button>
            )}
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Edit profile</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="Sessions" value={formatNumber(a.sessions)} />
          <MiniStat label="Rating" value={<span className="inline-flex items-center gap-1"><Star className="size-4 fill-gold-400 text-gold-400" />{a.rating.toFixed(1)}</span>} hint={`${formatNumber(a.reviews)} reviews`} />
          <MiniStat label="Reviews" value={formatNumber(a.reviews)} />
          <MiniStat label="Wallet" value={formatINR(a.walletBalance)} hint="Withdrawable balance" />
        </div>
      </Card>

      {a.status === 'rejected' && profile?.rejectionReason && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Rejected: {profile.rejectionReason}</p>}
      {a.status === 'suspended' && profile?.blockedReason && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Suspended: {profile.blockedReason}</p>}

      <PendingRequestsBanner partnerId={a.id} />

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && <AstroOverviewTab astrologer={a} profile={profile} />}
      {tab === 'kyc' && <AstroKycTab astrologer={a} profile={profile} />}
      {tab === 'earnings' && <AstroEarningsTab astrologer={a} profile={profile} />}
      {tab === 'availability' && <AstroScheduleCard astrologer={a} profile={profile} />}
      {tab === 'sessions' && <AstroSessionsTab astrologer={a} profile={profile} />}

      <AstrologerFormModal open={editing} onClose={() => setEditing(false)} astrologer={a} bio={profile?.bio} />
      <ApproveAstrologerModal open={approving} onClose={() => setApproving(false)} astrologer={a} />
    </>
  )
}
