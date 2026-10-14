import { api } from '@/lib/api'
import { SEGMENTS } from './data'
import type { Campaign } from './types'

export type ComposeDraft = Pick<Campaign, 'title' | 'body' | 'channels' | 'audience' | 'segment' | 'city' | 'type' | 'deepLink'>

export const emptyCompose: ComposeDraft = {
  title: '',
  body: '',
  channels: ['push'],
  audience: 'all',
  segment: SEGMENTS[0],
  city: 'Delhi',
  type: 'offer',
  deepLink: 'vedrashi://home',
}

/** How many accounts the audience reaches right now (POST /admin/campaigns/estimate). */
export async function estimateRecipients(d: Pick<ComposeDraft, 'audience' | 'segment' | 'city'>, signal?: AbortSignal) {
  const body = { audience: d.audience, ...(d.audience === 'customers' ? { segment: d.segment } : {}), ...(d.audience === 'city' ? { city: d.city } : {}) }
  void signal
  const r = await api.post<{ recipients: number }>('/admin/campaigns/estimate', body)
  return r.recipients
}
