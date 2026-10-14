import { formatINR } from '@/lib/utils'
import { APPLICATION_STAGES } from './data'
import type { Approval } from './types'

/** One-line description of a request for table rows and CSV export. */
export function summarize(a: Approval): string {
  switch (a.kind) {
    case 'onboarding': {
      const stage = APPLICATION_STAGES[a.applicationStatus] ?? a.applicationStatus
      return [`New ${a.partnerType}`, a.experienceYears ? `${a.experienceYears} yrs` : '', a.city, a.status === 'pending' ? stage : ''].filter(Boolean).join(' · ')
    }
    case 'price':
      return `${a.applyToAll ? 'All services' : a.service.charAt(0).toUpperCase() + a.service.slice(1)}: ${formatINR(a.currentRate)} → ${formatINR(a.requestedRate)}/min`
    case 'bank':
      return a.oldBank
        ? `${a.oldBank.bank} ••${a.oldBank.accountLast4} → ${a.newBank.bank} ••${a.newBank.accountLast4}`
        : `${a.newBank.bank}${a.newBank.accountLast4 ? ` ••${a.newBank.accountLast4}` : ''}${a.newBank.upi ? ` · ${a.newBank.upi}` : ''}`
    case 'certificate':
      return [a.docType, a.issuer].filter(Boolean).join(' · ')
    case 'document':
      return `${a.docType} · ${a.fileName}`
  }
}

export const partnerPath = (a: Approval) => `/${a.partnerType === 'astrologer' ? 'astrologers' : 'pandits'}/${a.partnerId}`

export const daysSince = (iso: string, now = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
