// Settings ↔ Shree Astro admin API.
//   app settings   GET/PATCH /admin/settings (support contact, maintenance, app versions, commission,
//                  recharge/payout limits, feature switches, loyalty.redeem) + site-content `app-general`
//                  (everything the API has no field for: socials, store links, address, force-update rules)
//                  + site-content `consultation-rules`
//   catalog lists  site-content `catalog-lists`
//   integrations   GET /admin/integrations, PUT /admin/integrations/:provider, PATCH …/enabled
//   admin team     GET/POST /admin/team, PATCH/DELETE /admin/team/:id (DELETE suspends)
//   audit log      GET /admin/audit-logs (written by the API on every admin change)

import { api } from '@/lib/api'
import { ROLE_LABELS, ROLE_VALUES, type BackendAdminRole } from '@/lib/auth'
import { createContentListCollection, createRemoteCollection, fetchAll, siteContent } from '@/lib/remoteCollection'
import type { AdminUser, AppSettings, AuditEntry, CatalogList, ConsultationRules, Integration, PlatformSettings } from './types'

// ------------------------------------------------------------ app settings

type SSettings = {
  commissionPercent?: number
  minRecharge?: number
  maxRecharge?: number
  minPayout?: number
  payoutCycle?: PlatformSettings['payoutCycle']
  features?: Partial<PlatformSettings['features']>
  appVersions?: { userAndroid?: string; userIos?: string; astrologerAndroid?: string; astrologerIos?: string; minimumSupported?: string }
  loyalty?: { redeem?: { enabled?: boolean; pointValue?: number; minPoints?: number } }
  supportEmail?: string
  supportPhone?: string
  updatedAt?: string
}

/** What `app-general` holds — the panel fields the settings document has no place for. */
type General = Pick<AppSettings, 'appName' | 'whatsapp' | 'officeAddress' | 'workingHours' | 'social' | 'playStoreUrl' | 'appStoreUrl' | 'maintenanceMessage' | 'forceUpdate'>

const FEATURE_DEFAULTS: PlatformSettings['features'] = {
  registrationsOpen: true,
  appleSignIn: false,
  googleSignIn: false,
  aiAssistant: true,
  voiceConsultations: true,
  autoApproveAstrologers: false,
  maintenanceMode: false,
  adminTwoFactor: true,
  cashOnDelivery: true,
}

function toAppSettings(s: SSettings, general: General | null, rules: ConsultationRules | null, seed: AppSettings): AppSettings {
  const g = general ?? seed
  const v = s.appVersions ?? {}
  return {
    ...seed,
    ...g,
    id: 'app',
    supportPhone: s.supportPhone ?? seed.supportPhone,
    supportEmail: s.supportEmail ?? seed.supportEmail,
    maintenanceMode: !!s.features?.maintenanceMode,
    forceUpdate: {
      userApp: { ...g.forceUpdate.userApp, latestVersion: v.userAndroid ?? g.forceUpdate.userApp.latestVersion, minVersion: v.minimumSupported ?? g.forceUpdate.userApp.minVersion },
      astroApp: { ...g.forceUpdate.astroApp, latestVersion: v.astrologerAndroid ?? g.forceUpdate.astroApp.latestVersion },
    },
    rules: rules ?? seed.rules,
    platform: {
      commissionPercent: s.commissionPercent ?? 25,
      minRecharge: s.minRecharge ?? 10,
      maxRecharge: s.maxRecharge ?? 100000,
      minPayout: s.minPayout ?? 100,
      payoutCycle: s.payoutCycle ?? 'weekly',
      features: { ...FEATURE_DEFAULTS, ...(s.features ?? {}) },
      redeem: {
        enabled: s.loyalty?.redeem?.enabled !== false,
        pointValue: s.loyalty?.redeem?.pointValue ?? 1,
        minPoints: s.loyalty?.redeem?.minPoints ?? 100,
      },
    },
  }
}

export function createAppSettingsDb(seed: AppSettings) {
  const load = async () => {
    const [{ settings }, general, rules] = await Promise.all([
      api.get<{ settings: SSettings }>('/admin/settings'),
      siteContent.get<General>('app-general'),
      siteContent.get<ConsultationRules>('consultation-rules'),
    ])
    return { settings, general, rules }
  }
  return createRemoteCollection<AppSettings>({
    list: async () => {
      const { settings, general, rules } = await load()
      return [toAppSettings(settings, general, rules, seed)]
    },
    update: async (_id, patch, current) => {
      const next = { ...current, ...patch }
      const calls: Promise<unknown>[] = []
      // Settings-document fields (one PATCH, only what this save touched).
      const body: SSettings = {}
      if ('supportEmail' in patch || 'supportPhone' in patch || 'maintenanceMode' in patch || 'forceUpdate' in patch) {
        body.supportEmail = next.supportEmail
        body.supportPhone = next.supportPhone
        body.features = { maintenanceMode: next.maintenanceMode }
        body.appVersions = {
          userAndroid: next.forceUpdate.userApp.latestVersion,
          userIos: next.forceUpdate.userApp.latestVersion,
          astrologerAndroid: next.forceUpdate.astroApp.latestVersion,
          astrologerIos: next.forceUpdate.astroApp.latestVersion,
          minimumSupported: next.forceUpdate.userApp.minVersion,
        }
      }
      if (patch.platform) {
        const p = next.platform
        Object.assign(body, {
          commissionPercent: p.commissionPercent,
          minRecharge: p.minRecharge,
          maxRecharge: p.maxRecharge,
          minPayout: p.minPayout,
          payoutCycle: p.payoutCycle,
          features: { ...(body.features ?? {}), ...p.features },
          loyalty: { redeem: p.redeem },
        })
      }
      if (Object.keys(body).length) calls.push(api.patch('/admin/settings', body))
      const generalKeys: (keyof General)[] = ['appName', 'whatsapp', 'officeAddress', 'workingHours', 'social', 'playStoreUrl', 'appStoreUrl', 'maintenanceMessage', 'forceUpdate']
      if (generalKeys.some(k => k in patch)) {
        const general = Object.fromEntries(generalKeys.map(k => [k, next[k]])) as General
        calls.push(siteContent.save('app-general', general))
      }
      if (patch.rules) calls.push(siteContent.save('consultation-rules', next.rules))
      await Promise.all(calls)
      const { settings, general, rules } = await load()
      return toAppSettings(settings, general, rules, seed)
    },
  })
}

export const createCatalogDb = (seed: () => CatalogList[]) => createContentListCollection<CatalogList>('catalog-lists', seed)

// ----------------------------------------------------------- integrations

type SIntegration = { provider: string; enabled: boolean; values: Record<string, string | null> }

const PROVIDERS: Record<string, { name: string; category: Integration['category']; provider: string; fields: { key: string; label: string; secret: boolean }[] }> = {
  razorpay: {
    name: 'Payment gateway',
    category: 'Payments',
    provider: 'Razorpay',
    fields: [
      { key: 'keyId', label: 'Key ID', secret: false },
      { key: 'keySecret', label: 'Key secret', secret: true },
      { key: 'webhookSecret', label: 'Webhook secret', secret: true },
    ],
  },
  agora: {
    name: 'Voice calls',
    category: 'Calls',
    provider: 'Agora',
    fields: [
      { key: 'appId', label: 'App ID', secret: false },
      { key: 'appCertificate', label: 'App certificate', secret: true },
    ],
  },
  astrologyApi: {
    name: 'Kundli & horoscope data',
    category: 'Astrology',
    provider: 'AstrologyAPI',
    fields: [
      { key: 'userId', label: 'User ID', secret: false },
      { key: 'apiKey', label: 'API key', secret: true },
    ],
  },
  sms: {
    name: 'SMS / OTP provider',
    category: 'SMS',
    provider: 'MSG91',
    fields: [
      { key: 'authKey', label: 'Auth key', secret: true },
      { key: 'senderId', label: 'Sender ID', secret: false },
      { key: 'templateId', label: 'OTP template ID', secret: false },
      { key: 'appLinkTemplateId', label: 'App download link template ID (Flow)', secret: false },
    ],
  },
  firebase: {
    name: 'Push notifications',
    category: 'Push notifications',
    provider: 'Firebase Cloud Messaging',
    fields: [
      { key: 'projectId', label: 'Project ID', secret: false },
      { key: 'clientEmail', label: 'Service account email', secret: false },
      { key: 'privateKey', label: 'Private key', secret: true },
    ],
  },
  email: {
    name: 'Email (SMTP)',
    category: 'Email',
    provider: 'SMTP',
    fields: [
      { key: 'host', label: 'Host', secret: false },
      { key: 'port', label: 'Port', secret: false },
      { key: 'username', label: 'Username', secret: false },
      { key: 'password', label: 'Password', secret: true },
    ],
  },
  awsS3: {
    name: 'File storage',
    category: 'Storage',
    provider: 'AWS S3',
    fields: [
      { key: 'accessKeyId', label: 'Access key ID', secret: false },
      { key: 'secretAccessKey', label: 'Secret access key', secret: true },
      { key: 'bucket', label: 'Bucket', secret: false },
      { key: 'region', label: 'Region', secret: false },
    ],
  },
  google: { name: 'Google sign-in', category: 'Sign-in', provider: 'Google', fields: [{ key: 'clientIds', label: 'Client IDs (comma-separated)', secret: false }] },
  apple: {
    name: 'Apple sign-in',
    category: 'Sign-in',
    provider: 'Apple',
    fields: [
      { key: 'serviceId', label: 'Service ID', secret: false },
      { key: 'teamId', label: 'Team ID', secret: false },
      { key: 'keyId', label: 'Key ID', secret: false },
      { key: 'privateKey', label: 'Private key', secret: true },
    ],
  },
}

const toIntegration = (i: SIntegration): Integration => {
  const meta = PROVIDERS[i.provider] ?? { name: i.provider, category: 'Storage' as const, provider: i.provider, fields: Object.keys(i.values).map(key => ({ key, label: key, secret: false })) }
  return {
    id: i.provider,
    name: meta.name,
    category: meta.category,
    provider: meta.provider,
    enabled: i.enabled,
    mode: i.provider === 'razorpay' && String(i.values.keyId ?? '').startsWith('rzp_test') ? 'test' : 'live',
    // Secrets come back masked; they are sent again only when retyped.
    fields: meta.fields.map(f => ({ ...f, value: i.values[f.key] ?? '' })),
  }
}

export const integrationsDb = createRemoteCollection<Integration>({
  list: async () => {
    const { integrations } = await api.get<{ integrations: SIntegration[] }>('/admin/integrations')
    const order = Object.keys(PROVIDERS)
    return integrations.map(toIntegration).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  },
  update: async (id, patch, current) => {
    const next = { ...current, ...patch }
    const changed = Object.fromEntries(
      next.fields.filter(f => f.value !== current.fields.find(c => c.key === f.key)?.value).map(f => [f.key, f.value.trim()]),
    )
    if (Object.keys(changed).length) {
      // Saving always switches the provider on (API rule); switch it back off if that was asked.
      await api.put(`/admin/integrations/${id}`, changed)
      if (!next.enabled) await api.patch(`/admin/integrations/${id}/enabled`, { enabled: false })
    } else if (next.enabled !== current.enabled) {
      await api.patch(`/admin/integrations/${id}/enabled`, { enabled: next.enabled })
    }
    const { integrations } = await api.get<{ integrations: SIntegration[] }>('/admin/integrations')
    const row = integrations.find(i => i.provider === id)
    return row ? toIntegration(row) : next
  },
})

// -------------------------------------------------------------- admin team

type SAdmin = { id: string; name: string; email: string; role: BackendAdminRole; status: string; lastLoginAt?: string | null; lastActive?: string | null; createdAt: string }

const toAdmin = (a: SAdmin): AdminUser => ({
  id: a.id,
  name: a.name,
  email: a.email,
  phone: '',
  role: ROLE_LABELS[a.role] ?? 'Operations',
  status: a.status === 'active' ? 'active' : 'inactive',
  twoFA: true,
  lastLoginAt: a.lastLoginAt ?? null,
  createdAt: a.createdAt,
})

/** The one-time password of the admin just invited (shown once by the page). */
let lastTemporaryPassword: string | null = null
export const takeTemporaryPassword = () => {
  const p = lastTemporaryPassword
  lastTemporaryPassword = null
  return p
}

export const adminsDb = createRemoteCollection<AdminUser>({
  list: async () => (await fetchAll<SAdmin>('/admin/team')).map(toAdmin),
  create: async a => {
    const r = await api.post<{ admin: SAdmin; temporaryPassword: string }>('/admin/team', { name: a.name, email: a.email, role: ROLE_VALUES[a.role] })
    lastTemporaryPassword = r.temporaryPassword
    return { ...a, id: r.admin.id, status: 'active' }
  },
  update: async (id, patch, current) => {
    const body: Record<string, unknown> = {}
    if (patch.name && patch.name !== current.name) body.name = patch.name
    if (patch.role && patch.role !== current.role) body.role = ROLE_VALUES[patch.role]
    if (patch.status && patch.status !== current.status) body.status = patch.status === 'active' ? 'active' : 'suspended'
    if (Object.keys(body).length) await api.patch(`/admin/team/${id}`, body)
    return { ...current, ...patch, phone: current.phone, email: current.email }
  },
  remove: async id => {
    await api.del(`/admin/team/${id}`)
  },
})

// --------------------------------------------------------------- audit log

type SAudit = { _id?: string; id?: string; adminName?: string; adminRole?: BackendAdminRole; action: string; area?: string; target?: string; ip?: string; createdAt: string }

export const auditDb = createRemoteCollection<AuditEntry>(
  {
  list: async () =>
    (await fetchAll<SAudit>('/admin/audit-logs', {}, 500)).map(a => ({
      id: String(a.id ?? a._id),
      actor: a.adminName ?? 'System',
      role: a.adminRole ? (ROLE_LABELS[a.adminRole] ?? 'Operations') : 'Super Admin',
      module: a.area ?? '—',
      action: a.action,
      target: a.target ?? '',
      ip: (a.ip ?? '').replace(/^::ffff:/, ''),
      at: a.createdAt,
    })),
  },
  { freshMs: 5_000 },
)
