import { useMemo, useState } from 'react'
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserCog, UserX, Users } from 'lucide-react'
import { Avatar, Badge, Button, DataTable, IconButton, PageHeader, StatCard, StatusBadge, Tabs, useConfirm, useToast, type Column } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { reportError } from '@/lib/remoteCollection'
import { useCollection } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import AdminFormModal from './AdminFormModal'
import AuditLogTable from './AuditLogTable'
import { adminsDb, logAudit } from './data'
import PermissionsMatrix from './PermissionsMatrix'
import { ADMIN_ROLES, type AdminUser } from './types'

type Tab = 'users' | 'roles' | 'audit'

export default function AdminsPage() {
  const { items, loading, update, remove } = useCollection(adminsDb)
  const { admin } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<Tab>('users')
  const [modal, setModal] = useState<{ open: boolean; editing: AdminUser | null }>({ open: false, editing: null })

  const stats = useMemo(
    () => ({
      active: items.filter(a => a.status === 'active').length,
      twoFA: items.length ? Math.round((items.filter(a => a.twoFA).length / items.length) * 100) : 0,
      superAdmins: items.filter(a => a.role === 'Super Admin').length,
      neverLogged: items.filter(a => !a.lastLoginAt).length,
    }),
    [items],
  )

  const isSelf = (a: AdminUser) => a.email === admin?.email

  const toggleStatus = async (a: AdminUser) => {
    const deactivate = a.status === 'active'
    if (deactivate) {
      if (a.role === 'Super Admin' && items.filter(x => x.role === 'Super Admin' && x.status === 'active').length <= 1) {
        toast('At least one active Super Admin is required', 'error')
        return
      }
      const ok = await confirm({ title: `Deactivate ${a.name}?`, message: 'They will be signed out and can no longer access the admin panel.', confirmLabel: 'Deactivate', tone: 'danger' })
      if (ok === false) return
    }
    await update(a.id, { status: deactivate ? 'inactive' : 'active' })
    logAudit(admin, 'Admin Users', deactivate ? 'Deactivated admin' : 'Activated admin', a.email)
    toast(deactivate ? `${a.name} deactivated` : `${a.name} activated`)
  }

  const reset2FA = async (a: AdminUser) => {
    const ok = await confirm({ title: 'Sign out everywhere?', message: `${a.name} is signed out on every device and must sign in again (with the emailed code).`, confirmLabel: 'Sign out everywhere' })
    if (ok === false) return
    try {
      await api.patch(`/admin/team/${a.id}`, { signOutEverywhere: true })
      logAudit(admin, 'Admin Users', 'Signed out everywhere', a.email)
      toast(`${a.name} signed out on every device`)
    } catch (e) {
      reportError(e)
    }
  }

  const del = async (a: AdminUser) => {
    if (a.role === 'Super Admin' && items.filter(x => x.role === 'Super Admin').length <= 1) {
      toast('Cannot delete the last Super Admin', 'error')
      return
    }
    const ok = await confirm({ title: `Revoke ${a.name}?`, message: 'Their access is revoked (the account is suspended and signed out). Audit history is kept.', confirmLabel: 'Revoke', tone: 'danger' })
    if (ok === false) return
    await remove(a.id)
    logAudit(admin, 'Admin Users', 'Deleted admin', a.email)
    toast('Access revoked', 'info')
    void adminsDb.refresh()
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Admin',
      sortValue: a => a.name,
      render: a => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <Avatar name={a.name} size={34} />
          <div>
            <p className="font-medium">
              {a.name} {isSelf(a) && <span className="text-xs text-muted">(you)</span>}
            </p>
            <p className="text-xs text-muted">{a.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortValue: a => a.role, render: a => <Badge tone={a.role === 'Super Admin' ? 'brand' : 'gray'}>{a.role}</Badge> },
    { key: 'status', header: 'Status', sortValue: a => a.status, render: a => <StatusBadge status={a.status} /> },
    {
      key: '2fa',
      header: '2FA',
      sortValue: a => Number(a.twoFA),
      render: a => (a.twoFA ? <Badge tone="green">Enabled</Badge> : <Badge tone="amber">Off</Badge>),
    },
    {
      key: 'login',
      header: 'Last login',
      sortValue: a => a.lastLoginAt ?? '',
      render: a => <span className="text-xs whitespace-nowrap text-muted">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Never (invite pending)'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: a => (
        <div className="flex justify-end gap-0.5">
          <IconButton aria-label="Edit" title="Edit" onClick={() => setModal({ open: true, editing: a })}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton aria-label="Sign out everywhere" title="Sign out everywhere" onClick={() => reset2FA(a)}>
            <KeyRound className="size-4" />
          </IconButton>
          <IconButton aria-label={a.status === 'active' ? 'Deactivate' : 'Activate'} title={a.status === 'active' ? 'Deactivate' : 'Activate'} disabled={isSelf(a)} onClick={() => toggleStatus(a)}>
            {a.status === 'active' ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
          </IconButton>
          <IconButton aria-label="Delete" title="Delete" disabled={isSelf(a)} onClick={() => del(a)} className="hover:text-red-600">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Admin Users"
        subtitle="Panel accounts, role permissions and the audit trail"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({ open: true, editing: null })}>
            Invite admin
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active admins" value={stats.active} icon={Users} hint={`of ${items.length} accounts`} />
        <StatCard label="2FA adoption" value={`${stats.twoFA}%`} icon={ShieldCheck} tone="green" />
        <StatCard label="Super Admins" value={stats.superAdmins} icon={UserCog} tone="purple" />
        <StatCard label="Pending invites" value={stats.neverLogged} icon={KeyRound} tone="gold" hint="Never signed in" />
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'users', label: 'Admin accounts', count: items.length },
          { key: 'roles', label: 'Roles & permissions' },
          { key: 'audit', label: 'Audit log' },
        ]}
      />
      {tab === 'users' && (
        <DataTable
          rows={items}
          columns={columns}
          rowKey={a => a.id}
          loading={loading}
          searchText={a => `${a.name} ${a.email} ${a.phone}`}
          searchPlaceholder="Search name or email…"
          filters={[
            { key: 'role', label: 'Role', options: ADMIN_ROLES, match: (a, v) => a.role === v },
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'], match: (a, v) => a.status === v.toLowerCase() },
            { key: '2fa', label: '2FA', options: ['Enabled', 'Off'], match: (a, v) => a.twoFA === (v === 'Enabled') },
          ]}
        />
      )}
      {tab === 'roles' && <PermissionsMatrix />}
      {tab === 'audit' && <AuditLogTable />}
      <AdminFormModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
    </div>
  )
}
