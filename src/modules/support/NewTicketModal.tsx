import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { astrologersDb, customersDb, panditsDb } from '@/data'
import { ApiError, errorMessage } from '@/lib/api'
import { ROLE_LABELS, type BackendAdminRole } from '@/lib/auth'
import { useCollection } from '@/lib/store'
import { agentsDb, createTicket, ticketsDb } from './data'
import {
  RAISED_BY,
  REFERENCE_TYPES,
  SLA_HOURS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type RaisedByType,
  type ReferenceType,
  type TicketCategory,
  type TicketPriority,
} from './types'
import { cap } from './format'

const dbOf = (type: RaisedByType) => (type === 'customer' ? customersDb : type === 'astrologer' ? astrologersDb : panditsDb)
const people = (rows: { id: string; name: string; phone: string }[]) => rows.map(p => ({ label: `${p.name || 'Unnamed'} (${p.phone || p.id})`, value: p.id }))

const empty = {
  raisedByType: 'customer' as RaisedByType,
  raisedById: '',
  category: 'payment' as TicketCategory,
  priority: 'medium' as TicketPriority,
  subject: '',
  body: '',
  refType: '' as ReferenceType | '',
  refId: '',
  assigneeId: '',
}

export default function NewTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setForm(f => ({ ...f, [k]: v }))

  // Subscribe without fetching; the list for the picked type is loaded only once the modal opens.
  const customers = useSyncExternalStore(customersDb.subscribe, customersDb.snapshot)
  const astrologers = useSyncExternalStore(astrologersDb.subscribe, astrologersDb.snapshot)
  const pandits = useSyncExternalStore(panditsDb.subscribe, panditsDb.snapshot)
  const { items: agents } = useCollection(agentsDb)
  const options = people(form.raisedByType === 'customer' ? customers : form.raisedByType === 'astrologer' ? astrologers : pandits)
  useEffect(() => {
    if (open) dbOf(form.raisedByType).list().catch(() => undefined)
  }, [open, form.raisedByType])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.raisedById) e.raisedById = 'Select who raised the ticket'
    if (form.subject.trim().length < 5) e.subject = 'Enter a subject (min 5 characters)'
    if (form.body.trim().length < 10) e.body = 'Describe the issue (min 10 characters)'
    if (form.refType && !form.refId.trim()) e.refId = 'Enter the reference id'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const ticket = await createTicket({
        raisedByType: form.raisedByType,
        raisedById: form.raisedById,
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        body: form.body.trim(),
        reference: form.refType ? { type: form.refType, id: form.refId.trim() } : undefined,
        assigneeId: form.assigneeId || undefined,
      })
      await ticketsDb.refresh?.().catch(() => undefined)
      setForm(empty)
      toast(`Ticket ${ticket.code} created`)
      onClose()
      onCreated(ticket.id)
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) setErrors(Object.fromEntries(e.errors.map(f => [f.field, f.message])))
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New support ticket"
      subtitle="Log an issue reported over phone, email or WhatsApp"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Create ticket
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Raised by"
          value={form.raisedByType}
          options={RAISED_BY.map(r => ({ label: cap(r), value: r }))}
          onChange={e => setForm(f => ({ ...f, raisedByType: e.target.value as RaisedByType, raisedById: '' }))}
        />
        <div>
          <Select
            label={cap(form.raisedByType)}
            value={form.raisedById}
            options={[{ label: 'Select…', value: '' }, ...options]}
            onChange={e => set('raisedById', e.target.value)}
          />
          {errors.raisedById && <span className="mt-1 block text-xs text-red-600">{errors.raisedById}</span>}
        </div>
        <Select label="Category" value={form.category} options={TICKET_CATEGORIES.map(c => ({ label: cap(c), value: c }))} onChange={e => set('category', e.target.value as TicketCategory)} />
        <Select
          label="Priority"
          hint={`SLA ${SLA_HOURS[form.priority]}h`}
          value={form.priority}
          options={TICKET_PRIORITIES.map(p => ({ label: cap(p), value: p }))}
          onChange={e => set('priority', e.target.value as TicketPriority)}
        />
        <div className="sm:col-span-2">
          <Input label="Subject" value={form.subject} error={errors.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Wallet not credited after UPI payment" />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" value={form.body} error={errors.body} onChange={e => set('body', e.target.value)} rows={4} />
        </div>
        <Select
          label="Linked reference"
          value={form.refType}
          options={[{ label: 'None', value: '' }, ...REFERENCE_TYPES.map(t => ({ label: t, value: t }))]}
          onChange={e => set('refType', e.target.value as ReferenceType | '')}
        />
        <Input label="Reference id" value={form.refId} error={errors.refId} disabled={!form.refType} onChange={e => set('refId', e.target.value)} placeholder="BKG-40218" />
        <Select
          label="Assign to"
          value={form.assigneeId}
          options={[{ label: 'Unassigned', value: '' }, ...agents.map(a => ({ label: `${a.name} · ${ROLE_LABELS[a.role as BackendAdminRole] ?? a.role}`, value: a.id }))]}
          onChange={e => set('assigneeId', e.target.value)}
        />
      </div>
    </Modal>
  )
}
