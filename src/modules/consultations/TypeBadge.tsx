import { MessageSquare, Phone, Video } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { ConsultationType } from './types'

const typeIcon: Record<ConsultationType, typeof Phone> = { chat: MessageSquare, call: Phone, video: Video }

export default function TypeBadge({ type }: { type: ConsultationType }) {
  const Icon = typeIcon[type]
  return (
    <Badge tone={type === 'chat' ? 'brand' : type === 'call' ? 'orange' : 'purple'}>
      <Icon className="size-3" />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  )
}
