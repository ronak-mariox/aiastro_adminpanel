import { api, fileUrl } from '@/lib/api'
import { createRemoteCollection } from '@/lib/store'
import { expertiseLabel, titleCase, type Row } from '@/data/adapters'
import {
  approveAstrologer,
  approvePandit,
  rejectOnboarding,
  reviewAstroBank,
  reviewDocument,
  reviewPanditBank,
  reviewPriceChange,
  type ServiceRate,
} from '../partners/actions'
import type { ApproveOptions } from '../partners/shared/approveOptions'
import { docLabel, toBankAccount, toKycDocument, toSchedule } from '../partners/data'
import type { Approval, ApprovalKind, BankView } from './types'

export const KIND_LABELS: Record<ApprovalKind, string> = {
  onboarding: 'Onboarding / KYC',
  price: 'Price change',
  bank: 'Bank account change',
  certificate: 'Certificate',
  document: 'Document',
}

export const APPLICATION_STAGES: Record<string, string> = {
  registered: 'Registered',
  personal_submitted: 'Personal details filed',
  professional_submitted: 'Profile filed',
  documents_submitted: 'Documents filed',
  bank_submitted: 'Bank details filed',
  under_review: 'Submitted for review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
}

// ---------- API → panel ----------

const iso = (d?: string | null) => (d ? new Date(d).toISOString() : undefined)
const PREFIX: Record<ApprovalKind, string> = { onboarding: 'ONB', price: 'PRC', bank: 'BNK', certificate: 'CRT', document: 'DOC' }

const bankView = (b: Row | null | undefined): BankView | null =>
  b ? { bank: b.bankName || (b.upiId ? 'UPI only' : '—'), accountLast4: b.accountLast4 ?? '', ifsc: b.ifsc ?? '', holder: b.holderName ?? '', upi: b.upiId || undefined } : null

function toApproval(r: Row): Approval {
  const astro = r.partnerType === 'astrologer'
  const base = {
    id: String(r.id),
    ref: `${PREFIX[r.kind as ApprovalKind] ?? 'REQ'}-${String(r.id).slice(-6).toUpperCase()}`,
    partnerType: r.partnerType,
    partnerId: String(r.partnerId),
    partnerName: r.partnerName || 'Partner',
    partnerCode: r.partnerCode || undefined,
    photoUrl: r.photoUrl ? fileUrl(r.photoUrl) : null,
    submittedAt: iso(r.submittedAt) ?? new Date(0).toISOString(),
    status: r.status,
    reviewedAt: iso(r.reviewedAt),
    reviewedBy: r.reviewedBy || undefined,
    reason: r.reason || undefined,
    note: r.note || undefined,
  } as const
  switch (r.kind as ApprovalKind) {
    case 'onboarding':
      return {
        ...base,
        kind: 'onboarding',
        applicationStatus: r.applicationStatus,
        experienceYears: r.experienceYears ?? 0,
        city: r.city ?? '',
        languages: (r.languages ?? []).map(titleCase),
        expertise: astro ? (r.expertise ?? []).map(expertiseLabel) : (r.expertise ?? []),
        gender: r.gender ? titleCase(r.gender) : undefined,
        email: r.email ?? '',
        phone: r.phone ?? '',
        about: r.about ?? '',
        availabilityNote: r.availabilityNote || undefined,
        commissionPercent: r.commissionPercent,
        services: (r.services ?? []).filter((s: Row) => ['chat', 'call', 'video'].includes(s.type)) as ServiceRate[],
        baseFee: r.baseFee ?? undefined,
        serviceRadiusKm: r.serviceRadiusKm ?? undefined,
        onlinePuja: r.offersOnlinePuja,
        documents: (r.documents ?? []).map(toKycDocument),
        bankAccounts: (r.bankAccounts ?? []).map(toBankAccount),
        bank: bankView(r.bank),
        schedule: r.availability?.length ? toSchedule(r.availability) : [],
        steps: r.onboarding?.steps ?? [],
        serviceArea: r.serviceArea || undefined,
        state: r.state || undefined,
        address: [r.address?.street, r.address?.city, r.address?.pin].filter(Boolean).join(', ') || undefined,
        timeline: (r.timeline ?? []).map((e: Row) => ({ key: e.key, label: e.label, at: iso(e.at) ?? '' })),
      }
    case 'price':
      return {
        ...base,
        kind: 'price',
        requestId: r.requestId,
        service: r.service,
        currentRate: r.currentRate ?? 0,
        requestedRate: r.requestedRate ?? 0,
        offerPercent: r.offerPercent ?? 0,
        applyToAll: !!r.applyToAll,
      }
    case 'bank':
      return {
        ...base,
        kind: 'bank',
        accountId: r.accountId || undefined,
        oldBank: bankView(r.oldBank),
        newBank: bankView(r.newBank) ?? { bank: '—', accountLast4: '', ifsc: '', holder: '' },
        proofUrl: r.proof?.url ? toKycDocument({ id: 'x', file: r.proof }).fileUrl : null,
        proofFile: r.proof?.fileName || (r.proof?.url ? 'Passbook / cheque' : 'No proof attached'),
      }
    default: {
      const doc = toKycDocument({ ...r, id: r.documentId, type: r.docType })
      return {
        ...base,
        kind: r.kind === 'certificate' ? 'certificate' : 'document',
        documentId: r.documentId,
        docType: r.title || docLabel(r.docType),
        rawType: r.docType,
        number: doc.number,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        mimeType: doc.mimeType,
        issuer: doc.issuer,
        year: doc.year,
      }
    }
  }
}

/** Unified partner approval queue (GET /admin/panel/approvals), decided rows included as history. */
export const approvalsDb = createRemoteCollection<Approval>({
  list: async () => (await api.get<{ items: Row[] }>('/admin/panel/approvals')).items.map(toApproval),
  staleMs: 20_000,
})

let primed = false
/** Sidebar badge: pending requests (loads the queue once in the background). */
export const pendingApprovals = () => {
  if (!primed) {
    primed = true
    approvalsDb.list().catch(() => {
      primed = false
    })
  }
  return approvalsDb.snapshot().filter(a => a.status === 'pending').length
}

// ---------- workflow ----------


/** Approve / reject a request through the partner's real endpoint; the queue re-fetches afterwards. */
export async function decideApproval(req: Approval, decision: 'approved' | 'rejected', reason?: string, options?: ApproveOptions) {
  const id = req.partnerId
  switch (req.kind) {
    case 'onboarding':
      if (decision === 'rejected') return rejectOnboarding(req.partnerType, id, reason)
      if (req.partnerType === 'pandit') return approvePandit(id)
      if (!options) throw new Error('Commission and rates are needed to approve an astrologer.')
      return approveAstrologer(id, options)
    case 'price':
      return reviewPriceChange(id, req.requestId, decision, reason)
    case 'bank':
      if (req.partnerType === 'pandit') return reviewPanditBank(id, decision, reason)
      if (!req.accountId) throw new Error('Bank account not found.')
      return reviewAstroBank(id, req.accountId, decision, reason)
    case 'certificate':
    case 'document':
      return reviewDocument(req.partnerType, id, req.documentId, decision, reason)
  }
}

/** Re-fetch the queue after an action taken on a partner page. */
export const refreshApprovals = () => approvalsDb.refresh?.().catch(() => undefined)

/** Pending requests for one partner (shown as a banner on partner pages). */
export const pendingFor = (partnerId: string, list: Approval[]) => list.filter(a => a.partnerId === partnerId && a.status === 'pending')
