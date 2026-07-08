import { openDB, type IDBPDatabase } from 'idb'
import type { City } from '@/types/city'

interface CityFile {
  count: number
  cities: City[]
}

// A separate database from starLoader's "astra-data-cache" — sharing one
// database name across independent loader modules would mean they'd
// need to coordinate a single DB_VERSION and upgrade callback (an
// IndexedDB upgrade only fires when opening at a *higher* version than
// what's already stored), which is more coupling than this needs.
const DB_NAME = 'astra-city-cache'
const DB_VERSION = 1
const STORE_NAME = 'cities'
const CACHE_KEY = 'v1'

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

async function readCache(): Promise<City[] | undefined> {
  try {
    const db = await getDb()
    return await db.get(STORE_NAME, CACHE_KEY)
  } catch {
    return undefined
  }
}

async function writeCache(cities: City[]): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE_NAME, cities, CACHE_KEY)
  } catch {
    // Caching is a pure optimization — never required for the app to work.
  }
}

/**
 * Fetches the world cities list (~34,000 entries, ~3MB — GeoNames
 * cities15000, see ATTRIBUTIONS.md), serving from an IndexedDB cache
 * when available. Deliberately *not* loaded at app start: this is only
 * needed if geolocation fails, so LocationPicker loads it lazily on its
 * own mount rather than costing every visitor the fetch.
 */
export async function loadCities(): Promise<City[]> {
  const cached = await readCache()
  if (cached) return cached

  const response = await fetch('/data/cities.json')
  if (!response.ok) {
    throw new Error(`Failed to load city list: ${response.status}`)
  }
  const data = (await response.json()) as CityFile

  void writeCache(data.cities)
  return data.cities
}
