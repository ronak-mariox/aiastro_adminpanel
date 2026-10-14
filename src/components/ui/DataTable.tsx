import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown, Inbox, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number
  className?: string
  align?: 'left' | 'right' | 'center'
}

export type Filter<T> = {
  key: string
  label: string
  options: string[]
  match: (row: T, value: string) => boolean
}

type Props<T> = {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Fields joined into the free-text search haystack. */
  searchText?: (row: T) => string
  searchPlaceholder?: string
  filters?: Filter<T>[]
  onRowClick?: (row: T) => void
  toolbar?: ReactNode
  pageSize?: number
  loading?: boolean
  empty?: ReactNode
  /** Receives the rows left after search/filters/sort (e.g. for CSV export of what's on screen). */
  onVisibleRowsChange?: (rows: T[]) => void
  /** Heading of the collapsible filter card, e.g. "Search & Filter Users". */
  filterTitle?: string
}

const PAGE_SIZES = [5, 10, 20, 50, 100]

const fieldCls =
  'h-[42px] w-full rounded-xl border-[1.5px] border-line/90 bg-soft px-3 text-[0.88rem] font-medium text-ink-2 outline-none transition hover:border-gold-500 focus:border-brand-600 focus:bg-white'

const pagerBtn =
  'inline-flex size-[34px] items-center justify-center rounded-[9px] border border-line/90 bg-soft text-body transition hover:border-[#CBD5E1] hover:bg-[#F1F5F9] disabled:pointer-events-none disabled:opacity-35'

/** 1 … 4 5 6 … 12 style page list. */
function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('gap')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < total - 1) out.push('gap')
  out.push(total)
  return out
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = 'Search…',
  filters = [],
  onRowClick,
  toolbar,
  pageSize = 10,
  loading,
  empty,
  onVisibleRowsChange,
  filterTitle = 'Search & Filter',
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(pageSize)
  const [open, setOpen] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows.filter(r => {
      if (q && searchText && !searchText(r).toLowerCase().includes(q)) return false
      return filters.every(f => {
        const v = filterValues[f.key]
        return !v || v === 'All' || f.match(r, v)
      })
    })
    if (sort) {
      const col = columns.find(c => c.key === sort.key)
      if (col?.sortValue) {
        const sv = col.sortValue
        list = [...list].sort((a, b) => (sv(a) > sv(b) ? sort.dir : sv(a) < sv(b) ? -sort.dir : 0))
      }
    }
    return list
  }, [rows, query, filterValues, sort, columns, filters, searchText])

  // Pages often rebuild `filters`/`columns` each render, which recomputes `visible`.
  // Only notify when the visible rows actually change, or setState in the parent would loop.
  const lastNotified = useRef<string | null>(null)
  useEffect(() => {
    if (!onVisibleRowsChange) return
    const signature = visible.map(rowKey).join('|')
    if (signature === lastNotified.current) return
    lastNotified.current = signature
    onVisibleRowsChange(visible)
  }, [visible, onVisibleRowsChange, rowKey])

  const pages = Math.max(1, Math.ceil(visible.length / limit))
  const current = Math.min(page, pages - 1)
  const slice = visible.slice(current * limit, current * limit + limit)

  const toggleSort = (key: string) => setSort(s => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }))

  const activeFilters = filters.filter(f => filterValues[f.key] && filterValues[f.key] !== 'All')
  const resetFilters = () => {
    setQuery('')
    setFilterValues({})
    setPage(0)
  }
  const hasFilterCard = !!searchText || filters.length > 0

  return (
    <div className="w-full">
      {(hasFilterCard || toolbar) && (
        <div className="shadow-card mb-5 overflow-hidden rounded-2xl border border-line/90 bg-white">
          <div className={cn('flex min-h-14 flex-wrap items-center justify-between gap-3 bg-soft px-5 py-2.5', open && 'border-b border-line')}>
            {hasFilterCard ? (
              <button type="button" onClick={() => setOpen(o => !o)} className="flex min-w-0 items-center gap-2.5 text-left">
                <span className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[rgba(200,16,46,0.08)] text-brand-600">
                  <SlidersHorizontal className="size-[18px]" />
                </span>
                <span className="text-[0.95rem] font-bold text-ink">{filterTitle}</span>
                <ChevronDown className={cn('size-5 text-muted transition-transform', open && 'rotate-180')} />
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {query && (
                <Chip tone="blue" onClear={() => setQuery('')}>
                  Search: “{query}”
                </Chip>
              )}
              {activeFilters.map(f => (
                <Chip key={f.key} tone="amber" onClear={() => setFilterValues(v => ({ ...v, [f.key]: 'All' }))}>
                  {f.label}: {filterValues[f.key]}
                </Chip>
              ))}
              {hasFilterCard && !query && activeFilters.length === 0 && <Chip tone="gray">All records</Chip>}
              {toolbar}
            </div>
          </div>

          {open && hasFilterCard && (
            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-12">
                {searchText && (
                  <label className={cn('block', filters.length ? 'md:col-span-6 lg:col-span-5' : 'md:col-span-12')}>
                    <span className="mb-1.5 block text-[0.82rem] font-semibold text-body">Search Query</span>
                    <span className="relative block">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-subtle" />
                      <input
                        className={cn(fieldCls, 'pr-9 pl-10')}
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={e => {
                          setQuery(e.target.value)
                          setPage(0)
                        }}
                      />
                      {query && (
                        <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-ink" aria-label="Clear search">
                          <X className="size-4" />
                        </button>
                      )}
                    </span>
                  </label>
                )}
                {filters.map(f => (
                  <label key={f.key} className="block md:col-span-6 lg:col-span-3">
                    <span className="mb-1.5 block text-[0.82rem] font-semibold text-body">{f.label}</span>
                    <select
                      className={cn(fieldCls, 'pr-8')}
                      value={filterValues[f.key] ?? 'All'}
                      onChange={e => {
                        setFilterValues(v => ({ ...v, [f.key]: e.target.value }))
                        setPage(0)
                      }}>
                      <option value="All">All {f.label.toLowerCase()}</option>
                      {f.options.map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                <span className="mr-auto text-[0.8rem] text-muted">{visible.length} matching records</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center gap-2 rounded-[10px] border-[1.5px] border-[#CBD5E1] px-4 text-[0.85rem] font-semibold text-muted transition hover:border-subtle hover:bg-soft">
                  <RotateCcw className="size-4" />
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="shadow-card overflow-hidden rounded-2xl border border-line/90 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[0.875rem]">
            <thead>
              <tr className="bg-soft text-left">
                {columns.map(c => (
                  <th
                    key={c.key}
                    className={cn(
                      'px-4 py-3.5 text-[0.76rem] font-bold tracking-[0.04em] whitespace-nowrap text-body uppercase',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.className,
                    )}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase transition hover:text-gold-700">
                        {c.header}
                        <ChevronsUpDown className={cn('size-3.5', sort?.key === c.key ? 'text-brand-600' : 'text-subtle')} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map(c => (
                      <td key={c.key} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#F1F5F9]" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                slice.map(row => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn('text-ink-2 transition-colors', onRowClick && 'cursor-pointer hover:bg-[rgba(245,158,11,0.04)]')}>
                    {columns.map(c => (
                      <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && slice.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-[0.88rem] text-muted">
              <span className="mb-1 inline-flex size-14 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.12)] text-gold-700">
                <Inbox className="size-7" />
              </span>
              <span className="font-semibold text-ink">{empty ?? 'No records found'}</span>
              {(query || activeFilters.length > 0) && (
                <button type="button" onClick={resetFilters} className="text-[0.82rem] font-semibold text-brand-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!loading && visible.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 px-1 sm:flex-row">
          <div className="flex items-center gap-3 text-[0.82rem] text-muted">
            <span>
              Showing <b className="font-semibold text-ink">{current * limit + 1}</b>–<b className="font-semibold text-ink">{Math.min(visible.length, (current + 1) * limit)}</b> of{' '}
              <b className="font-semibold text-ink">{visible.length}</b>
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              Rows per page
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value))
                  setPage(0)
                }}
                className="h-8 rounded-lg border border-line bg-soft px-2 text-[0.82rem] font-semibold text-ink outline-none hover:border-[#CBD5E1] hover:bg-[#F1F5F9]">
                {PAGE_SIZES.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
          </div>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" className={pagerBtn} disabled={current === 0} onClick={() => setPage(0)} aria-label="First page">
                <ChevronsLeft className="size-[18px]" />
              </button>
              <button type="button" className={pagerBtn} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
                <ChevronLeft className="size-[18px]" />
              </button>
              {pageList(current + 1, pages).map((p, i) =>
                p === 'gap' ? (
                  <span key={`gap-${i}`} className="flex h-[34px] min-w-7 items-center justify-center font-bold tracking-[1px] text-subtle select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p - 1)}
                    className={cn(
                      'h-[34px] min-w-[34px] rounded-[9px] px-2 text-[0.85rem] transition',
                      p === current + 1 ? 'bg-brand-diagonal font-bold text-white shadow-[0_4px_12px_rgba(200,16,46,0.28)]' : 'font-semibold text-body hover:bg-gold-500/8 hover:text-gold-700',
                    )}>
                    {p}
                  </button>
                ),
              )}
              <button type="button" className={pagerBtn} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
                <ChevronRight className="size-[18px]" />
              </button>
              <button type="button" className={pagerBtn} disabled={current >= pages - 1} onClick={() => setPage(pages - 1)} aria-label="Last page">
                <ChevronsRight className="size-[18px]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ children, tone, onClear }: { children: ReactNode; tone: 'blue' | 'amber' | 'gray'; onClear?: () => void }) {
  const tones = {
    blue: 'bg-[#EFF6FF] text-[#2563EB]',
    amber: 'bg-[rgba(245,158,11,0.12)] text-gold-700',
    gray: 'bg-[#F1F5F9] text-body',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.75rem] font-semibold', tones[tone])}>
      {children}
      {onClear && (
        <button type="button" onClick={onClear} className="-mr-0.5 rounded opacity-70 hover:opacity-100" aria-label="Remove filter">
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
