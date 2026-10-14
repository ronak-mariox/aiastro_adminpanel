import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API_BASE, api, getAccessToken, refreshSession, setSessionExpiredHandler, setTokens } from './api'
import { resetRemoteCollections } from './store'

// Real admin session against the Shree Astro API:
//   POST /auth/admin/login (email + password) → { requiresOtp, destination, devCode? }
//   POST /auth/admin/login/verify (email + code) → { accessToken, refreshToken, admin }
// The refresh token also lives in an httpOnly cookie, so a reload restores the
// session through POST /auth/refresh + GET /auth/me.

/** Display labels the panel's screens use (Settings → Admin team etc.). */
export type AdminRole = 'Super Admin' | 'Operations' | 'Finance' | 'Support' | 'Content'

/** Roles as the backend stores them (models/Admin.js). */
export type BackendAdminRole = 'super_admin' | 'admin' | 'finance' | 'support_lead' | 'content_manager' | 'consultation_manager' | 'user_manager'

export const ROLE_LABELS: Record<BackendAdminRole, AdminRole> = {
  super_admin: 'Super Admin',
  admin: 'Operations',
  consultation_manager: 'Operations',
  user_manager: 'Operations',
  finance: 'Finance',
  support_lead: 'Support',
  content_manager: 'Content',
}

/** Panel label → the backend role it creates (for forms that pick a role). */
export const ROLE_VALUES: Record<AdminRole, BackendAdminRole> = {
  'Super Admin': 'super_admin',
  Operations: 'admin',
  Finance: 'finance',
  Support: 'support_lead',
  Content: 'content_manager',
}

export type AdminSession = {
  id: string
  name: string
  email: string
  role: AdminRole
  backendRole: BackendAdminRole
  permissions: string[]
  avatarUrl?: string
}

type ApiAdmin = { id: string; name: string; email: string; role: BackendAdminRole; permissions?: string[]; avatarUrl?: string }

export const toSession = (a: ApiAdmin): AdminSession => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: ROLE_LABELS[a.role] ?? 'Operations',
  backendRole: a.role,
  permissions: a.permissions ?? [],
  avatarUrl: a.avatarUrl,
})

export type LoginChallenge = { email: string; destination?: string; expiresInSeconds?: number; resendInSeconds?: number; devCode?: string }
type LoginResult = { requiresOtp: true; challenge: LoginChallenge } | { requiresOtp: false }

type AuthValue = {
  admin: AdminSession | null
  /** 'loading' while the saved session is being restored on page load. */
  status: 'loading' | 'authed' | 'anon'
  /** Step 1. Resolves with an OTP challenge (the default) or signs in directly when 2FA is off. */
  login: (email: string, password: string) => Promise<LoginResult>
  /** Step 2: the emailed code. */
  verifyOtp: (email: string, code: string) => Promise<void>
  resendOtp: (email: string) => Promise<LoginChallenge>
  logout: () => Promise<void>
  /** Permission gate, e.g. can('payouts.approve'). Super admins pass everything. */
  can: (permission?: string | string[]) => boolean
  /** True once a request came back 401 and the refresh failed. Cleared on the next login. */
  expired: boolean
  setAdmin: (a: AdminSession) => void
}

const noop = async () => {
  throw new Error('AuthProvider missing')
}
const AuthContext = createContext<AuthValue>({
  admin: null,
  status: 'anon',
  login: noop,
  verifyOtp: noop,
  resendOtp: noop,
  logout: async () => {},
  can: () => false,
  expired: false,
  setAdmin: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<AdminSession | null>(null)
  const [status, setStatus] = useState<AuthValue['status']>('loading')
  const [expired, setExpired] = useState(false)

  const signIn = useCallback((a: ApiAdmin) => {
    setAdminState(toSession(a))
    setStatus('authed')
    setExpired(false)
  }, [])

  const signOutLocal = useCallback(() => {
    setTokens(null)
    resetRemoteCollections()
    setAdminState(null)
    setStatus('anon')
  }, [])

  // Restore the session on load: trade the httpOnly refresh cookie for an access token.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const ok = getAccessToken() ? true : await refreshSession()
      if (!ok) {
        if (alive) setStatus('anon')
        return
      }
      try {
        const me = await api.get<{ role: string; admin?: ApiAdmin }>('/auth/me')
        if (!alive) return
        if (me.role === 'admin' && me.admin) signIn(me.admin)
        else signOutLocal()
      } catch {
        if (alive) signOutLocal()
      }
    })()
    return () => {
      alive = false
    }
  }, [signIn, signOutLocal])

  // Any request that can no longer be refreshed sends the admin back to the login screen.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      resetRemoteCollections()
      setAdminState(null)
      setStatus('anon')
      setExpired(true)
    })
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const res = await api.post<
        LoginChallenge & { requiresOtp: boolean; accessToken?: string; refreshToken?: string; admin?: ApiAdmin }
      >('/auth/admin/login', { email: email.trim().toLowerCase(), password })
      if (res.requiresOtp) {
        const { email: e, destination, expiresInSeconds, resendInSeconds, devCode } = res
        return { requiresOtp: true, challenge: { email: e ?? email, destination, expiresInSeconds, resendInSeconds, devCode } }
      }
      setTokens(res)
      if (res.admin) signIn(res.admin)
      return { requiresOtp: false }
    },
    [signIn],
  )

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const res = await api.post<{ accessToken: string; refreshToken: string; admin: ApiAdmin }>('/auth/admin/login/verify', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      })
      setTokens(res)
      signIn(res.admin)
    },
    [signIn],
  )

  const resendOtp = useCallback(async (email: string) => {
    const res = await api.post<LoginChallenge>('/auth/admin/login/resend', { email: email.trim().toLowerCase() })
    return { ...res, email }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Revokes the refresh token server-side and clears the cookies.
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
        body: '{}',
      })
    } catch {
      /* offline: still sign out locally */
    }
    setExpired(false)
    signOutLocal()
  }, [signOutLocal])

  const can = useCallback(
    (permission?: string | string[]) => {
      if (!permission) return true
      if (!admin) return false
      if (admin.backendRole === 'super_admin') return true
      const list = Array.isArray(permission) ? permission : [permission]
      return list.some(p => admin.permissions.includes(p))
    },
    [admin],
  )

  const value = useMemo<AuthValue>(
    () => ({ admin, status, login, verifyOtp, resendOtp, logout, can, expired, setAdmin: setAdminState }),
    [admin, status, login, verifyOtp, resendOtp, logout, can, expired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
