import type { DsoTypeCode } from '@/types/deepSkyObject'

/** Raw shape as written by scripts/build-dso.ts — flat `ra`/`dec`, not
 * yet the nested `equatorial: EquatorialCoord` the rest of the app
 * expects. Matches ConstellationRecord's convention (constellationLoader.ts):
 * the loader returns the file's actual shape; the hook (useDeepSkyObjects)
 * assembles the richer domain type from it. */
export interface DsoRecord {
  id: string
  type: DsoTypeCode
  ra: number
  dec: number
  constellation: string | null
  magnitude: number | null
  sizeArcmin: number | null
  messier: string | null
  commonNames: string[]
}

interface DsoFile {
  count: number
  objects: DsoRecord[]
}

/** Fetches the deep-sky object catalog. Like constellations (and unlike
 * the star catalog), this is a single small file (~500 curated objects),
 * far too small to need IndexedDB caching or tiered loading. */
export async function loadDeepSkyObjects(): Promise<DsoRecord[]> {
  const response = await fetch('/data/dso.json')
  if (!response.ok) {
    throw new Error(`Failed to load deep-sky object catalog: ${response.status}`)
  }
  const data = (await response.json()) as DsoFile
  return data.objects
}
