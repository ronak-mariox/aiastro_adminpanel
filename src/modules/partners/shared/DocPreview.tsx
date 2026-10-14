import { ExternalLink, FileText } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

const isImage = (url: string | null | undefined, mime?: string | null) => !!url && (mime ? mime.startsWith('image/') : /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url))

/** Preview of a filed scan: the image itself when it is one, else a document card with an "Open" link. */
export function DocPreview({ title, subtitle, file, url, mimeType, compact }: { title: string; subtitle?: string; file: string; url: string | null; mimeType?: string | null; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className={cn('flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100', compact ? 'h-28' : 'h-44')}>
        {isImage(url, mimeType) ? (
          <a href={url!} target="_blank" rel="noreferrer" className="block h-full w-full">
            <img src={url!} alt={title} className="h-full w-full object-contain" />
          </a>
        ) : (
          <div className={cn('flex flex-col gap-2 rounded-lg border border-line bg-white p-4 shadow-sm', compact ? 'w-40 p-3' : 'w-56')}>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-brand-600" />
              <span className="text-xs font-semibold text-ink uppercase">{title}</span>
            </div>
            <div className="h-2 w-4/5 rounded bg-gray-200" />
            <div className="h-2 w-3/5 rounded bg-gray-200" />
            {subtitle && <span className="mt-1 truncate font-mono text-[11px] text-muted">{subtitle}</span>}
          </div>
        )}
      </div>
      {!compact && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm">
          <span className="truncate text-muted">{file}</span>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-600 hover:underline">
              Open <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <Badge>No file</Badge>
          )}
        </div>
      )}
    </div>
  )
}
