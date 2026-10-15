// Fetch wrapper for the Shree Astro admin API (same contract as the apps' client).
// - Responses are the bare payload (`{ user }`, `{ items, total, page, limit }`, ...).
// - Errors are `{ error, code?, fields?: {name: message}, details? }`; they become ApiError
//   with an UPPER_SNAKE `code`.
// - Auth: the access token from the admin login/refresh is sent as a Bearer header; the
//   httpOnly `refreshToken` cookie (path /api/v1/auth) gets a new one via POST /auth/refresh.

export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api/v1').replace(/\/+$/, '')

export type FieldError = { field: string; message: string }

export class ApiError extends Error {
  status: number
  code?: string
  errors: FieldError[]
  details?: Record<string, unknown>
  constructor(status: number, message: string, code?: string, errors: FieldError[] = [], details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
    this.details = details
  }
  // First message for a field, e.g. err.field('email').
  field(name: string) {
    return this.errors.find(e => e.field === name || e.field.endsWith(`.${name}`))?.message
  }
}

export type Meta = { page: number; limit: number; total: number; pages: number }

export type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>
type Options = { query?: Query; body?: unknown; form?: FormData; signal?: AbortSignal; skipRefresh?: boolean }

// ---- tokens ---------------------------------------------------------------
let accessToken: string | null = null
let refreshToken: string | null = null
const tokenListeners = new Set<(t: string | null) => void>()

export const getAccessToken = () => accessToken
export const onAccessToken = (fn: (t: string | null) => void) => {
  tokenListeners.add(fn)
  return () => tokenListeners.delete(fn)
}
// Call with the body of any session-opening response ({ accessToken, refreshToken }).
export const setTokens = (t: { accessToken?: string; refreshToken?: string } | null) => {
  accessToken = t?.accessToken ?? null
  refreshToken = t?.refreshToken ?? (t ? refreshToken : null)
  tokenListeners.forEach(fn => fn(accessToken))
}

let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn
}

const qs = (query?: Query) => {
  if (!query) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    // The API takes lists as comma-separated values.
    if (Array.isArray(v)) {
      if (v.length) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`)
    } else parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

// One refresh at a time; resolves true when a new access token was obtained.
let refreshing: Promise<boolean> | null = null
export const refreshSession = () => {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  })
    .then(async r => {
      if (!r.ok) return false
      const json = await r.json().catch(() => null)
      if (!json?.accessToken) return false
      setTokens(json)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toApiError = (status: number, json: any): ApiError => {
  const code = typeof json?.code === 'string' ? json.code.toUpperCase() : undefined
  const fields: FieldError[] =
    json?.fields && typeof json.fields === 'object' ? Object.entries(json.fields).map(([field, message]) => ({ field, message: String(message) })) : []
  const message =
    (fields.length && json?.error === 'Please check the form.' ? fields[0].message : json?.error) ??
    (json ? 'Something went wrong. Please try again.' : `Server is not responding properly (HTTP ${status}). Please try again.`)
  return new ApiError(status, message, code, fields, json?.details)
}

async function raw<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  let res: Response
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (!opts.form) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    res = await fetch(`${API_BASE}${path}${qs(opts.query)}`, {
      method,
      credentials: 'include',
      signal: opts.signal,
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    throw new ApiError(0, 'Unable to reach the server. Check your internet connection.', 'NETWORK')
  }
  const json = await res.json().catch(() => null)
  if (res.ok) return json as T

  const err = toApiError(res.status, json)
  const expired = res.status === 401 && ['TOKEN_EXPIRED', 'NO_TOKEN', 'INVALID_TOKEN'].includes(err.code ?? '')
  if (expired && !opts.skipRefresh) {
    if (await refreshSession()) return raw<T>(method, path, { ...opts, skipRefresh: true })
    setTokens(null)
    onSessionExpired?.()
  } else if (accessToken && ((res.status === 401 && err.code === 'ACCOUNT_MISSING') || (res.status === 403 && err.code === 'ACCOUNT_BLOCKED'))) {
    // The admin account was removed or suspended while signed in.
    setTokens(null)
    onSessionExpired?.()
  }
  throw err
}

type ListBody<I> = { items: I[]; total?: number; page?: number; limit?: number }

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => raw<T>('GET', path, { query, signal }),
  // `{ items, total, page, limit }` → `{ data: items, meta, body }`.
  list: async <I, B extends ListBody<I> = ListBody<I>>(path: string, query?: Query, signal?: AbortSignal) => {
    const body = await raw<B>('GET', path, { query, signal })
    const items = body?.items ?? []
    const limit = body?.limit ?? items.length
    const total = body?.total ?? items.length
    const meta: Meta = { page: body?.page ?? 1, limit, total, pages: limit ? Math.max(1, Math.ceil(total / limit)) : 1 }
    return { data: items, meta, body }
  },
  post: <T>(path: string, body?: unknown) => raw<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => raw<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => raw<T>('PATCH', path, { body }),
  del: <T>(path: string, body?: unknown) => raw<T>('DELETE', path, { body }),
  upload: <T>(path: string, form: FormData, method: 'POST' | 'PUT' | 'PATCH' = 'POST') => raw<T>(method, path, { form }),
}

// Mongo docs sometimes come back with `_id` instead of `id`.
export const withId = <T extends Record<string, unknown>>(o: T): T & { id: string } => ({ ...o, id: String(o.id ?? o._id) })

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong')

/**
 * Walk every page of a list endpoint (the API caps `limit` at 100) and return all rows.
 * `max` guards against runaway tables; the panel filters and paginates client-side.
 */
export async function fetchAll<I>(path: string, query: Query = {}, max = 1000): Promise<I[]> {
  const out: I[] = []
  for (let page = 1; out.length < max; page++) {
    const { data, meta } = await api.list<I>(path, { ...query, page, limit: 100 })
    out.push(...data)
    if (!data.length || page >= meta.pages) break
  }
  return out
}

/** Absolute URL for a file the API serves (uploads come back as `/uploads/...` paths). */
export const fileUrl = (path?: string | null) => {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return `${API_BASE.replace(/\/api\/v1\/?$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}
