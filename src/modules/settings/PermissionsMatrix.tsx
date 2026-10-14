import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Select, Toggle, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useCollection } from '@/lib/store'
import { adminsDb, logAudit, rolesDb } from './data'
import { ADMIN_ROLES, PERMISSION_MODULES, type AdminRole, type PermissionModule, type RolePermissions } from './types'

export default function PermissionsMatrix() {
  const { items: roles } = useCollection(rolesDb)
  const { items: admins } = useCollection(adminsDb)
  const [roleId, setRoleId] = useState<AdminRole>('Operations')
  const role = roles.find(r => r.id === roleId)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader title="Roles" />
        <CardBody className="space-y-2 p-3">
          {ADMIN_ROLES.map(r => {
            const def = roles.find(x => x.id === r)
            const count = admins.filter(a => a.role === r).length
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleId(r)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${roleId === r ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-gray-50'}`}>
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r}</span>
                  <Badge>{count} users</Badge>
                </span>
                <span className="mt-0.5 block text-xs text-muted">{def?.description}</span>
              </button>
            )
          })}
        </CardBody>
      </Card>
      <div className="lg:col-span-2">{role && <RoleEditor key={role.id} role={role} onRoleChange={setRoleId} />}</div>
    </div>
  )
}

function RoleEditor({ role, onRoleChange }: { role: RolePermissions; onRoleChange: (r: AdminRole) => void }) {
  const toast = useToast()
  const { admin } = useAuth()
  const [perms, setPerms] = useState(role.permissions)
  const locked = role.id === 'Super Admin'
  const dirty = JSON.stringify(perms) !== JSON.stringify(role.permissions)

  const toggle = (m: PermissionModule, kind: 'view' | 'edit', v: boolean) =>
    setPerms(p => {
      const cur = p[m]
      // Edit implies view; removing view removes edit.
      const next = kind === 'edit' ? { view: v ? true : cur.view, edit: v } : { view: v, edit: v ? cur.edit : false }
      return { ...p, [m]: next }
    })

  const save = async () => {
    await rolesDb.update(role.id, { permissions: perms })
    const changed = PERMISSION_MODULES.filter(m => JSON.stringify(perms[m]) !== JSON.stringify(role.permissions[m]))
    logAudit(admin, 'Admin Users', `Updated ${role.id} permissions`, changed.join(', '))
    toast(`${role.id} permissions saved`)
  }

  return (
    <Card>
      <CardHeader
        title={`${role.id} permissions`}
        subtitle={locked ? 'Super Admin always has full access' : 'Toggle what this role can view and edit'}
        action={
          <div className="lg:hidden">
            <Select aria-label="Role" value={role.id} options={ADMIN_ROLES} onChange={e => onRoleChange(e.target.value as AdminRole)} />
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70 text-left text-xs font-medium tracking-wide text-muted uppercase">
              <th className="px-5 py-3">Module</th>
              <th className="px-5 py-3 text-center">View</th>
              <th className="px-5 py-3 text-center">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMISSION_MODULES.map(m => (
              <tr key={m}>
                <td className="px-5 py-2.5 font-medium whitespace-nowrap">{m}</td>
                <td className="px-5 py-2.5 text-center">
                  <Toggle checked={perms[m].view} disabled={locked} onChange={v => toggle(m, 'view', v)} />
                </td>
                <td className="px-5 py-2.5 text-center">
                  <Toggle checked={perms[m].edit} disabled={locked} onChange={v => toggle(m, 'edit', v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
        {locked ? (
          <span className="mr-auto inline-flex items-center gap-1.5 text-sm text-muted">
            <Lock className="size-4" /> Locked
          </span>
        ) : (
          <span className="mr-auto text-sm text-muted">{dirty ? 'Unsaved changes' : 'Up to date'}</span>
        )}
        <Button variant="outline" disabled={!dirty} onClick={() => setPerms(role.permissions)}>
          Reset
        </Button>
        <Button disabled={!dirty || locked} onClick={save}>
          Save permissions
        </Button>
      </div>
    </Card>
  )
}
