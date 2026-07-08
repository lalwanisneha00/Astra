import type { DeepSkyObject } from '@/types/deepSkyObject'

interface DsoFile {
  count: number
  objects: DeepSkyObject[]
}

/** Fetches the deep-sky object catalog. Like constellations (and unlike
 * the star catalog), this is a single small file (~500 curated objects),
 * far too small to need IndexedDB caching or tiered loading. */
export async function loadDeepSkyObjects(): Promise<DeepSkyObject[]> {
  const response = await fetch('/data/dso.json')
  if (!response.ok) {
    throw new Error(`Failed to load deep-sky object catalog: ${response.status}`)
  }
  const data = (await response.json()) as DsoFile
  return data.objects
}
