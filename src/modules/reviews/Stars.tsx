import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: size, height: size }} className={cn(i <= Math.round(value) ? 'fill-gold-400 text-gold-400' : 'fill-gray-200 text-gray-200')} />
      ))}
    </span>
  )
}
