import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import AdmZip from 'adm-zip'

// GeoNames (CC BY 4.0) — see ATTRIBUTIONS.md. cities15000 = every city
// with population > 15,000, or a national capital regardless of size.
const CITIES_ZIP_URL = 'https://download.geonames.org/export/dump/cities15000.zip'
const CITIES_ENTRY_NAME = 'cities15000.txt'
const COUNTRY_INFO_URL = 'https://download.geonames.org/export/dump/countryInfo.txt'

const OUTPUT_PATH = path.resolve(import.meta.dirname, '../public/data/cities.json')

interface CityRecord {
  name: string
  country: string
  latitude: number
  longitude: number
  population: number
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** GeoNames' countryInfo.txt: tab-delimited, ISO code in column 0, full
 * English name in column 4. Comment lines start with '#'. */
async function fetchCountryNames(): Promise<Map<string, string>> {
  const response = await fetch(COUNTRY_INFO_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch country info: ${response.status}`)
  }
  const text = await response.text()
  const map = new Map<string, string>()

  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.trim().length === 0) continue
    const columns = line.split('\t')
    const iso = columns[0]
    const name = columns[4]
    if (iso && name) map.set(iso, name)
  }

  return map
}

/** GeoNames ships this as a zip; extract the one .txt entry in memory. */
async function fetchCitiesText(): Promise<string> {
  const response = await fetch(CITIES_ZIP_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch cities archive: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const zip = new AdmZip(buffer)
  const entry = zip.getEntry(CITIES_ENTRY_NAME)
  if (!entry) {
    throw new Error(`${CITIES_ENTRY_NAME} not found in downloaded archive`)
  }
  return entry.getData().toString('utf-8')
}

/** GeoNames "geoname" table columns (tab-delimited, no header row):
 * 0 id, 1 name, 2 asciiname, 3 alternatenames, 4 lat, 5 lon,
 * 6 feature class, 7 feature code, 8 country code, 9 cc2, 10-13 admin
 * codes, 14 population, 15 elevation, 16 dem, 17 timezone, 18 modified. */
function parseCityLine(line: string, countryNames: Map<string, string>): CityRecord | null {
  const columns = line.split('\t')
  const asciiname = columns[2]
  const latitude = Number(columns[4])
  const longitude = Number(columns[5])
  const countryCode = columns[8]
  const population = Number(columns[14])

  if (!asciiname || !countryCode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    name: asciiname,
    country: countryNames.get(countryCode) ?? countryCode,
    latitude: round(latitude, 4),
    longitude: round(longitude, 4),
    population: Number.isFinite(population) ? population : 0,
  }
}

async function main() {
  const [citiesText, countryNames] = await Promise.all([fetchCitiesText(), fetchCountryNames()])

  const cities = citiesText
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCityLine(line, countryNames))
    .filter((city): city is CityRecord => city !== null)
    .sort((a, b) => b.population - a.population)

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({
      source: 'GeoNames cities15000 (CC BY 4.0) — https://www.geonames.org',
      generatedAt: new Date().toISOString(),
      count: cities.length,
      cities,
    }),
  )

  console.log(`${cities.length} cities -> ${OUTPUT_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
