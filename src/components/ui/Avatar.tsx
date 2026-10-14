import { cn, initials } from '@/lib/utils'

// Same gradient set the deployed console uses for initials avatars.
const palette = [
  'bg-[linear-gradient(135deg,#C8102E,#F59E0B)]',
  'bg-[linear-gradient(135deg,#1E3A8A,#3B82F6)]',
  'bg-[linear-gradient(135deg,#065F46,#10B981)]',
  'bg-[linear-gradient(135deg,#6B21A8,#A855F7)]',
  'bg-[linear-gradient(135deg,#9A3412,#F97316)]',
]

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) {
  const color = palette[(name.charCodeAt(0) || 0) % palette.length]
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) }
  if (src) return <img src={src} alt={name} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
  return (
    <span style={style} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', color, className)}>
      {initials(name)}
    </span>
  )
}
