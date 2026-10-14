import type { Order, OrderStatus } from './types'

const FLOW: OrderStatus[] = ['processing', 'packed', 'transit', 'delivered']

export const nextStatuses = (o: Order): OrderStatus[] => {
  const idx = FLOW.indexOf(o.status)
  return idx < 0 ? [] : FLOW.slice(idx + 1)
}

/** Generates a CSV from rows and triggers a browser download. */
export function downloadCsv<T>(filename: string, rows: T[], columns: { header: string; value: (r: T) => string | number | undefined }[]) {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map(c => esc(c.header)).join(','), ...rows.map(r => columns.map(c => esc(c.value(r))).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
