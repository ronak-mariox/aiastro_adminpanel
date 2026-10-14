import { useState } from 'react'
import type { Astrologer } from '@/data'
import { Button, Modal, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { approveAstrologer } from '../actions'
import { ApproveForm } from '../shared/ApproveForm'
import { approveBody, approveDefaults, approveFormError } from '../shared/approveOptions'

type Props = { open: boolean; onClose: () => void; astrologer: Astrologer }

export function ApproveAstrologerModal(props: Props) {
  if (!props.open) return null
  return <ApproveBody {...props} />
}

function ApproveBody({ onClose, astrologer: a }: Props) {
  const toast = useToast()
  const [form, setForm] = useState(() =>
    approveDefaults(
      (['chat', 'call', 'video'] as const).filter(t => a.pricing[t] > 0).map(t => ({ type: t, ratePerMinute: a.pricing[t], isEnabled: a.services[t] })),
      a.commissionPct,
    ),
  )
  const [saving, setSaving] = useState(false)
  const error = approveFormError(form)

  const save = async () => {
    if (error) return
    setSaving(true)
    try {
      await approveAstrologer(a.id, approveBody(form))
      toast(`${a.name} approved`)
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Approve onboarding"
      subtitle={`${a.name} gets an astro code and goes live with these rates.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" loading={saving} disabled={!!error} onClick={save}>
            Approve
          </Button>
        </>
      }>
      <ApproveForm value={form} onChange={setForm} />
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </Modal>
  )
}
