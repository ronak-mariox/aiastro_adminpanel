/** Download rows as a CSV file (client-side Blob). */
export function exportCsv<T>(filename: string, rows: T[], columns: { header: string; value: (row: T) => string | number | boolean | undefined }[]) {
  const esc = (v: string | number | boolean | undefined) => {
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
