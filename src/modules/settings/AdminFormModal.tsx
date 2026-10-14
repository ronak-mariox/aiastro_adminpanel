import { useState } from 'react'
import { Button, Input, Modal, Select, Toggle, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { adminsDb, logAudit, takeTemporaryPassword } from './data'
import { ADMIN_ROLES, type AdminRole, type AdminUser } from './types'

type Form = { name: string; email: string; phone: string; role: AdminRole; status: AdminUser['status']; twoFA: boolean }

const blank: Form = { name: '', email: '', phone: '', role: 'Support', status: 'active', twoFA: true }

export default function AdminFormModal({ open, editing, onClose }: { open: boolean; editing: AdminUser | null; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit admin user' : 'Invite admin user'} subtitle={editing ? editing.email : 'A temporary password is generated for them to sign in with'}>
      {open && <AdminForm key={editing?.id ?? 'new'} editing={editing} onClose={onClose} />}
    </Modal>
  )
}

function AdminForm({ editing, onClose }: { editing: AdminUser | null; onClose: () => void }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { admin } = useAuth()
  const [form, setForm] = useState<Form>(editing ? { name: editing.name, email: editing.email, phone: editing.phone, role: editing.role, status: editing.status, twoFA: editing.twoFA } : blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Enter a name'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email'
    else if (adminsDb.snapshot().some(a => a.email.toLowerCase() === form.email.trim().toLowerCase() && a.id !== editing?.id)) e.email = 'An admin with this email already exists'
    if (form.phone.trim() && !/^\+91[\d\s]{10,13}$/.test(form.phone.trim())) e.phone = 'Use +91 followed by 10 digits'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const data = { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }
    try {
      if (editing) {
        await adminsDb.update(editing.id, data)
        logAudit(admin, 'Admin Users', editing.role !== data.role ? `Changed role to ${data.role}` : 'Updated admin user', data.email)
        toast('Admin user updated')
        onClose()
      } else {
        await adminsDb.create({ id: `new-${Date.now()}`, ...data, lastLoginAt: null, createdAt: new Date().toISOString() })
        logAudit(admin, 'Admin Users', `Invited admin (${data.role})`, data.email)
        const password = takeTemporaryPassword()
        onClose()
        // Shown once — the API stores only its hash.
        await confirm({
          title: 'Admin account created',
          message: `Share these sign-in details with ${data.email} securely. Temporary password: ${password ?? '(not returned)'} — it is shown only now; they will be asked to change it.`,
          confirmLabel: 'Done',
        })
      }
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Full name" value={form.name} error={errors.name} onChange={e => set('name', e.target.value)} />
        </div>
        <Input label="Email" type="email" disabled={!!editing} value={form.email} error={errors.email} onChange={e => set('email', e.target.value)} />
        <Input label="Phone" hint="optional" value={form.phone} error={errors.phone} onChange={e => set('phone', e.target.value)} />
        <Select label="Role" value={form.role} options={ADMIN_ROLES} onChange={e => set('role', e.target.value as AdminRole)} />
        <Select
          label="Status"
          value={form.status}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          onChange={e => set('status', e.target.value as AdminUser['status'])}
        />
        <div className="sm:col-span-2">
          <Toggle checked={form.twoFA} disabled onChange={v => set('twoFA', v)} label="Two-factor sign-in (emailed code) — set for everyone under Settings → Platform" />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={saving} onClick={submit}>
          {editing ? 'Save changes' : 'Create account'}
        </Button>
      </div>
    </>
  )
}
