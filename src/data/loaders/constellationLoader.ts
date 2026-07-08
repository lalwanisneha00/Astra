export interface ConstellationRecord {
  id: string
  name: string
  genitive: string
  labelRa: number
  labelDec: number
  lines: number[]
}

interface ConstellationFile {
  count: number
  constellations: ConstellationRecord[]
}

/** Fetches the constellation catalog. Unlike the star catalog, this is a
 * single ~30KB file (88 constellations), small enough that an IndexedDB
 * caching layer would add complexity without a meaningful benefit. */
export async function loadConstellations(): Promise<ConstellationRecord[]> {
  const response = await fetch('/data/constellations.json')
  if (!response.ok) {
    throw new Error(`Failed to load constellation catalog: ${response.status}`)
  }
  const data = (await response.json()) as ConstellationFile
  return data.constellations
}
