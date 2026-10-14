import type { ReactNode } from 'react'

/** Inline **bold**, *italic* and `code`. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
      return (
        <code key={i} className="rounded bg-gray-100 px-1 text-[0.9em]">
          {p.slice(1, -1)}
        </code>
      )
    return p
  })
}

/** Minimal, dependency-free markdown preview: headings, lists, quotes, paragraphs. */
export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const out: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []

  const flushPara = () => {
    if (para.length) out.push(<p key={out.length} className="my-3 leading-relaxed">{inline(para.join(' '))}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>)
    out.push(
      list.ordered ? (
        <ol key={out.length} className="my-3 list-decimal space-y-1 pl-6">
          {items}
        </ol>
      ) : (
        <ul key={out.length} className="my-3 list-disc space-y-1 pl-6">
          {items}
        </ul>
      ),
    )
    list = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = /^\s*[-*]\s+(.*)/.exec(line)
    const numbered = /^\s*\d+\.\s+(.*)/.exec(line)
    if (bullet || numbered) {
      flushPara()
      const ordered = !!numbered
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1]!)
      continue
    }
    flushList()
    if (!line.trim()) {
      flushPara()
    } else if (line.startsWith('### ')) {
      flushPara()
      out.push(<h4 key={out.length} className="mt-5 mb-2 text-base font-semibold">{inline(line.slice(4))}</h4>)
    } else if (line.startsWith('## ')) {
      flushPara()
      out.push(<h3 key={out.length} className="mt-6 mb-2 text-lg font-semibold">{inline(line.slice(3))}</h3>)
    } else if (line.startsWith('# ')) {
      flushPara()
      out.push(<h2 key={out.length} className="mt-6 mb-3 text-xl font-bold">{inline(line.slice(2))}</h2>)
    } else if (line.startsWith('> ')) {
      flushPara()
      out.push(
        <blockquote key={out.length} className="my-3 border-l-4 border-brand-200 pl-4 text-muted italic">
          {inline(line.slice(2))}
        </blockquote>,
      )
    } else {
      para.push(line.trim())
    }
  }
  flushList()
  flushPara()

  return <div className="text-sm text-ink">{out.length ? out : <p className="text-muted">Nothing to preview yet.</p>}</div>
}
