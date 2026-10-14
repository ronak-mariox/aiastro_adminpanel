import { useState } from 'react'
import { Lock, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, IconButton, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { addNote, removeNote } from './api'
import { ticketsDb } from './data'
import type { Ticket } from './types'

/** Internal notes — visible to admins only, never sent to the requester. */
export default function TicketNotes({ ticket }: { ticket: Ticket }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  // Notes are saved on the server; the panel row only gets its `notes` replaced (no other field changes).
  const add = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const notes = await addNote(ticket, text.trim())
      await ticketsDb.update(ticket.id, { notes })
      setText('')
      toast('Internal note added')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const notes = await removeNote(ticket, id)
      await ticketsDb.update(ticket.id, { notes })
      toast('Note deleted', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Lock className="size-4 text-gold-500" /> Internal notes
          </span>
        }
        subtitle="Only visible to the admin team"
      />
      <CardBody className="space-y-3">
        {ticket.notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        {ticket.notes.map(n => (
          <div key={n.id} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                <span className="font-medium text-ink">{n.author}</span> · {formatDateTime(n.at)}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
            </div>
            <IconButton aria-label="Delete note" onClick={() => remove(n.id)} className="size-7">
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        ))}
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Add a note for the team…" />
        <div className="flex justify-end">
          <Button variant="secondary" disabled={!text.trim()} loading={saving} onClick={add}>
            Add note
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
