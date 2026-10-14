import { useState } from 'react'
import { Mic, Video } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, EmptyState, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { loadEarlierMessages } from './api'
import { consultationsDb } from './data'
import { formatDuration } from './helpers'
import type { Consultation } from './types'

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

/** Chat transcript for chat sessions; call / video sessions have no stored recording. */
export default function SessionContent({ c, secs }: { c: Consultation; secs: number }) {
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const toast = useToast()

  if (c.status === 'missed' || c.status === 'cancelled' || c.status === 'requested') {
    return (
      <Card>
        <CardHeader title={c.type === 'chat' ? 'Chat transcript' : 'Recording'} />
        <EmptyState title={c.status === 'requested' ? 'Waiting for the astrologer to accept' : 'Session never started'} text={c.cancelReason} />
      </Card>
    )
  }

  const loadEarlier = async () => {
    setLoadingEarlier(true)
    try {
      const { messages, hasMore } = await loadEarlierMessages(c)
      await consultationsDb.update(c.id, { messages: [...messages, ...c.messages], hasMoreMessages: hasMore }).catch(() => undefined)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setLoadingEarlier(false)
    }
  }

  if (c.type === 'chat') {
    return (
      <Card>
        <CardHeader title="Chat transcript" subtitle={`${c.messages.length} messages${c.status === 'ongoing' ? ' · live' : ''}`} />
        <CardBody className="max-h-[480px] space-y-3 overflow-y-auto bg-canvas/50">
          {c.hasMoreMessages && (
            <div className="text-center">
              <Button variant="outline" size="sm" loading={loadingEarlier} onClick={loadEarlier}>
                Load earlier messages
              </Button>
            </div>
          )}
          {c.messages.length === 0 && <p className="text-center text-sm text-muted">No messages yet</p>}
          {c.messages.map((m, i) =>
            m.from === 'system' ? (
              <p key={m.id ?? i} className="text-center text-xs text-muted">
                {m.text} · {time(m.at)}
              </p>
            ) : (
              <div key={m.id ?? i} className={cn('flex', m.from === 'astrologer' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', m.from === 'astrologer' ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm border border-line bg-white')}>
                  <p className={cn('mb-0.5 text-[11px] font-medium', m.from === 'astrologer' ? 'text-white/80' : 'text-muted')}>
                    {m.from === 'astrologer' ? c.astrologerName : c.customerName}
                  </p>
                  {m.kind === 'image' && m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer">
                      <img src={m.url} alt="Shared in chat" className="max-h-56 rounded-lg" />
                    </a>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  )}
                  <p className={cn('mt-1 text-right text-[10px]', m.from === 'astrologer' ? 'text-white/70' : 'text-muted')}>{time(m.at)}</p>
                </div>
              </div>
            ),
          )}
        </CardBody>
      </Card>
    )
  }

  const Icon = c.type === 'video' ? Video : Mic
  return (
    <Card>
      <CardHeader title={c.type === 'video' ? 'Video recording' : 'Call recording'} subtitle={`${c.type === 'video' ? 'Video' : 'Call'} duration · ${formatDuration(secs)}`} />
      <CardBody>
        {c.status === 'ongoing' ? (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-600">
            <span className="size-2.5 animate-pulse rounded-full bg-brand-600" />
            {c.type === 'video' ? 'Video' : 'Call'} in progress.
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-line p-4 text-sm text-muted">
            <Icon className="size-5 shrink-0" />
            Calls are not recorded, so there is no recording for this session.
          </div>
        )}
      </CardBody>
    </Card>
  )
}
