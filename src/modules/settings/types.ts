import type { AdminRole } from '@/lib/auth'

export type { AdminRole }

export const ADMIN_ROLES: AdminRole[] = ['Super Admin', 'Operations', 'Finance', 'Support', 'Content']

export interface AdminUser {
  id: string // ADM…
  name: string
  email: string
  phone: string
  role: AdminRole
  status: 'active' | 'inactive'
  twoFA: boolean
  lastLoginAt: string | null
  createdAt: string
}

export const PERMISSION_MODULES = [
  'Dashboard',
  'Customers',
  'Astrologers',
  'Pandits',
  'Approvals',
  'Consultations',
  'Puja Bookings',
  'Store & Orders',
  'Finance',
  'Marketing',
  'Content',
  'Support',
  'Reviews',
  'Settings',
  'Admin Users',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]
export type Permission = { view: boolean; edit: boolean }

export interface RolePermissions {
  id: AdminRole
  description: string
  permissions: Record<PermissionModule, Permission>
}

export interface AuditEntry {
  id: string
  actor: string
  role: AdminRole
  module: string
  action: string
  target: string
  ip: string
  at: string
}

export interface ForceUpdate {
  minVersion: string
  latestVersion: string
  enforce: boolean
}

export interface ConsultationRules {
  intakeAcceptWaitSec: number
  lowBalanceWarningMin: number
  maxSessionMin: number
  minBalanceMinutes: number
  autoEndOnZeroBalance: boolean
  allowFreeFirstSession: boolean
  freeSessionMin: number
}

/** Business switches and limits — the API's settings document. */
export interface PlatformSettings {
  commissionPercent: number
  minRecharge: number
  maxRecharge: number
  minPayout: number
  payoutCycle: 'daily' | 'weekly' | 'fortnightly' | 'monthly'
  features: {
    registrationsOpen: boolean
    appleSignIn: boolean
    googleSignIn: boolean
    aiAssistant: boolean
    voiceConsultations: boolean
    autoApproveAstrologers: boolean
    maintenanceMode: boolean
    adminTwoFactor: boolean
    cashOnDelivery: boolean
  }
  redeem: { enabled: boolean; pointValue: number; minPoints: number }
}

export interface AppSettings {
  id: 'app'
  appName: string
  supportPhone: string
  supportEmail: string
  whatsapp: string
  officeAddress: string
  workingHours: string
  social: { facebook: string; instagram: string; youtube: string; twitter: string; linkedin: string }
  playStoreUrl: string
  appStoreUrl: string
  maintenanceMode: boolean
  maintenanceMessage: string
  forceUpdate: { userApp: ForceUpdate; astroApp: ForceUpdate }
  rules: ConsultationRules
  platform: PlatformSettings
}

export interface CatalogList {
  id: string
  label: string
  description: string
  items: string[]
}

export interface IntegrationField {
  key: string
  label: string
  value: string
  secret: boolean
}

export interface Integration {
  id: string
  name: string
  category: 'Payments' | 'SMS' | 'Push notifications' | 'Maps' | 'Email' | 'Storage' | 'Sign-in' | 'Calls' | 'Astrology'
  provider: string
  enabled: boolean
  mode: 'live' | 'test'
  fields: IntegrationField[]
}
