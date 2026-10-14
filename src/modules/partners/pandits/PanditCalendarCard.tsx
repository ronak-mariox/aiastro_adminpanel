import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, IconButton, Input, Modal, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { errorMessage } from '@/lib/api'
import { setPanditBlocked } from '../actions'
import type { PanditProfile } from '../types'

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** 'YYYY-MM-DD' → local Date (no UTC shift). */
const day = (s: string) => new Date(`${s}T00:00:00`)
const today = () => key(new Date())

export function PanditCalendarCard({ profile }: { profile: PanditProfile }) {
  const toast = useToast()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', reason: '' })

  const blocked = new Map(profile.blockedDates.map(b => [b.date, b.reason || 'Blocked']))
  const [saving, setSaving] = useState(false)
  const save = async (list: typeof profile.blockedDates, done: string) => {
    setSaving(true)
    try {
      await setPanditBlocked(profile.id, list)
      toast(done)
      return true
    } catch (e) {
      toast(errorMessage(e), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]

  const unblock = async (date: string) => {
    await save(profile.blockedDates.filter(b => b.date !== date), 'Date unblocked')
  }

  const block = async () => {
    if (!form.date) return
    if (blocked.has(form.date)) {
      toast('Date already blocked', 'error')
      return
    }
    const blockedDates = [...profile.blockedDates, { date: form.date, reason: form.reason.trim() || 'Blocked by admin' }].sort((a, b) => a.date.localeCompare(b.date))
    if (!(await save(blockedDates, 'Date blocked'))) return
    setAdding(false)
    setForm({ date: '', reason: '' })
  }

  return (
    <Card>
      <CardHeader
        title="Calendar"
        subtitle={`${profile.blockedDates.length} blocked date${profile.blockedDates.length === 1 ? '' : 's'}`}
        action={
          <Button size="sm" variant="outline" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            Block date
          </Button>
        }
      />
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <IconButton aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <span className="text-sm font-semibold">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          <IconButton aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1 font-medium text-muted">
              {d}
            </span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <span
                key={i}
                title={blocked.get(key(d))}
                className={cn('rounded-lg py-1.5', blocked.has(key(d)) ? 'bg-brand-600 font-semibold text-white' : 'text-ink', key(d) === today() && !blocked.has(key(d)) && 'ring-1 ring-brand-600')}>
                {d.getDate()}
              </span>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <ul className="mt-4 space-y-2">
          {profile.blockedDates.map(b => (
            <li key={b.date} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium">{formatDate(day(b.date).toISOString())}</span>
              <span className="flex-1 truncate text-muted">{b.reason || '—'}</span>
              <IconButton aria-label="Unblock" className="size-7" disabled={saving} onClick={() => unblock(b.date)}>
                <X className="size-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      </CardBody>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        size="sm"
        title="Block a date"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button disabled={!form.date} loading={saving} onClick={block}>
              Block
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Date" type="date" min={today()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Out of station" />
        </div>
      </Modal>
    </Card>
  )
}
