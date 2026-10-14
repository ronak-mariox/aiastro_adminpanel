import type { ServiceRate } from '../actions'

export type ApproveOptions = { commissionPercent: number; services: ServiceRate[] }

const SERVICES: ServiceRate['type'][] = ['chat', 'call', 'video']

/** Pre-fills the approve form from the rates the astrologer filed. */
export function approveDefaults(filed: ServiceRate[], commissionPercent?: number): ApproveOptions {
  return {
    commissionPercent: commissionPercent ?? 25,
    services: SERVICES.map(type => {
      const s = filed.find(x => x.type === type)
      return { type, ratePerMinute: s?.ratePerMinute ?? 0, isEnabled: s ? s.isEnabled : false }
    }),
  }
}

/** Error text when the form cannot be sent, else null. */
export function approveFormError(v: ApproveOptions) {
  const enabled = v.services.filter(s => s.isEnabled)
  if (!enabled.length) return 'Enable at least one service.'
  if (enabled.some(s => !(s.ratePerMinute >= 1))) return 'Every enabled service needs a rate of at least ₹1/min.'
  if (!(v.commissionPercent >= 0 && v.commissionPercent <= 100)) return 'Commission must be between 0 and 100%.'
  return null
}

/** What the API takes: enabled services, plus disabled ones that still carry a rate. */
export const approveBody = (v: ApproveOptions): ApproveOptions => ({ ...v, services: v.services.filter(s => s.isEnabled || s.ratePerMinute > 0) })

