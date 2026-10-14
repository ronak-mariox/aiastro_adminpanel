import { useState } from 'react'
import type { Astrologer } from '@/data'
import { Button, Card, CardBody, CardHeader, Toggle, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/api'
import { setSchedule } from '../actions'
import type { AstrologerProfile, DaySchedule } from '../types'

type Props = { astrologer: Astrologer; profile?: AstrologerProfile }

const hours = (d: DaySchedule) => {
  const [fh, fm] = d.from.split(':').map(Number)
  const [th, tm] = d.to.split(':').map(Number)
  return Math.max(0, (th! * 60 + tm! - (fh! * 60 + fm!)) / 60)
}

export function AstroScheduleCard({ astrologer, profile }: Props) {
  if (!profile) return <Card className="h-48 animate-pulse" />
  return <ScheduleEditor key={`${profile.id}-${JSON.stringify(profile.schedule)}`} astrologer={astrologer} profile={profile} />
}

function ScheduleEditor({ astrologer, profile }: { astrologer: Astrologer; profile: AstrologerProfile }) {
  const toast = useToast()
  const [draft, setDraft] = useState(profile.schedule)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.schedule)
  const invalid = draft.some(d => d.enabled && hours(d) <= 0)
  const total = draft.filter(d => d.enabled).reduce((s, d) => s + hours(d), 0)

  const patch = (i: number, p: Partial<DaySchedule>) => setDraft(list => list.map((d, j) => (j === i ? { ...d, ...p } : d)))

  const save = async () => {
    setSaving(true)
    try {
      await setSchedule(profile.id, draft)
      toast('Weekly availability saved')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Weekly availability"
        subtitle={`${astrologer.name} is scheduled for ${total.toFixed(1)} hrs / week`}
        action={
          <div className="flex gap-2">
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(profile.schedule)}>
                Reset
              </Button>
            )}
            <Button size="sm" loading={saving} disabled={!dirty || invalid} onClick={save}>
              Save
            </Button>
          </div>
        }
      />
      <CardBody className="divide-y divide-line py-0">
        {draft.map((d, i) => (
          <div key={d.day} className="flex flex-wrap items-center gap-3 py-3">
            <span className="w-12 text-sm font-medium text-ink">{d.day}</span>
            <Toggle checked={d.enabled} onChange={v => patch(i, { enabled: v })} />
            {d.enabled ? (
              <div className="flex items-center gap-2 text-sm">
                <input type="time" value={d.from} onChange={e => patch(i, { from: e.target.value })} className={cn('h-9 rounded-lg border border-line px-2', hours(d) <= 0 && 'border-red-400')} />
                <span className="text-muted">to</span>
                <input type="time" value={d.to} onChange={e => patch(i, { to: e.target.value })} className={cn('h-9 rounded-lg border border-line px-2', hours(d) <= 0 && 'border-red-400')} />
                <span className="text-xs text-muted">{hours(d).toFixed(1)} h</span>
              </div>
            ) : (
              <span className="text-sm text-muted">Unavailable</span>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
