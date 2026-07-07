import { openDB, type IDBPDatabase } from 'idb'

export type StarTierName = 'tier0' | 'tier1' | 'tier2'

/** Columnar shape written by scripts/build-stars.ts — one array per field,
 * all the same length, rather than an array of objects (much smaller and
 * faster to parse for a dataset this size). */
export interface StarTierData {
  count: number
  id: string[]
  names: string[][]
  ra: number[]
  dec: number[]
  mag: number[]
  absMag: number[]
  distLy: number[]
  spect: (string | null)[]
  ci: number[]
  colorHex: string[]
  temperatureK: number[]
  lum: (number | null)[]
  con: (string | null)[]
}

const DB_NAME = 'astra-data-cache'
const DB_VERSION = 1
const STORE_NAME = 'star-tiers'
// Bump when the shipped schema/processing changes meaningfully, to
// naturally invalidate stale caches (old keys are simply never read again).
const CACHE_VERSION = 'v1'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
  return dbPromise
}

async function readCache(key: string): Promise<StarTierData | undefined> {
  try {
    const db = await getDb()
    return await db.get(STORE_NAME, key)
  } catch {
    // IndexedDB can be unavailable (private browsing, disabled, quota) —
    // caching is a pure optimization, never required for the app to work.
    return undefined
  }
}

async function writeCache(key: string, data: StarTierData): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE_NAME, data, key)
  } catch {
    // Same as above: failing to cache is never fatal.
  }
}

/** Fetches one magnitude tier of the star catalog, serving from an
 * IndexedDB cache when available. */
export async function loadStarTier(tier: StarTierName): Promise<StarTierData> {
  const cacheKey = `${CACHE_VERSION}:${tier}`
  const cached = await readCache(cacheKey)
  if (cached) return cached

  const response = await fetch(`/data/stars-${tier}.json`)
  if (!response.ok) {
    throw new Error(`Failed to load star catalog tier "${tier}": ${response.status}`)
  }
  const data = (await response.json()) as StarTierData

  void writeCache(cacheKey, data)
  return data
}
