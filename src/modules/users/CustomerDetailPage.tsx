import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, Bell, CalendarDays, Clock, Coins, Mail, MapPin, Pencil, Phone, PauseCircle, PlayCircle, ShieldCheck, Sparkles, UserX, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatusBadge, useConfirm, useToast } from '@/components/ui'
import { customersDb, type AccountStatus } from '@/data'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, formatDateTime, formatINR, formatNumber } from '@/lib/utils'
import AdjustModal, { type Adjustment } from './AdjustModal'
import { customerActions, useCustomerDetail } from './data'
import HistoryTabs from './HistoryTabs'
import NotifyModal, { type NotificationDraft } from './NotifyModal'
import ProfileFormModal, { type ProfileForm } from './ProfileFormModal'
import type { AdminActionKind } from './types'

type ModalKey = 'wallet' | 'points' | 'edit' | 'notify' | null

const age = (dob: string) => {
  if (!dob) return 0
  const d = new Date(dob)
  const n = new Date()
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { detail, loading, refresh } = useCustomerDetail(id)
  const c = detail?.customer
  const actions = detail?.actions ?? []
  const confirm = useConfirm()
  const toast = useToast()
  const { can } = useAuth()
  const [modal, setModal] = useState<ModalKey>(null)
  const canManage = can('users.manage')
  const canAdjust = can('wallets.adjust')

  if (loading && !c) return <div className="h-64 animate-pulse rounded-2xl bg-white" />
  if (!c)
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Customer not found"
          text={`No customer with id ${id}.`}
          action={
            <Button variant="outline" onClick={() => navigate('/customers')}>
              Back to customers
            </Button>
          }
        />
      </Card>
    )

  /** Runs an API change, refreshes the page from the server, and reports the result. */
  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn()
      await refresh(true)
      toast(done)
    } catch (e) {
      toast(errorMessage(e), 'error')
      throw e
    }
  }

  const changeStatus = async (next: AccountStatus, verb: string, kind: AdminActionKind, needsReason: boolean) => {
    const reason = await confirm({
      title: `${verb} ${c.name}?`,
      message:
        next === 'blocked'
          ? 'The customer will be logged out and cannot sign in, consult or place orders. Wallet balance is retained.'
          : next === 'suspended'
            ? 'The customer will be signed out and cannot sign in, consult, book pujas or place orders until reactivated. Wallet balance is retained.'
            : 'The customer will regain full access to the app.',
      confirmLabel: verb,
      tone: next === 'active' ? 'success' : 'danger',
      withReason: needsReason,
      reasonLabel: `Reason for ${verb.toLowerCase()}`,
    })
    if (reason === false) return
    await run(() => customerActions.setStatus(c.id, next, reason || undefined), `${c.name} ${kind}`).catch(() => undefined)
  }

  const adjustWallet = async (a: Adjustment) => {
    const balance = a.kind === 'credit' ? c.walletBalance + a.amount : c.walletBalance - a.amount
    await run(
      () => customerActions.adjustWallet(c.id, a.kind, a.amount, a.reason),
      `${formatINR(a.amount)} ${a.kind === 'credit' ? 'credited to' : 'debited from'} wallet · balance ${formatINR(balance)}`,
    )
  }

  const adjustPoints = async (a: Adjustment) => {
    const total = a.kind === 'credit' ? c.rewardPoints + a.amount : c.rewardPoints - a.amount
    await run(
      () => customerActions.adjustPoints(c.id, a.kind === 'credit' ? a.amount : -a.amount, a.reason),
      `${formatNumber(a.amount)} points ${a.kind === 'credit' ? 'added' : 'removed'} · ${formatNumber(total)} pts`,
    )
  }

  const saveProfile = async (f: ProfileForm) => {
    await run(() => customersDb.update(c.id, f), 'Profile updated')
  }

  const sendNotification = async (n: NotificationDraft) => {
    await run(() => customerActions.notify(c.id, n.title, n.message, n.channels), `Notification sent to ${c.name}`)
  }

  const profileInitial: ProfileForm = { name: c.name, phone: c.phone, email: c.email, gender: c.gender, dob: c.dob, tob: c.tob, birthPlace: c.birthPlace, city: c.city, state: c.state }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: c.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name}
            <StatusBadge status={c.status} />
          </span>
        }
        subtitle={`${c.userCode ?? c.id} · Joined ${formatDate(c.joinedAt)} · Last active ${formatDateTime(c.lastActiveAt)}`}
        actions={
          canManage && (
          <>
            <Button variant="outline" icon={<Bell className="size-4" />} onClick={() => setModal('notify')}>
              Notify
            </Button>
            <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => setModal('edit')}>
              Edit
            </Button>
            {c.status === 'active' && (
              <Button variant="outline" icon={<PauseCircle className="size-4" />} onClick={() => changeStatus('suspended', 'Suspend', 'suspended', true)}>
                Suspend
              </Button>
            )}
            {c.status === 'suspended' && (
              <Button variant="success" icon={<PlayCircle className="size-4" />} onClick={() => changeStatus('active', 'Reactivate', 'reactivated', false)}>
                Reactivate
              </Button>
            )}
            {c.status === 'blocked' ? (
              <Button variant="success" icon={<ShieldCheck className="size-4" />} onClick={() => changeStatus('active', 'Unblock', 'unblocked', false)}>
                Unblock
              </Button>
            ) : (
              <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => changeStatus('blocked', 'Block', 'blocked', true)}>
                Block
              </Button>
            )}
          </>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar name={c.name} size={56} />
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex items-center gap-2 truncate">
                  <Phone className="size-4 shrink-0 text-muted" />
                  {c.phone || '—'}
                </p>
                <p className="flex items-center gap-2 truncate">
                  <Mail className="size-4 shrink-0 text-muted" />
                  {c.email || '—'}
                </p>
                <p className="flex items-center gap-2 truncate">
                  <MapPin className="size-4 shrink-0 text-muted" />
                  {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </CardBody>
            <div className="grid grid-cols-3 border-t border-line text-center">
              {[
                ['Consults', c.consultations],
                ['Pujas', c.bookings],
                ['Orders', c.orders],
              ].map(([l, v]) => (
                <div key={l} className="border-r border-line px-2 py-3 last:border-r-0">
                  <p className="text-lg font-semibold">{v}</p>
                  <p className="text-xs text-muted">{l}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Wallet & rewards" subtitle={`Lifetime spend ${formatINR(c.totalSpent)}`} />
            <CardBody className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="flex items-center gap-1.5 text-xs text-brand-700">
                  <Wallet className="size-3.5" /> Wallet balance
                </p>
                <p className="mt-1 text-xl font-semibold text-brand-700">{formatINR(c.walletBalance)}</p>
                <Button size="sm" variant="secondary" className="mt-3 w-full bg-white" disabled={!canAdjust} onClick={() => setModal('wallet')}>
                  Adjust wallet
                </Button>
              </div>
              <div className="rounded-xl bg-gold-100 p-4">
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <Coins className="size-3.5" /> Reward points
                </p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{formatNumber(c.rewardPoints)}</p>
                <Button size="sm" variant="outline" className="mt-3 w-full" disabled={!canAdjust} onClick={() => setModal('points')}>
                  Adjust points
                </Button>
              </div>
              <p className="col-span-2 text-xs text-muted">
                Referral code <Badge tone="purple">{c.referralCode || '—'}</Badge>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Birth details" subtitle="Used for kundli & consultations" action={<Sparkles className="size-5 text-gold-500" />} />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Date of birth', value: <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted" />{c.dob ? `${formatDate(c.dob)} (${age(c.dob)} yrs)` : '—'}</span> },
                  { label: 'Time of birth', value: <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-muted" />{c.tob}</span> },
                  { label: 'Place of birth', value: c.birthPlace || '—' },
                  { label: 'Gender', value: c.gender || '—' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Admin activity" subtitle="Audit trail for this account" />
            {actions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No admin actions yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {actions.slice(0, 8).map(a => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <p className="font-medium">{a.summary}</p>
                    {a.reason && <p className="mt-0.5 text-muted">Reason: {a.reason}</p>}
                    <p className="mt-0.5 text-xs text-muted">
                      {a.admin} · {formatDateTime(a.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <HistoryTabs customer={c} history={detail!.history} onChanged={() => refresh(true)} />
        </div>
      </div>

      {modal === 'wallet' && <AdjustModal open mode="wallet" current={c.walletBalance} onClose={() => setModal(null)} onSubmit={adjustWallet} />}
      {modal === 'points' && <AdjustModal open mode="points" current={c.rewardPoints} onClose={() => setModal(null)} onSubmit={adjustPoints} />}
      {modal === 'edit' && <ProfileFormModal open title="Edit profile" submitLabel="Save changes" initial={profileInitial} onClose={() => setModal(null)} onSubmit={saveProfile} />}
      {modal === 'notify' && <NotifyModal open customerName={c.name} onClose={() => setModal(null)} onSubmit={sendNotification} />}
    </>
  )
}
