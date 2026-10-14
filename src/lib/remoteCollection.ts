import { useEffect } from 'react'
import { useToast } from '@/components/ui'
import { api, ApiError, errorMessage, onAccessToken } from './api'
import type { Collection } from './store'

/**
 * A `Collection` (see ./store.ts) backed by the admin API instead of memory.
 *
 * Pages keep calling `list/create/update/remove` and reading `useCollection`;
 * each module's api file supplies a `RemoteSpec` that maps the page's shape to
 * the backend and back. Reads never reject (a failed load keeps what was
 * there and reports the error); writes report the error and then rethrow, so
 * a page never shows a success toast for something the server refused.
 */
export interface RemoteSpec<T extends { id: string }> {
  /** Every record the page works with. */
  list: () => Promise<T[]>
  /** One record, when it may not be in the list (detail pages). */
  get?: (id: string) => Promise<T | undefined>
  create?: (item: T) => Promise<T>
  /** `current` is the record before the patch; return the saved record. */
  update?: (id: string, patch: Partial<T>, current: T) => Promise<T>
  remove?: (id: string, current: T) => Promise<void>
}

export type RemoteCollection<T extends { id: string }> = Collection<T> & {
  /** Fetch again even if the cache is fresh. */
  refresh: () => Promise<T[]>
  /** Last load error, if the latest load failed. */
  error: () => string | null
  /** Put a server copy of one record in place (after a custom action). */
  put: (item: T) => void
  /** Drop one record locally (after a custom action removed it). */
  drop: (id: string) => void
}

type Listener = (message: string) => void
const errorListeners = new Set<Listener>()
const HANDLED = Symbol('remoteErrorHandled')

/** Reports an API failure to the toaster and marks it so the unhandled-rejection guard stays quiet. */
export function reportError(e: unknown) {
  if ((e as { name?: string })?.name === 'AbortError') return
  const message = errorMessage(e)
  errorListeners.forEach(fn => fn(message))
  if (e && typeof e === 'object') (e as Record<symbol, boolean>)[HANDLED] = true
}

/** Mount once inside the page tree: turns API failures from remote collections into error toasts. */
export function useRemoteErrorToasts() {
  const toast = useToast()
  useEffect(() => {
    const fn: Listener = message => toast(message, 'error')
    errorListeners.add(fn)
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const r = ev.reason as Record<symbol, boolean> | undefined
      if (r && typeof r === 'object' && r[HANDLED]) ev.preventDefault()
      else if (ev.reason instanceof ApiError) {
        ev.preventDefault()
        toast(ev.reason.message, 'error')
      }
    }
    window.addEventListener('unhandledrejection', onUnhandled)
    return () => {
      errorListeners.delete(fn)
      window.removeEventListener('unhandledrejection', onUnhandled)
    }
  }, [toast])
}

const FRESH_MS = 15_000

/** Every remote collection, so a sign-out can drop what the previous admin loaded. */
const registry = new Set<() => void>()
let signedIn = false
onAccessToken(token => {
  const now = !!token
  if (signedIn && !now) registry.forEach(reset => reset())
  signedIn = now
})

export function createRemoteCollection<T extends { id: string }>(spec: RemoteSpec<T>, opts: { freshMs?: number } = {}): RemoteCollection<T> {
  let items: T[] = []
  let loadedAt = 0
  let inflight: Promise<T[]> | null = null
  let lastError: string | null = null
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(l => l())
  const freshMs = opts.freshMs ?? FRESH_MS

  const load = (): Promise<T[]> => {
    inflight ??= spec
      .list()
      .then(rows => {
        items = rows
        loadedAt = Date.now()
        lastError = null
        emit()
        return items
      })
      .catch(e => {
        lastError = errorMessage(e)
        reportError(e)
        emit()
        return items
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  registry.add(() => {
    items = []
    loadedAt = 0
    lastError = null
    emit()
  })

  const replace = (item: T) => {
    const exists = items.some(i => i.id === item.id)
    items = exists ? items.map(i => (i.id === item.id ? item : i)) : [item, ...items]
    emit()
  }

  const guard = async <R>(work: () => Promise<R>): Promise<R> => {
    try {
      return await work()
    } catch (e) {
      reportError(e)
      throw e
    }
  }

  return {
    list: () => (loadedAt && Date.now() - loadedAt < freshMs ? Promise.resolve(items) : load()),
    refresh: load,
    error: () => lastError,
    async get(id) {
      const hit = items.find(i => i.id === id)
      if (hit || !spec.get) return hit
      try {
        const row = await spec.get(id)
        if (row) replace(row)
        return row
      } catch (e) {
        reportError(e)
        return undefined
      }
    },
    create: item =>
      guard(async () => {
        if (!spec.create) throw new Error('Creating is not supported here.')
        const saved = await spec.create(item)
        replace(saved)
        return saved
      }),
    update: (id, patch) =>
      guard(async () => {
        const current = items.find(i => i.id === id)
        if (!current) throw new Error('This record is no longer available. Refresh the page.')
        if (!spec.update) throw new Error('Editing is not supported here.')
        const saved = await spec.update(id, patch, current)
        replace(saved)
        return saved
      }),
    remove: id =>
      guard(async () => {
        const current = items.find(i => i.id === id)
        if (current && spec.remove) await spec.remove(id, current)
        else if (!spec.remove) throw new Error('Deleting is not supported here.')
        items = items.filter(i => i.id !== id)
        emit()
      }),
    put: replace,
    drop: id => {
      items = items.filter(i => i.id !== id)
      emit()
    },
    snapshot: () => items,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Every page of a `{ items, total, page, limit }` list (the API caps `limit` at 100). */
export async function fetchAll<R>(path: string, query: Record<string, string | number | boolean | undefined> = {}, max = 2000): Promise<R[]> {
  const out: R[] = []
  for (let page = 1; out.length < max; page++) {
    const body = await api.get<{ items?: R[]; total?: number }>(path, { ...query, page, limit: 100 })
    const rows = body?.items ?? []
    out.push(...rows)
    if (rows.length < 100 || (body?.total !== undefined && out.length >= body.total)) break
  }
  return out
}

export type UploadFolder = 'products' | 'pujas' | 'banners' | 'articles' | 'testimonials' | 'offers' | 'misc'

const MAX_EDGE = 2000
const SHRINK_ABOVE = 1.5 * 1024 * 1024

/**
 * Camera photos are often 5–10 MB (the server takes up to 5 MB) and slow to load in the
 * apps. Large or oversized JPEG/PNG/WebP files are redrawn at most 2000px on the long edge
 * as an 85% JPEG before upload; anything the browser can't decode (e.g. HEIC) goes as is.
 */
async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= SHRINK_ABOVE) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff' // PNG transparency becomes white, not black, in a JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** POST /admin/uploads — stores one image and answers its public URL. */
export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  const form = new FormData()
  form.append('file', await shrinkImage(file))
  try {
    const r = await api.upload<{ url: string }>(`/admin/uploads?folder=${folder}`, form)
    return r.url
  } catch (e) {
    reportError(e)
    throw e
  }
}

/** Admin-managed lists/blocks stored by key (GET/PUT /admin/site-content/:key). `data` is null until first saved. */
export const siteContent = {
  get: async <D>(key: string): Promise<D | null> => (await api.get<{ data: D | null }>(`/admin/site-content/${key}`)).data,
  save: async <D>(key: string, data: D): Promise<D> => (await api.put<{ data: D }>(`/admin/site-content/${key}`, { data })).data,
}

/**
 * A list kept under one site-content key, as a collection: every write saves
 * the whole list. `seed` fills it (in memory) until the first save.
 */
export function createContentListCollection<T extends { id: string }>(
  key: string,
  seed: () => T[],
  opts: { normalise?: (rows: T[]) => T[]; prepare?: (item: T) => T } = {},
): RemoteCollection<T> {
  /** Server-side truth, changed one write at a time so two quick edits never overwrite each other. */
  let rows: T[] = []
  let chain: Promise<unknown> = Promise.resolve()
  const serial = <R>(work: () => Promise<R>): Promise<R> => {
    const next = chain.then(work, work)
    chain = next.catch(() => undefined)
    return next
  }
  const save = (change: (list: T[]) => T[]) =>
    serial(async () => {
      rows = await siteContent.save<T[]>(key, change(rows))
      return rows
    })
  return createRemoteCollection<T>({
    list: async () => {
      const data = await siteContent.get<T[]>(key)
      rows = Array.isArray(data) ? data : seed()
      if (opts.normalise) rows = opts.normalise(rows)
      return rows
    },
    create: async raw => {
      const item = opts.prepare ? opts.prepare(raw) : raw
      await save(list => [item, ...list])
      return item
    },
    update: async (id, patch, current) => {
      const saved = await save(list => list.map(r => (r.id === id ? { ...(r ?? current), ...patch } : r)))
      return saved.find(r => r.id === id) ?? { ...current, ...patch }
    },
    remove: async id => {
      await save(list => list.filter(r => r.id !== id))
    },
  })
}
