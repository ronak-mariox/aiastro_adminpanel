import type { ReactNode } from 'react'
import { useRemoteErrorToasts } from './remoteCollection'

/** Wraps a page so API failures from its remote collections show as error toasts. */
export function WithApiErrors({ children }: { children: ReactNode }) {
  useRemoteErrorToasts()
  return <>{children}</>
}
