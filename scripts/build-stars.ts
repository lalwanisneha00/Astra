import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { colorIndexToHex } from './lib/color.ts'

// HYG's canonical home moved to https://codeberg.org/astronexus/hyg; this
// GitHub mirror is now an archive but still serves the same released files,
// including this current release (v41). See ATTRIBUTIONS.md.
const HYG_CSV_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'

const OUTPUT_DIR = path.resolve(import.meta.dirname, '../public/data')
const PARSECS_TO_LIGHT_YEARS = 3.26156

interface MagnitudeTier {
  name: string
  maxMagnitude: number
}

// Ranges are exclusive of the previous tier's cutoff, so a star appears in
// exactly one file and the client just concatenates them as tiers arrive.
const TIERS: MagnitudeTier[] = [
  { name: 'tier0', maxMagnitude: 4 },
  { name: 'tier1', maxMagnitude: 6.5 },
  { name: 'tier2', maxMagnitude: 8 },
]

interface HygRow {
  id: string
  proper: string
  bayer: string
  flam: string
  con: string
  mag: string
  absmag: string
  dist: string
  spect: string
  ci: string
  lum: string
  rarad: string
  decrad: string
}

interface ProcessedStar {
  id: string
  names: string[]
  ra: number
  dec: number
  mag: number
  absMag: number
  distLy: number
  spect: string | null
  ci: number
  colorHex: string
  temperatureK: number
  lum: number | null
  con: string | null
}

interface StarTierFile {
  source: string
  generatedAt: string
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

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

async function fetchCsv(): Promise<string> {
  console.log(`Fetching ${HYG_CSV_URL} ...`)
  const response = await fetch(HYG_CSV_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch HYG catalog: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

/** Parses and cleans one HYG row, or returns null for unusable/non-star rows. */
function processRow(row: HygRow): ProcessedStar | null {
  const dist = Number(row.dist)
  const mag = Number(row.mag)
  const raRad = Number(row.rarad)
  const decRad = Number(row.decrad)

  // dist <= 0 excludes the Sun (HYG id 0, dist 0) — not a background star.
  if (!Number.isFinite(dist) || dist <= 0) return null
  if (!Number.isFinite(mag) || !Number.isFinite(raRad) || !Number.isFinite(decRad)) return null

  const parsedCi = Number(row.ci)
  const ci = row.ci !== '' && Number.isFinite(parsedCi) ? parsedCi : 0.65
  const { hex, temperatureK } = colorIndexToHex(ci)

  const names = [row.proper, row.bayer, row.flam]
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

  const absMag = Number(row.absmag)
  const lum = Number(row.lum)

  return {
    id: row.id,
    names,
    ra: round(radToDeg(raRad), 4),
    dec: round(radToDeg(decRad), 4),
    mag: round(mag, 2),
    absMag: Number.isFinite(absMag) ? round(absMag, 2) : 0,
    distLy: round(dist * PARSECS_TO_LIGHT_YEARS, 1),
    spect: row.spect.trim() || null,
    ci: round(ci, 3),
    colorHex: hex,
    temperatureK,
    lum: Number.isFinite(lum) ? round(lum, 3) : null,
    con: row.con.trim() || null,
  }
}

function toColumnar(stars: ProcessedStar[]): StarTierFile {
  return {
    source: 'HYG Database v41 (CC BY-SA 4.0) — https://codeberg.org/astronexus/hyg',
    generatedAt: new Date().toISOString(),
    count: stars.length,
    id: stars.map((s) => s.id),
    names: stars.map((s) => s.names),
    ra: stars.map((s) => s.ra),
    dec: stars.map((s) => s.dec),
    mag: stars.map((s) => s.mag),
    absMag: stars.map((s) => s.absMag),
    distLy: stars.map((s) => s.distLy),
    spect: stars.map((s) => s.spect),
    ci: stars.map((s) => s.ci),
    colorHex: stars.map((s) => s.colorHex),
    temperatureK: stars.map((s) => s.temperatureK),
    lum: stars.map((s) => s.lum),
    con: stars.map((s) => s.con),
  }
}

async function main() {
  const csvText = await fetchCsv()
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as HygRow[]
  console.log(`Parsed ${rows.length} raw rows`)

  const stars = rows
    .map(processRow)
    .filter((s): s is ProcessedStar => s !== null)
    .sort((a, b) => a.mag - b.mag)

  console.log(`${stars.length} usable stars after filtering`)

  await mkdir(OUTPUT_DIR, { recursive: true })

  let previousCutoff = -Infinity
  for (const tier of TIERS) {
    const tierStars = stars.filter((s) => s.mag > previousCutoff && s.mag <= tier.maxMagnitude)
    const outPath = path.join(OUTPUT_DIR, `stars-${tier.name}.json`)
    await writeFile(outPath, JSON.stringify(toColumnar(tierStars)))
    console.log(
      `${tier.name} (mag <= ${tier.maxMagnitude}): ${tierStars.length} stars -> ${outPath}`,
    )
    previousCutoff = tier.maxMagnitude
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
