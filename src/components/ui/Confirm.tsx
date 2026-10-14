import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Textarea } from './Field'

type ConfirmOptions = {
  title: string
  message?: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary' | 'success'
  /** Ask for a reason (e.g. rejection note); resolved value is the text. */
  withReason?: boolean
  reasonLabel?: string
}

type Pending = ConfirmOptions & { resolve: (v: string | false) => void }

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<string | false>>(async () => false)

/** `const ok = await confirm({...})` → false when cancelled, otherwise the reason text ('' if none). */
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [reason, setReason] = useState('')

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<string | false>(resolve => {
        setReason('')
        setPending({ ...o, resolve })
      }),
    [],
  )

  const close = (v: string | false) => {
    pending?.resolve(v)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => close(false)}
        title={pending?.title}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              variant={pending?.tone ?? 'primary'}
              disabled={pending?.withReason && !reason.trim()}
              onClick={() => close(reason.trim())}>
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }>
        {pending?.message && <div className="text-sm text-muted">{pending.message}</div>}
        {pending?.withReason && (
          <div className="mt-4">
            <Textarea label={pending.reasonLabel ?? 'Reason'} value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}
