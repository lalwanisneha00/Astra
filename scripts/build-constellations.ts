import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// d3-celestial (BSD-3-Clause, Olaf Frohn) — see ATTRIBUTIONS.md.
const NAMES_URL =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json'
const LINES_URL =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json'

const OUTPUT_PATH = path.resolve(import.meta.dirname, '../public/data/constellations.json')

interface NameFeature {
  id: string
  properties: { name: string; gen: string; en: string; rank: string }
  geometry: { type: 'Point'; coordinates: [number, number] }
}

interface LineFeature {
  id: string
  geometry: { type: 'MultiLineString'; coordinates: number[][][] }
}

interface GeoJsonCollection<F> {
  features: F[]
}

interface ConstellationRecord {
  id: string
  name: string
  genitive: string
  labelRa: number
  labelDec: number
  /** Flat [ra, dec, ra, dec, ...] pairs — every 4 numbers is one line
   * segment (THREE.LineSegments draws consecutive vertex pairs as
   * independent segments, not a connected polyline). */
  lines: number[]
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`Fetching ${url} ...`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

/** d3-celestial expresses RA as longitude in [-180, 180]; this project
 * standardizes on [0, 360) everywhere (see src/types/coordinates.ts). */
function normalizeRa(ra: number): number {
  return ra < 0 ? ra + 360 : ra
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

async function main() {
  const [namesGeo, linesGeo] = await Promise.all([
    fetchJson<GeoJsonCollection<NameFeature>>(NAMES_URL),
    fetchJson<GeoJsonCollection<LineFeature>>(LINES_URL),
  ])

  // Serpens is split across two disconnected regions (Caput/Cauda) but
  // shares one id ("Ser") — merge its line features into a single figure.
  const linesById = new Map<string, number[][][]>()
  for (const feature of linesGeo.features) {
    const existing = linesById.get(feature.id) ?? []
    existing.push(...feature.geometry.coordinates)
    linesById.set(feature.id, existing)
  }

  // Serpens (id "Ser") is the one constellation split by Ophiuchus into two
  // disconnected regions (Caput/Cauda), listed as two separate name/label
  // features sharing the same id — keep only the first as one constellation.
  const seenIds = new Set<string>()

  const constellations: ConstellationRecord[] = namesGeo.features
    .filter((feature) => {
      if (seenIds.has(feature.id)) return false
      seenIds.add(feature.id)
      return true
    })
    .map((feature) => {
      const polylines = linesById.get(feature.id) ?? []
      const lines: number[] = []

      for (const polyline of polylines) {
        for (let i = 0; i < polyline.length - 1; i++) {
          const a = polyline[i]
          const b = polyline[i + 1]
          if (!a || !b) continue
          lines.push(round(normalizeRa(a[0] ?? 0), 4), round(a[1] ?? 0, 4))
          lines.push(round(normalizeRa(b[0] ?? 0), 4), round(b[1] ?? 0, 4))
        }
      }

      const name =
        feature.id === 'Ser' ? 'Serpens' : feature.properties.en || feature.properties.name

      return {
        id: feature.id,
        name,
        genitive: feature.properties.gen,
        labelRa: round(normalizeRa(feature.geometry.coordinates[0]), 4),
        labelDec: round(feature.geometry.coordinates[1], 4),
        lines,
      }
    })

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({
      source: 'd3-celestial (BSD-3-Clause, Olaf Frohn) — https://github.com/ofrohn/d3-celestial',
      generatedAt: new Date().toISOString(),
      count: constellations.length,
      constellations,
    }),
  )

  console.log(`${constellations.length} constellations -> ${OUTPUT_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
