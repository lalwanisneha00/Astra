import { parse } from 'csv-parse/sync'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// OpenNGC (CC-BY-SA-4.0, Mattia Verga & contributors) — see ATTRIBUTIONS.md.
const SOURCE_URL =
  'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv'

const OUTPUT_PATH = path.resolve(import.meta.dirname, '../public/data/dso.json')

// Curated visibility floor: OpenNGC has ~14,000 entries, the overwhelming
// majority barely-resolved catalog galaxies with no popular relevance to
// an educational atlas. Keeping only objects with a Messier number, a
// common name, or a magnitude at least this bright yields ~500 genuinely
// findable, interesting objects — the same "curate for relevance, not
// completeness" call this project already made for star tiers and city
// search coverage.
const MAGNITUDE_CEILING = 9.5

const EXCLUDED_TYPES = new Set([
  'Dup', // duplicate catalog entry for an object listed elsewhere
  'NonEx', // catalog error — object doesn't exist at this position
  '*', // a plain star, not a deep-sky object
  '**', // double star
  '*Ass', // stellar association (a loose Milky Way star field, not a discrete object)
  'GPair', // galaxy pair — rendered as its two members individually elsewhere
  'GTrpl',
  'GGroup',
  'Nova', // a transient event, not a fixed object
  'Other', // catalog placeholder/ambiguous entries
])

const KNOWN_TYPES = new Set(['G', 'OCl', 'GCl', 'Cl+N', 'Neb', 'PN', 'SNR', 'HII', 'RfN'])

interface NgcRow {
  Name: string
  Type: string
  RA: string
  Dec: string
  Const: string
  MajAx: string
  'B-Mag': string
  'V-Mag': string
  M: string
  'Common names': string
}

interface DsoRecord {
  id: string
  type: string
  ra: number
  dec: number
  constellation: string | null
  magnitude: number | null
  sizeArcmin: number | null
  messier: string | null
  commonNames: string[]
}

/** OpenNGC stores RA as "HH:MM:SS.s" and Dec as "+DD:MM:SS.s" — this
 * project standardizes on decimal degrees everywhere (see
 * src/types/coordinates.ts), matching every other data pipeline. */
function parseRaHours(value: string): number {
  const [h, m, s] = value.split(':').map(Number)
  return ((h ?? 0) + (m ?? 0) / 60 + (s ?? 0) / 3600) * 15
}

function parseDecDegrees(value: string): number {
  const sign = value.trim().startsWith('-') ? -1 : 1
  const [d, m, s] = value.replace('+', '').replace('-', '').split(':').map(Number)
  return sign * ((d ?? 0) + (m ?? 0) / 60 + (s ?? 0) / 3600)
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function parseNumber(value: string): number | null {
  return value === '' ? null : Number(value)
}

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`)
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`)
  }
  const csvText = await response.text()
  const rows = parse(csvText, { columns: true, delimiter: ';', skip_empty_lines: true }) as NgcRow[]

  const records: DsoRecord[] = []

  for (const row of rows) {
    const type = row.Type
    if (EXCLUDED_TYPES.has(type) || !KNOWN_TYPES.has(type)) continue
    if (!row.RA || !row.Dec) continue

    const magnitude = parseNumber(row['V-Mag']) ?? parseNumber(row['B-Mag'])
    const messier = row.M ? `M${Number(row.M)}` : null
    const commonNames = row['Common names'] ? row['Common names'].split(',').filter(Boolean) : []

    const isBrightEnough = magnitude !== null && magnitude <= MAGNITUDE_CEILING
    if (!messier && commonNames.length === 0 && !isBrightEnough) continue

    records.push({
      id: row.Name,
      type,
      ra: round(parseRaHours(row.RA), 5),
      dec: round(parseDecDegrees(row.Dec), 5),
      constellation: row.Const || null,
      magnitude: magnitude === null ? null : round(magnitude, 2),
      sizeArcmin: parseNumber(row.MajAx),
      messier,
      commonNames,
    })
  }

  // The Pleiades (M45) is the one famous, unambiguous deep-sky object
  // missing from OpenNGC entirely — it's catalogued under Collinder/
  // Melotte, not NGC/IC, so it never appears in the source file. Adding
  // it by hand (real, verified coordinates/data) rather than silently
  // shipping an atlas missing one of the most recognizable objects in
  // the sky.
  records.push({
    id: 'Mel022',
    type: 'OCl',
    ra: round(parseRaHours('03:47:24'), 5),
    dec: round(parseDecDegrees('+24:07:00'), 5),
    constellation: 'Tau',
    magnitude: 1.6,
    sizeArcmin: 110,
    messier: 'M45',
    commonNames: ['Pleiades', 'Seven Sisters'],
  })

  records.sort((a, b) => a.id.localeCompare(b.id))

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({
      source:
        'OpenNGC (CC-BY-SA-4.0, Mattia Verga & contributors) — https://github.com/mattiaverga/OpenNGC',
      generatedAt: new Date().toISOString(),
      count: records.length,
      objects: records,
    }),
  )

  console.log(`${records.length} deep-sky objects -> ${OUTPUT_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
