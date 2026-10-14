import { createAppSettingsDb, createCatalogDb } from './api'
import { PERMISSION_MODULES, type AdminRole, type AppSettings, type CatalogList, type Permission, type PermissionModule, type RolePermissions } from './types'

// Live collections (Shree Astro admin API) — see ./api.ts.
export { adminsDb, auditDb, integrationsDb, takeTemporaryPassword } from './api'
import { createCollection } from '@/lib/store'
import { adminsDb, auditDb } from './api'

const all = (view: boolean, edit: boolean) =>
  Object.fromEntries(PERMISSION_MODULES.map(m => [m, { view, edit }])) as Record<PermissionModule, Permission>

const grant = (base: Record<PermissionModule, Permission>, edit: PermissionModule[], view: PermissionModule[] = []) => {
  const p = { ...base }
  view.forEach(m => (p[m] = { view: true, edit: false }))
  edit.forEach(m => (p[m] = { view: true, edit: true }))
  return p
}

export const rolesSeed: RolePermissions[] = [
  { id: 'Super Admin', description: 'Full access to every module, including admin users and settings.', permissions: all(true, true) },
  {
    id: 'Operations',
    description: 'Partners, approvals, consultations, puja bookings and store orders.',
    permissions: grant(all(false, false), ['Customers', 'Astrologers', 'Pandits', 'Approvals', 'Consultations', 'Puja Bookings', 'Store & Orders'], ['Dashboard', 'Support', 'Reviews', 'Finance']),
  },
  {
    id: 'Finance',
    description: 'Payouts, refunds, wallet transactions and commission reports.',
    permissions: grant(all(false, false), ['Finance'], ['Dashboard', 'Customers', 'Astrologers', 'Pandits', 'Consultations', 'Puja Bookings', 'Store & Orders']),
  },
  {
    id: 'Support',
    description: 'Tickets, leads and review moderation; read-only on customers and orders.',
    permissions: grant(all(false, false), ['Support', 'Reviews'], ['Dashboard', 'Customers', 'Astrologers', 'Pandits', 'Consultations', 'Puja Bookings', 'Store & Orders']),
  },
  {
    id: 'Content',
    description: 'Website pages, blogs, banners, e-puja catalogue and marketing campaigns.',
    permissions: grant(all(false, false), ['Content', 'Marketing'], ['Dashboard', 'Reviews']),
  },
]

export const appSettingsSeed: AppSettings = {
  id: 'app',
  appName: 'VedRashi',
  supportPhone: '+91 98765 43210',
  supportEmail: 'support@vedrashi.com',
  whatsapp: '+91 98765 43210',
  officeAddress: '2nd Floor, 14 Hauz Khas Village, Hauz Khas, New Delhi 110016',
  workingHours: 'Mon–Sun, 9:00 AM – 9:00 PM IST',
  social: {
    facebook: 'https://facebook.com/vedrashi',
    instagram: 'https://instagram.com/vedrashi',
    youtube: 'https://youtube.com/@vedrashi',
    twitter: 'https://x.com/vedrashi',
    linkedin: 'https://linkedin.com/company/vedrashi',
  },
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.vedrashi.app',
  appStoreUrl: 'https://apps.apple.com/in/app/vedrashi/id6501234567',
  maintenanceMode: false,
  maintenanceMessage: 'We are upgrading VedRashi to serve you better. Please check back in a little while.',
  forceUpdate: {
    userApp: { minVersion: '2.3.0', latestVersion: '2.5.1', enforce: false },
    astroApp: { minVersion: '1.8.0', latestVersion: '1.9.4', enforce: true },
  },
  rules: {
    intakeAcceptWaitSec: 120,
    lowBalanceWarningMin: 2,
    maxSessionMin: 90,
    minBalanceMinutes: 5,
    autoEndOnZeroBalance: true,
    allowFreeFirstSession: true,
    freeSessionMin: 5,
  },
  platform: {
    commissionPercent: 25,
    minRecharge: 10,
    maxRecharge: 100000,
    minPayout: 100,
    payoutCycle: 'weekly',
    features: { registrationsOpen: true, appleSignIn: false, googleSignIn: false, aiAssistant: true, voiceConsultations: true, autoApproveAstrologers: false, maintenanceMode: false, adminTwoFactor: true, cashOnDelivery: true },
    redeem: { enabled: true, pointValue: 1, minPoints: 100 },
  },
}

export const catalogSeed: CatalogList[] = [
  { id: 'languages', label: 'Languages', description: 'Offered on astrologer & pandit profiles and customer filters.', items: ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Sanskrit', 'Punjabi'] },
  { id: 'skills', label: 'Astrologer skills', description: 'Expertise chips astrologers pick during onboarding.', items: ['Vedic', 'Numerology', 'Tarot', 'KP System', 'Nadi', 'Palmistry', 'Vastu', 'Prashna', 'Lal Kitab', 'Face Reading', 'Psychic'] },
  { id: 'consultation-categories', label: 'Consultation categories', description: 'Life aspects shown on the UserApp home and intake form.', items: ['Love', 'Education', 'Marriage', 'Wealth', 'Health', 'Career'] },
  { id: 'puja-ceremonies', label: 'Puja ceremonies', description: 'Puja types pandits can offer and customers can book.', items: ['Satyanarayan Puja', 'Griha Pravesh', 'Navgraha Puja', 'Lakshmi Puja', 'Rudrabhishek', 'Mahamrityunjay Jaap', 'Kaal Sarp Dosh Puja', 'Mundan Sanskar', 'Vivah Sanskar', 'Havan'] },
  { id: 'cancellation-reasons', label: 'Cancellation reasons', description: 'Reasons offered when cancelling orders and puja bookings.', items: ['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Date no longer suitable', 'Pandit unavailable', 'Other'] },
  { id: 'support-categories', label: 'Support categories', description: 'Categories for tickets raised from the apps.', items: ['Payment', 'Refund', 'Consultation', 'Puja booking', 'Order', 'Account', 'Technical', 'Dispute'] },
]

/** Role descriptions and the permissions grid shown under Admin Users → Roles (the API's roles are fixed in models/Admin.js). */
export const rolesDb = createCollection<RolePermissions>(rolesSeed)
/** Starting values shown until an admin saves General / Consultation rules (see ./api.ts). */
export const appSettingsDb = createAppSettingsDb(appSettingsSeed)
/** Catalog lists — site-content `catalog-lists` (these until first saved). */
export const catalogDb = createCatalogDb(() => catalogSeed)

/** Lookup for ticket assignees etc. */
export const adminName = (id: string | null) => (id ? (adminsDb.snapshot().find(a => a.id === id)?.name ?? id) : 'Unassigned')

/**
 * The API writes an audit row for every admin change itself, so this only
 * refreshes the log view. Kept for the call sites that still announce actions.
 */
export function logAudit(actor: { name: string; role: AdminRole } | null, module: string, action: string, target: string) {
  void actor
  void module
  void action
  void target
  return auditDb.refresh().then(() => undefined)
}
