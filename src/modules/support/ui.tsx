import { Badge, type Tone } from '@/components/ui'
import { cap } from './format'
import type { RaisedByType, TicketPriority } from './types'

const priorityTone: Record<TicketPriority, Tone> = { low: 'gray', medium: 'blue', high: 'orange', urgent: 'red' }

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge tone={priorityTone[priority]}>{cap(priority)}</Badge>
}

const raisedTone: Record<RaisedByType, Tone> = { customer: 'brand', astrologer: 'purple', pandit: 'orange' }

export function RaisedByBadge({ type }: { type: RaisedByType }) {
  return <Badge tone={raisedTone[type]}>{cap(type)}</Badge>
}
