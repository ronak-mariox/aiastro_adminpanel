import { useMemo, useState } from 'react'
import { AlertTriangle, Check, MapPin, Star } from 'lucide-react'
import { Avatar, Badge, Button, Modal, SearchInput, Toggle } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatINR } from '@/lib/utils'
import { assignablePanditsDb, bookingsDb, performsPuja } from './data'
import type { Booking } from './types'

export default function AssignPanditModal({ booking, onClose, onAssign }: { booking: Booking; onClose: () => void; onAssign: (panditId: string, name: string) => Promise<void> }) {
  const { items: pandits, loading } = useCollection(assignablePanditsDb)
  const { items: bookings } = useCollection(bookingsDb)
  const [freeOnly, setFreeOnly] = useState(true)
  const [expertOnly, setExpertOnly] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(booking.panditId)
  const [saving, setSaving] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const slot = booking.slot.replace(/^0(\d):/, '$1:')
    return pandits
      .filter(p => !expertOnly || performsPuja(p, booking.pujaId))
      .filter(p => !q || `${p.name} ${p.city} ${p.id}`.toLowerCase().includes(q))
      .map(p => ({
        p,
        // Busy = another live booking at this slot, or the slot is not one of their hours.
        conflict:
          bookings.some(b => b.id !== booking.id && b.panditId === p.id && b.date === booking.date && b.slot === booking.slot && b.status !== 'cancelled') ||
          (p.timeSlots.length > 0 && !p.timeSlots.includes(slot)) ||
          !p.acceptingBookings,
        expert: performsPuja(p, booking.pujaId),
      }))
      .filter(x => !freeOnly || !x.conflict)
      .sort((a, b) => Number(a.conflict) - Number(b.conflict) || Number(b.expert) - Number(a.expert) || b.p.rating - a.p.rating)
  }, [pandits, bookings, booking, freeOnly, expertOnly, query])

  const submit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await onAssign(selected, pandits.find(p => p.id === selected)?.name ?? 'Pandit')
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={booking.panditId ? 'Reassign pandit' : 'Assign pandit'}
      subtitle={`${booking.puja} · ${booking.date} ${booking.slot}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!selected || selected === booking.panditId} onClick={submit}>
            {booking.panditId ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput className="sm:flex-1" placeholder="Search pandits…" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-4">
          <Toggle checked={freeOnly} onChange={setFreeOnly} label="Free at this slot" />
          <Toggle checked={expertOnly} onChange={setExpertOnly} label="Performs this puja" />
        </div>
      </div>
      {loading && pandits.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Loading pandits…</p>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No pandits match — try relaxing the filters.</p>
      ) : (
        <ul className="space-y-2">
          {list.map(({ p, conflict, expert }) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p.id)}
                className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', selected === p.id ? 'border-brand-500 bg-brand-50/60' : 'border-line hover:bg-gray-50')}>
                <Avatar name={p.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {p.name}
                    {p.id === booking.panditId && <Badge tone="gray">Current</Badge>}
                    {expert && <Badge tone="green">Expert</Badge>}
                    {conflict && (
                      <Badge tone="red">
                        <AlertTriangle className="size-3" /> Not free this slot
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {p.city || 'City not set'}
                      {p.serviceRadiusKm > 0 && ` · ${p.serviceRadiusKm} km`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {p.rating} ({p.reviews})
                    </span>
                    {p.experienceYears > 0 && <span>{p.experienceYears} yrs</span>}
                    {p.baseFee > 0 && <span>Fee {formatINR(p.baseFee)}</span>}
                  </p>
                </div>
                {selected === p.id && <Check className="size-5 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
