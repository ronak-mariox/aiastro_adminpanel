import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Banknote,
  CalendarCheck,
  ChevronRight,
  IndianRupee,
  LifeBuoy,
  MessagesSquare,
  Package,
  Radio,
  ShieldCheck,
  Star,
  TrendingUp,
  Undo2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, CardHeader, PageHeader, StatCard, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, formatINR, formatNumber } from '@/lib/utils'
import ActivityFeed from './ActivityFeed'
import ConsultTypeChart from './ConsultTypeChart'
import RevenueChart from './RevenueChart'
import TopPartners from './TopPartners'
import { gmvOf, pctChange, useOverview, type Overview } from './data'

type QuickLink = { label: string; hint: string; to: string; icon: LucideIcon; count?: number; tone: string; permission?: string }

const EMPTY: Overview = {
  generatedAt: '',
  revenueTrend: [],
  live: {
    activeConsultations: 0,
    activeChat: 0,
    activeCall: 0,
    activeVideo: 0,
    astrologersOnline: 0,
    pujaBookingsToday: 0,
    pujaBookingsYesterday: 0,
    storeOrdersToday: 0,
    storeOrdersYesterday: 0,
    newUsersToday: 0,
    newUsersYesterday: 0,
  },
  queues: { pendingApprovals: 0, partnerOnboardings: 0, documentsPending: 0, payoutRequests: 0, payoutsDue: 0, refundRequests: 0, supportOpen: 0, flaggedReviews: 0, ordersToShip: 0 },
  consultationsByType: { chat: 0, call: 0, video: 0 },
  recentActivity: [],
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const { data, error, loading } = useOverview()
  const o = data ?? EMPTY
  const { live, queues } = o

  useEffect(() => {
    if (error) toast(errorMessage(error), 'error')
  }, [error, toast])

  const trend = o.revenueTrend
  const today = trend[trend.length - 1]
  const yesterday = trend[trend.length - 2]
  const thisMonth = today?.date.slice(0, 7) ?? ''
  const monthPoints = trend.filter(p => p.date.startsWith(thisMonth))
  const gmvToday = today ? gmvOf(today) : 0
  const gmvYesterday = yesterday ? gmvOf(yesterday) : 0
  const gmvMonth = monthPoints.reduce((a, p) => a + gmvOf(p), 0)
  const revenueToday = today?.platform ?? 0
  const revenueYesterday = yesterday?.platform ?? 0
  const revenueMonth = monthPoints.reduce((a, p) => a + p.platform, 0)
  const pendingApprovals = queues.pendingApprovals
  const dash = (n: number) => (loading ? '…' : formatNumber(n))

  const quickLinks: QuickLink[] = [
    { label: 'Approvals', hint: 'KYC, price & bank changes', to: '/approvals', icon: ShieldCheck, count: pendingApprovals, tone: 'bg-amber-50 text-amber-600', permission: 'astrologers.view' },
    { label: 'Payouts', hint: 'Partner withdrawal requests', to: '/payouts', icon: Banknote, count: queues.payoutRequests, tone: 'bg-violet-50 text-violet-600', permission: 'wallets.view' },
    { label: 'Refunds', hint: 'Refund & dispute tickets', to: '/refunds', icon: Undo2, count: queues.refundRequests, tone: 'bg-gray-100 text-gray-600', permission: 'payments.view' },
    { label: 'Support tickets', hint: 'Open tickets & unread chats', to: '/support', icon: LifeBuoy, count: queues.supportOpen, tone: 'bg-sky-50 text-sky-600', permission: 'consultations.view' },
    { label: 'Flagged reviews', hint: 'Reported by partners', to: '/reviews', icon: Star, count: queues.flaggedReviews, tone: 'bg-gold-100 text-gold-500', permission: 'reviews.view' },
    { label: 'Store orders', hint: 'Placed & packed, to ship', to: '/orders', icon: Package, count: queues.ordersToShip, tone: 'bg-brand-50 text-brand-600', permission: 'shop.view' },
  ].filter(q => can(q.permission))

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          o.generatedAt
            ? `Platform overview · ${new Date(o.generatedAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Platform overview'
        }
        actions={
          can('payments.view') && (
            <Button variant="outline" icon={<TrendingUp className="size-4" />} onClick={() => navigate('/transactions')}>
              Financial reports
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV today" value={formatINR(gmvToday)} icon={IndianRupee} change={pctChange(gmvToday, gmvYesterday)} hint={`${formatINR(gmvMonth)} this month`} />
        <StatCard
          label="Platform revenue today"
          value={formatINR(revenueToday)}
          icon={TrendingUp}
          tone="green"
          change={pctChange(revenueToday, revenueYesterday)}
          hint={`${formatINR(revenueMonth)} this month`}
        />
        <StatCard
          label="Active consultations"
          value={dash(live.activeConsultations)}
          icon={Radio}
          tone="purple"
          hint={`${live.activeChat} chat · ${live.activeCall} call${live.activeVideo ? ` · ${live.activeVideo} video` : ''} · ${live.astrologersOnline} astrologers online`}
        />
        <StatCard
          label="Puja bookings today"
          value={dash(live.pujaBookingsToday)}
          icon={CalendarCheck}
          tone="gold"
          change={pctChange(live.pujaBookingsToday, live.pujaBookingsYesterday)}
          hint="vs yesterday"
        />
        <StatCard
          label="Store orders today"
          value={dash(live.storeOrdersToday)}
          icon={Package}
          tone="blue"
          change={pctChange(live.storeOrdersToday, live.storeOrdersYesterday)}
          hint="vs yesterday"
        />
        <StatCard
          label="New users today"
          value={dash(live.newUsersToday)}
          icon={UserPlus}
          tone="green"
          change={pctChange(live.newUsersToday, live.newUsersYesterday)}
          hint="vs yesterday"
        />
        <StatCard label="Pending approvals" value={dash(pendingApprovals)} icon={ShieldCheck} tone="gold" hint={`${queues.partnerOnboardings} partner onboardings`} />
        <StatCard label="Payouts due" value={formatINR(queues.payoutsDue)} icon={Banknote} tone="purple" hint={`${queues.payoutRequests} withdrawal requests`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart trend={trend} />
        </div>
        <ConsultTypeChart mix={o.consultationsByType} />
      </div>

      <div className="mt-6">
        <TopPartners />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityFeed items={o.recentActivity} />
        </div>
        <Card>
          <CardHeader title="Queues" subtitle="Items waiting on admin" />
          <ul className="divide-y divide-line">
            {quickLinks.map(q => (
              <li key={q.to}>
                <Link to={q.to} className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40">
                  <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-xl', q.tone)}>
                    <q.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{q.label}</span>
                    <span className="block truncate text-xs text-muted">{q.hint}</span>
                  </span>
                  {q.count !== undefined && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">{q.count}</span>}
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/consultations" className="flex items-center gap-3 px-5 py-3 transition hover:bg-brand-50/40">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <MessagesSquare className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Live consultations</span>
                  <span className="block truncate text-xs text-muted">Monitor ongoing sessions</span>
                </span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{live.activeConsultations}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </>
  )
}
