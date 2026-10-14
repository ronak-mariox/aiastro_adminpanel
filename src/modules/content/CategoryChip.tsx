import type { BlogCategory } from './types'

export function CategoryChip({ category }: { category?: BlogCategory }) {
  if (!category) return <span className="text-xs text-muted">Uncategorised</span>
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: `${category.color}1f`, color: category.color === '#ffd700' ? '#9a7b00' : category.color }}>
      <span className="size-1.5 rounded-full" style={{ background: category.color }} />
      {category.name}
    </span>
  )
}
