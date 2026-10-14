import { useState } from 'react'
import { Button, Input, Modal, Select, Textarea, Toggle } from '@/components/ui'

export type NotificationDraft = { template: string; title: string; message: string; channels: string[] }

const TEMPLATES: Record<string, { title: string; message: string }> = {
  Custom: { title: '', message: '' },
  Offer: { title: 'Special offer just for you 🎉', message: 'Recharge ₹500 today and get ₹250 extra in your VedRashi wallet. Use it for chat, call or video consultations.' },
  'Consultation reminder': { title: 'Your astrologer is waiting', message: 'Continue your consultation where you left off. Your favourite astrologers are online now.' },
  'Rate your experience': { title: 'How was your session?', message: 'Rate your recent consultation and earn 20 reward points.' },
  'Points earned': { title: 'Reward points credited', message: 'Reward points have been added to your account. Redeem them on your next booking.' },
  'Account notice': { title: 'Important update about your account', message: 'Please contact VedRashi support regarding your account.' },
}

export default function NotifyModal({
  open,
  onClose,
  customerName,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  customerName: string
  onSubmit: (n: NotificationDraft) => Promise<void>
}) {
  const [template, setTemplate] = useState('Custom')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [channels, setChannels] = useState<Record<string, boolean>>({ Push: true, SMS: false, Email: false })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const applyTemplate = (t: string) => {
    setTemplate(t)
    const tpl = TEMPLATES[t]
    if (tpl && t !== 'Custom') {
      setTitle(tpl.title)
      setMessage(tpl.message)
    }
  }

  const submit = async () => {
    const selected = Object.keys(channels).filter(k => channels[k])
    if (!title.trim() || !message.trim()) return setError('Title and message are required')
    if (!selected.length) return setError('Pick at least one channel')
    setError('')
    setSending(true)
    try {
      await onSubmit({ template, title: title.trim(), message: message.trim(), channels: selected })
      onClose()
    } catch {
      /* the page already showed the error; keep the form open */
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send notification"
      subtitle={`To ${customerName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={sending} onClick={submit}>
            Send
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Select label="Template" value={template} options={Object.keys(TEMPLATES)} onChange={e => applyTemplate(e.target.value)} />
        <Input label="Title" value={title} maxLength={65} hint={`${title.length}/65`} onChange={e => setTitle(e.target.value)} />
        <Textarea label="Message" value={message} maxLength={240} hint={`${message.length}/240`} rows={4} onChange={e => setMessage(e.target.value)} />
        <div className="flex flex-wrap gap-5">
          {Object.keys(channels).map(c => (
            <Toggle key={c} label={c} checked={!!channels[c]} onChange={v => setChannels(s => ({ ...s, [c]: v }))} />
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
