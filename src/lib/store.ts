import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/**
 * In-memory collection that stands in for a REST resource until the backend is wired.
 * Every method is async so call sites already look like real API calls; swap the
 * implementation for fetch()/axios later without touching the pages.
 */
export interface Collection<T extends { id: string }> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  create(item: T): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
  /** Synchronous snapshot + subscription, used by useCollection. */
  snapshot(): T[]
  subscribe(listener: () => void): () => void
  /** Remote collections only: re-fetch from the API (bypasses the freshness window). */
  refresh?(): Promise<T[]>
  /** Remote collections only: the last load error, if the latest fetch failed. */
  error?(): unknown
  /** Remote collections only: fetch one record (richer detail) and merge it into the snapshot. */
  load?(id: string): Promise<T | undefined>
}

const LATENCY = 150

const wait = () => new Promise(r => setTimeout(r, LATENCY))

export function createCollection<T extends { id: string }>(seed: T[]): Collection<T> {
  let items = [...seed]
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(l => l())

  return {
    async list() {
      await wait()
      return items
    },
    async get(id) {
      await wait()
      return items.find(i => i.id === id)
    },
    async create(item) {
      await wait()
      items = [item, ...items]
      emit()
      return item
    },
    async update(id, patch) {
      await wait()
      let updated: T | undefined
      items = items.map(i => (i.id === id ? (updated = { ...i, ...patch }) : i))
      if (!updated) throw new Error(`Record ${id} not found`)
      emit()
      return updated
    },
    async remove(id) {
      await wait()
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

// ---------------------------------------------------------------------------
// Remote (API-backed) collections
// ---------------------------------------------------------------------------

export type RemoteSource<T extends { id: string }> = {
  /** Fetch every row (already adapted to the UI type). */
  list: () => Promise<T[]>
  /** Fetch one row with its detail fields. Defaults to a find in the list. */
  get?: (id: string, current: T | undefined) => Promise<T | undefined>
  create?: (item: T) => Promise<T | void>
  /** Map a UI patch onto API calls. Return the fresh row, or nothing to merge the patch locally. */
  update?: (id: string, patch: Partial<T>, current: T | undefined) => Promise<T | void>
  remove?: (id: string) => Promise<void>
  /** How long a fetched list counts as fresh for other mounts (ms). Default 5s. */
  staleMs?: number
}

const remoteRegistry = new Set<{ reset: () => void }>()

/** Drop every cached remote list (used on logout, so the next admin never sees stale rows). */
export function resetRemoteCollections() {
  remoteRegistry.forEach(c => c.reset())
}

/**
 * Same interface as createCollection, but every method talks to the API through
 * `source`. Pages written against useCollection/useRecord keep working unchanged.
 */
export function createRemoteCollection<T extends { id: string }>(source: RemoteSource<T>): Collection<T> {
  let items: T[] = []
  let fetchedAt = 0
  let inflight: Promise<T[]> | null = null
  let lastError: unknown = null
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach(l => l())
  const staleMs = source.staleMs ?? 5000

  const merge = (row: T) => {
    const exists = items.some(i => i.id === row.id)
    items = exists ? items.map(i => (i.id === row.id ? row : i)) : [row, ...items]
    emit()
    return row
  }

  const fetchAll = () => {
    inflight ??= source
      .list()
      .then(rows => {
        items = rows
        fetchedAt = Date.now()
        lastError = null
        emit()
        return items
      })
      .catch(e => {
        lastError = e
        emit()
        throw e
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  const collection: Collection<T> = {
    async list() {
      if (fetchedAt && Date.now() - fetchedAt < staleMs) return items
      return fetchAll()
    },
    refresh: () => fetchAll(),
    error: () => lastError,
    async get(id) {
      const current = items.find(i => i.id === id)
      if (!source.get) return current ?? (await collection.list()).find(i => i.id === id)
      const row = await source.get(id, current)
      if (row) merge(row)
      return row
    },
    async load(id) {
      return collection.get(id)
    },
    async create(item) {
      if (!source.create) throw new Error('Not supported yet')
      const row = (await source.create(item)) || item
      merge(row)
      return row
    },
    async update(id, patch) {
      if (!source.update) throw new Error('Not supported yet')
      const current = items.find(i => i.id === id)
      const result = await source.update(id, patch, current)
      const row = result || ({ ...(current as T), ...patch } as T)
      merge(row)
      return row
    },
    async remove(id) {
      if (!source.remove) throw new Error('Not supported yet')
      await source.remove(id)
      items = items.filter(i => i.id !== id)
      emit()
    },
    snapshot: () => items,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  remoteRegistry.add({
    reset: () => {
      items = []
      fetchedAt = 0
      lastError = null
      emit()
    },
  })
  return collection
}

/** Live view of a collection: re-renders on create/update/remove anywhere in the app. */
export function useCollection<T extends { id: string }>(collection: Collection<T>) {
  const items = useSyncExternalStore(collection.subscribe, collection.snapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let alive = true
    collection
      .list()
      .then(() => alive && setError(null))
      .catch(e => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [collection])

  const update = useCallback((id: string, patch: Partial<T>) => collection.update(id, patch), [collection])
  const create = useCallback((item: T) => collection.create(item), [collection])
  const remove = useCallback((id: string) => collection.remove(id), [collection])
  const refresh = useCallback(() => (collection.refresh ? collection.refresh() : collection.list()), [collection])

  return { items, loading, error, update, create, remove, refresh }
}

/** Single record by id (detail pages). Remote collections also fetch the record's detail. */
export function useRecord<T extends { id: string }>(collection: Collection<T>, id: string | undefined) {
  const { items, loading, error, update, refresh } = useCollection(collection)
  const [detailLoading, setDetailLoading] = useState(!!collection.load && !!id)
  useEffect(() => {
    if (!collection.load || !id) return
    let alive = true
    collection
      .load(id)
      .catch(() => undefined)
      .finally(() => alive && setDetailLoading(false))
    return () => {
      alive = false
    }
  }, [collection, id])
  const record = items.find(i => i.id === id)
  return { record, loading: loading || (detailLoading && !record), error, update, refresh }
}
