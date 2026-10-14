import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Download, UserCheck, UserPlus, Users, Wallet } from 'lucide-react'
import { Avatar, Button, DataTable, PageHeader, Segmented, StatCard, StatusBadge, useToast, type Column, type Filter } from '@/components/ui'
import { customersDb, type AccountStatus, type Customer } from '@/data'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useCollection } from '@/lib/store'
import { formatDate, formatINR, formatNumber } from '@/lib/utils'
import { downloadCsv } from './csv'
import ProfileFormModal, { type ProfileForm } from './ProfileFormModal'

type StatusTab = 'all' | AccountStatus

const DAY = 86400000
const NOW = Date.now()
const THIS_MONTH = new Date(NOW).toISOString().slice(0, 7)

export default function CustomersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const { items, loading, create } = useCollection(customersDb)
  const [tab, setTab] = useState<StatusTab>('all')
  const [creating, setCreating] = useState(false)
  const [visibleRows, setVisibleRows] = useState<Customer[]>([])

  const rows = useMemo(() => (tab === 'all' ? items : items.filter(c => c.status === tab)), [items, tab])

  const activeToday = items.filter(c => c.status === 'active' && NOW - new Date(c.lastActiveAt).getTime() < DAY).length
  const restricted = items.filter(c => c.status !== 'active')
  const avgWallet = items.length ? Math.round(items.reduce((a, c) => a + c.walletBalance, 0) / items.length) : 0
  const joinedThisMonth = items.filter(c => c.joinedAt.startsWith(THIS_MONTH)).length

  const cities = useMemo(() => [...new Set(items.map(c => c.city).filter(Boolean))].sort(), [items])

  const filters: Filter<Customer>[] = [
    { key: 'city', label: 'City', options: cities, match: (c, v) => c.city === v },
    { key: 'gender', label: 'Gender', options: ['Female', 'Male', 'Other'], match: (c, v) => c.gender === v },
    {
      key: 'wallet',
      label: 'Wallet',
      options: ['Zero balance', 'Below ₹100', '₹100+'],
      match: (c, v) => (v === 'Zero balance' ? c.walletBalance === 0 : v === 'Below ₹100' ? c.walletBalance > 0 && c.walletBalance < 100 : c.walletBalance >= 100),
    },
  ]

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortValue: c => c.name,
      render: c => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-medium">{c.name}</p>
            <p className="truncate text-xs text-muted">
              {[c.userCode, c.phone || c.email].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'city', header: 'City', sortValue: c => c.city, render: c => <span className="whitespace-nowrap">{c.city || '—'}</span> },
    { key: 'gender', header: 'Gender', render: c => c.gender || '—' },
    { key: 'wallet', header: 'Wallet', align: 'right', sortValue: c => c.walletBalance, render: c => formatINR(c.walletBalance) },
    { key: 'points', header: 'Points', align: 'right', sortValue: c => c.rewardPoints, render: c => formatNumber(c.rewardPoints) },
    { key: 'spent', header: 'Total spent', align: 'right', sortValue: c => c.totalSpent, render: c => <span className="font-medium">{formatINR(c.totalSpent)}</span> },
    {
      key: 'activity',
      header: 'Activity',
      sortValue: c => c.consultations + c.bookings + c.orders,
      render: c => (
        <span className="text-xs whitespace-nowrap text-muted">
          {c.consultations} consults · {c.bookings} pujas · {c.orders} orders
        </span>
      ),
    },
    { key: 'joined', header: 'Joined', sortValue: c => c.joinedAt, render: c => <span className="whitespace-nowrap">{formatDate(c.joinedAt)}</span> },
    { key: 'lastActive', header: 'Last active', sortValue: c => c.lastActiveAt, render: c => <span className="whitespace-nowrap">{formatDate(c.lastActiveAt)}</span> },
    { key: 'status', header: 'Status', sortValue: c => c.status, render: c => <StatusBadge status={c.status} /> },
  ]

  const exportCsv = () => {
    downloadCsv(`vedrashi-customers-${new Date().toISOString().slice(0, 10)}.csv`, visibleRows, [
      { header: 'ID', value: c => c.id },
      { header: 'Name', value: c => c.name },
      { header: 'Phone', value: c => c.phone },
      { header: 'Email', value: c => c.email },
      { header: 'Gender', value: c => c.gender },
      { header: 'DOB', value: c => c.dob },
      { header: 'TOB', value: c => c.tob },
      { header: 'Birth place', value: c => c.birthPlace },
      { header: 'City', value: c => c.city },
      { header: 'State', value: c => c.state },
      { header: 'Wallet (INR)', value: c => c.walletBalance },
      { header: 'Reward points', value: c => c.rewardPoints },
      { header: 'Total spent (INR)', value: c => c.totalSpent },
      { header: 'Consultations', value: c => c.consultations },
      { header: 'Puja bookings', value: c => c.bookings },
      { header: 'Orders', value: c => c.orders },
      { header: 'Referral code', value: c => c.referralCode },
      { header: 'Status', value: c => c.status },
      { header: 'Joined', value: c => c.joinedAt },
      { header: 'Last active', value: c => c.lastActiveAt },
    ])
    toast(`Exported ${rows.length} customers`)
  }

  const addCustomer = async (f: ProfileForm) => {
    try {
      const created = await create({
        ...f,
        id: '',
        walletBalance: 0,
        rewardPoints: 0,
        referralCode: '',
        totalSpent: 0,
        consultations: 0,
        orders: 0,
        bookings: 0,
        status: 'active',
        joinedAt: '',
        lastActiveAt: '',
      })
      toast(`${f.name} added`)
      navigate(`/customers/${created.id}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      throw e
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone who signed up on the VedRashi app"
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export CSV
            </Button>
            {can('users.manage') && (
              <Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>
                Add customer
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={formatNumber(items.length)} icon={Users} hint={`${joinedThisMonth} joined this month`} />
        <StatCard label="Active today" value={formatNumber(activeToday)} icon={UserCheck} tone="green" hint="Seen in the last 24h" />
        <StatCard
          label="Blocked / suspended"
          value={formatNumber(restricted.length)}
          icon={Ban}
          tone="purple"
          hint={`${restricted.filter(c => c.status === 'blocked').length} blocked · ${restricted.filter(c => c.status === 'suspended').length} suspended`}
        />
        <StatCard label="Avg wallet balance" value={formatINR(avgWallet)} icon={Wallet} tone="gold" hint={`${formatINR(items.reduce((a, c) => a + c.walletBalance, 0))} held in wallets`} />
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'all', label: `All (${items.length})` },
            { key: 'active', label: `Active (${items.filter(c => c.status === 'active').length})` },
            { key: 'blocked', label: `Blocked (${items.filter(c => c.status === 'blocked').length})` },
            { key: 'suspended', label: `Suspended (${items.filter(c => c.status === 'suspended').length})` },
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={c => c.id}
        loading={loading}
        searchText={c => `${c.id} ${c.userCode ?? ''} ${c.name} ${c.phone} ${c.phone.replace(/\D/g, '')} ${c.email} ${c.referralCode}`}
        searchPlaceholder="Search name, phone, email, ID…"
        filters={filters}
        onRowClick={c => navigate(`/customers/${c.id}`)}
        onVisibleRowsChange={setVisibleRows}
      />

      {creating && <ProfileFormModal open onClose={() => setCreating(false)} title="Add customer" submitLabel="Create customer" onSubmit={addCustomer} />}
    </>
  )
}
