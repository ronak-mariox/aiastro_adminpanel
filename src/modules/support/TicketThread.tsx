import { useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar, Button, Card, CardBody, CardHeader, Select, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import { sendReply } from './api'
import { cannedResponses, ticketsDb } from './data'
import type { Ticket } from './types'

export default function TicketThread({ ticket }: { ticket: Ticket }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const send = async (resolve: boolean) => {
    if (!text.trim()) return
    setSending(true)
    try {
      // The server records the reply, notifies the requester, claims an unassigned ticket and moves open → in progress.
      await sendReply(ticket, text.trim(), resolve)
      await ticketsDb.load?.(ticket.id).catch(() => undefined)
      setText('')
      toast(resolve ? (ticket.kind === 'chat' ? 'Reply sent and chat closed' : 'Reply sent and ticket resolved') : 'Reply sent')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Conversation" subtitle={`${ticket.messages.filter(m => m.from !== 'system').length} messages`} />
      <CardBody className="space-y-4">
        {ticket.messages.map(m => {
          if (m.from === 'system')
            return (
              <p key={m.id} className="text-center text-xs text-muted">
                {m.body} · {formatDateTime(m.at)}
              </p>
            )
          const agent = m.from === 'agent'
          return (
            <div key={m.id} className={cn('flex gap-3', agent && 'flex-row-reverse')}>
              <Avatar name={m.author} size={34} />
              <div className={cn('max-w-[85%] min-w-0', agent && 'text-right')}>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">{m.author}</span> · {formatDateTime(m.at)}
                </p>
                <div
                  className={cn(
                    'mt-1 rounded-2xl px-4 py-2.5 text-left text-sm whitespace-pre-wrap',
                    agent ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-gray-100 text-ink',
                  )}>
                  {m.body}
                </div>
              </div>
            </div>
          )
        })}
      </CardBody>
      <div className="space-y-3 border-t border-line p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Reply to requester</p>
          <Select
            aria-label="Canned response"
            className="sm:w-56"
            value=""
            options={[{ label: 'Insert canned response…', value: '' }, ...cannedResponses.map(c => ({ label: c.title, value: c.id }))]}
            onChange={e => {
              const c = cannedResponses.find(x => x.id === e.target.value)
              if (c) setText(t => (t.trim() ? `${t.trim()}\n\n${c.body}` : c.body))
            }}
          />
        </div>
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Type your reply… it will be sent to the requester in the app" />
        <div className="flex flex-wrap justify-end gap-2">
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <Button variant="outline" disabled={!text.trim()} loading={sending} onClick={() => send(true)}>
              Send & resolve
            </Button>
          )}
          <Button icon={<Send className="size-4" />} disabled={!text.trim()} loading={sending} onClick={() => send(false)}>
            Send reply
          </Button>
        </div>
      </div>
    </Card>
  )
}
