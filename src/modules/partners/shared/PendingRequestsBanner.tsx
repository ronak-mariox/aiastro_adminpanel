import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useCollection } from '@/lib/store'
import { approvalsDb, KIND_LABELS, pendingFor } from '../../approvals/data'

/** Shows a partner's open approval requests with a link to the queue. */
export function PendingRequestsBanner({ partnerId }: { partnerId: string }) {
  const { items } = useCollection(approvalsDb)
  const pending = pendingFor(partnerId, items)
  if (!pending.length) return null
  const kinds = [...new Set(pending.map(p => KIND_LABELS[p.kind]))]
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <Clock className="size-5 shrink-0 text-amber-600" />
      <p className="flex-1 text-amber-800">
        <span className="font-semibold">{pending.length} pending request{pending.length > 1 ? 's' : ''}</span> — {kinds.join(', ')}
      </p>
      <Link to={`/approvals?partner=${partnerId}`} className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900">
        Review in Approvals
      </Link>
    </div>
  )
}
