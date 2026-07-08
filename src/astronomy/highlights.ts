import * as Astronomy from 'astronomy-engine'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import type { PlanetId } from '@/astronomy/planets'
import { computeMoonPosition, computeSunPosition } from '@/astronomy/sunMoon'
import { CONSTELLATION_CONTENT } from '@/content/constellations'
import { DSO_CONTENT } from '@/content/dso'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import { METEOR_SHOWERS } from '@/content/meteorShowers'
import { PLANET_CONTENT } from '@/content/planets'
import type { Constellation } from '@/types/constellation'
import type { EquatorialCoord, ObserverLocation } from '@/types/coordinates'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import type { Highlight, HighlightDifficulty } from '@/types/highlight'
import type { Planet } from '@/types/planet'
import type { MoonPosition } from '@/types/sunMoon'

const MS_PER_DAY = 86_400_000
const MAX_HIGHLIGHTS = 10
const MAX_DSO_HIGHLIGHTS = 4
const MAX_CONSTELLATION_HIGHLIGHTS = 2
const CONJUNCTION_THRESHOLD_DEG = 5
const ECLIPSE_LOOKAHEAD_DAYS = 7

export interface HighlightContext {
  date: Date
  observer: ObserverLocation
  planets: Planet[]
  moon: MoonPosition
  dsos: DeepSkyObject[]
  constellations: Constellation[]
}

function toAstronomyObserver(location: ObserverLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, 0)
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function azimuthToCompassDirection(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return COMPASS_DIRECTIONS[index] ?? 'N'
}

/** All highlight times are shown in UTC, matching this app's
 * established UTC-first convention (TimeSlider, UtcClock) — there's no
 * IANA timezone database wired up to convert lat/lon into a local
 * civil time. */
function formatTimeUtc(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, '0')
  const m = String(date.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m} UTC`
}

function angularSeparationDeg(a: EquatorialCoord, b: EquatorialCoord): number {
  const raA = (a.ra * Math.PI) / 180
  const decA = (a.dec * Math.PI) / 180
  const raB = (b.ra * Math.PI) / 180
  const decB = (b.dec * Math.PI) / 180
  const cosSeparation =
    Math.sin(decA) * Math.sin(decB) + Math.cos(decA) * Math.cos(decB) * Math.cos(raA - raB)
  return (Math.acos(Math.min(Math.max(cosSeparation, -1), 1)) * 180) / Math.PI
}

function magnitudeToDifficulty(magnitude: number): HighlightDifficulty {
  if (magnitude <= 6) return 'Naked eye'
  if (magnitude <= 10) return 'Binoculars'
  return 'Telescope'
}

interface BodyVisibility {
  isVisibleTonight: boolean
  direction: string | null
  timeDescription: string
  visibilityWindow: string
}

/**
 * Real rise/set/culmination for a moving body (planet or Moon) via
 * astronomy-engine's search functions — noticeably more expensive than
 * a plain `Horizon()` call, so this is deliberately only used for the
 * handful of bodies that move (7 planets + Moon), not for DSOs/
 * constellations/meteor showers below, which use a simpler qualitative
 * description instead to keep this feature's total cost bounded.
 */
function computeBodyVisibility(
  body: Astronomy.Body,
  observer: Astronomy.Observer,
  date: Date,
): BodyVisibility {
  const equatorial = Astronomy.Equator(body, date, observer, true, true)
  const horizontal = Astronomy.Horizon(date, observer, equatorial.ra, equatorial.dec)
  const currentlyUp = horizontal.altitude > 0

  let riseTime: Date | null = null
  let setTime: Date | null = null
  try {
    riseTime = Astronomy.SearchRiseSet(body, observer, 1, date, 1)?.date ?? null
  } catch {
    // No rise found in the search window — riseTime stays null.
  }
  try {
    setTime = Astronomy.SearchRiseSet(body, observer, -1, date, 1)?.date ?? null
  } catch {
    // No set found in the search window — setTime stays null.
  }

  const risesWithinHalfDay =
    riseTime !== null && riseTime.getTime() - date.getTime() < 12 * 3600 * 1000

  if (!currentlyUp && !risesWithinHalfDay) {
    return { isVisibleTonight: false, direction: null, timeDescription: '', visibilityWindow: '' }
  }

  let culmination: Date | null = null
  try {
    culmination = Astronomy.SearchHourAngle(body, observer, 0, date).time.date
  } catch {
    // No culmination found in the search window — culmination stays null.
  }

  const direction = azimuthToCompassDirection(horizontal.azimuth)
  const timeDescription = culmination
    ? `Highest in the sky around ${formatTimeUtc(culmination)}`
    : currentlyUp
      ? 'Visible now'
      : riseTime
        ? `Rises around ${formatTimeUtc(riseTime)}`
        : 'Visible tonight'
  const visibilityWindow =
    riseTime && setTime
      ? `Rises ${formatTimeUtc(riseTime)}, sets ${formatTimeUtc(setTime)}`
      : currentlyUp
        ? 'Above the horizon now'
        : 'Check local rise time'

  return { isVisibleTonight: true, direction, timeDescription, visibilityWindow }
}

const PLANET_ICONS: Record<string, string> = {
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
}

function detectBrightPlanets(context: HighlightContext): Highlight[] {
  const observer = toAstronomyObserver(context.observer)
  const highlights: Highlight[] = []

  for (const planet of context.planets) {
    const body = Astronomy.Body[planet.id as PlanetId]
    const visibility = computeBodyVisibility(body, observer, context.date)
    if (!visibility.isVisibleTonight) continue

    const content = PLANET_CONTENT[planet.id]
    const magnitude = Astronomy.Illumination(body, context.date).mag

    highlights.push({
      id: `planet-${planet.id}`,
      category: 'planet',
      icon: PLANET_ICONS[planet.id] ?? '🪐',
      title: planet.name,
      summary: content?.description ?? `${planet.name} is visible in tonight's sky.`,
      whySpecial:
        content?.funFacts[0] ?? `Currently ${planet.distanceAu.toFixed(2)} AU from Earth.`,
      direction: visibility.direction,
      timeDescription: visibility.timeDescription,
      visibilityWindow: visibility.visibilityWindow,
      difficulty: magnitudeToDifficulty(magnitude),
      priority: 3,
      equatorial: planet.equatorial,
      selection: { type: 'planet', id: planet.id },
    })
  }

  return highlights
}

function detectMoon(context: HighlightContext): Highlight[] {
  const observer = toAstronomyObserver(context.observer)
  const visibility = computeBodyVisibility(Astronomy.Body.Moon, observer, context.date)
  if (!visibility.isVisibleTonight) return []

  const phasePercent = Math.round(context.moon.illumination * 100)

  return [
    {
      id: 'moon',
      category: 'moon',
      icon: '🌙',
      title: 'The Moon',
      summary: `${phasePercent}% illuminated tonight.`,
      whySpecial:
        "Earth's only natural satellite, close enough to see real surface detail with just binoculars.",
      direction: visibility.direction,
      timeDescription: visibility.timeDescription,
      visibilityWindow: visibility.visibilityWindow,
      difficulty: 'Naked eye',
      priority: 4,
      equatorial: context.moon.equatorial,
      selection: { type: 'moon', id: 'moon' },
    },
  ]
}

function daysToNearestAnniversary(date: Date, month: number, day: number): number {
  const year = date.getUTCFullYear()
  const candidates = [year - 1, year, year + 1].map((y) => Date.UTC(y, month - 1, day))
  const diffs = candidates.map((c) => Math.abs(date.getTime() - c) / MS_PER_DAY)
  return Math.min(...diffs)
}

function detectMeteorShowers(context: HighlightContext): Highlight[] {
  const highlights: Highlight[] = []

  for (const shower of METEOR_SHOWERS) {
    const daysFromPeak = daysToNearestAnniversary(context.date, shower.peakMonth, shower.peakDay)
    if (daysFromPeak > shower.activeWindowDays) continue

    const horizontal = equatorialToHorizontal(shower.radiant, context.observer, context.date)
    const isPeakNight = daysFromPeak < 0.5

    highlights.push({
      id: `meteor-${shower.id}`,
      category: 'meteorShower',
      icon: '☄️',
      title: shower.name,
      summary: shower.description,
      whySpecial: `Up to ${shower.zhr} meteors/hour at peak, radiating from ${shower.radiantConstellation}.`,
      direction: horizontal.altitude > 0 ? azimuthToCompassDirection(horizontal.azimuth) : null,
      timeDescription: isPeakNight
        ? 'Tonight is the peak night — best after midnight'
        : 'Best viewed after midnight, when the radiant climbs higher',
      visibilityWindow: 'Active all night, improving after midnight',
      difficulty: 'Naked eye',
      priority: isPeakNight ? 1 : 5,
      equatorial: shower.radiant,
    })
  }

  return highlights
}

function detectConjunctions(context: HighlightContext): Highlight[] {
  const bodies = [
    ...context.planets.map((p) => ({ id: p.id, name: p.name, equatorial: p.equatorial })),
    { id: 'moon', name: 'Moon', equatorial: context.moon.equatorial },
  ]

  const highlights: Highlight[] = []

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]!
      const b = bodies[j]!
      const separation = angularSeparationDeg(a.equatorial, b.equatorial)
      if (separation > CONJUNCTION_THRESHOLD_DEG) continue

      const midpoint: EquatorialCoord = {
        ra: (a.equatorial.ra + b.equatorial.ra) / 2,
        dec: (a.equatorial.dec + b.equatorial.dec) / 2,
      }
      const horizontal = equatorialToHorizontal(midpoint, context.observer, context.date)
      const involvesMoon = a.id === 'moon' || b.id === 'moon'

      highlights.push({
        id: `conjunction-${a.id}-${b.id}`,
        category: 'conjunction',
        icon: '✨',
        title: `${a.name} & ${b.name} conjunction`,
        summary: `${a.name} and ${b.name} appear just ${separation.toFixed(1)}° apart tonight.`,
        whySpecial: involvesMoon
          ? 'A close pairing with the Moon is one of the easiest ways to spot a planet — just look nearby.'
          : 'Planetary conjunctions like this are relatively rare and make for a striking naked-eye sight.',
        direction: horizontal.altitude > 0 ? azimuthToCompassDirection(horizontal.azimuth) : null,
        timeDescription: horizontal.altitude > 0 ? 'Visible now' : 'Check after sunset',
        visibilityWindow: 'Visible after sunset while both objects are above the horizon',
        difficulty: 'Naked eye',
        priority: 1,
        equatorial: midpoint,
      })
    }
  }

  return highlights
}

function eclipseKindLabel(kind: Astronomy.EclipseKind): string {
  switch (kind) {
    case Astronomy.EclipseKind.Total:
      return 'Total'
    case Astronomy.EclipseKind.Annular:
      return 'Annular'
    case Astronomy.EclipseKind.Partial:
      return 'Partial'
    case Astronomy.EclipseKind.Penumbral:
      return 'Penumbral'
    default:
      return ''
  }
}

function detectEclipses(context: HighlightContext): Highlight[] {
  const observer = toAstronomyObserver(context.observer)
  const highlights: Highlight[] = []

  try {
    const lunar = Astronomy.SearchLunarEclipse(context.date)
    const daysAway = (lunar.peak.date.getTime() - context.date.getTime()) / MS_PER_DAY
    if (daysAway >= 0 && daysAway <= ECLIPSE_LOOKAHEAD_DAYS) {
      const moonAtPeak = computeMoonPosition(lunar.peak.date, context.observer)
      const horizontal = equatorialToHorizontal(
        moonAtPeak.equatorial,
        context.observer,
        lunar.peak.date,
      )
      // A little slack below the horizon: partial phases can still be
      // caught during dusk/dawn twilight even if the exact peak isn't.
      if (horizontal.altitude > -6) {
        highlights.push({
          id: 'eclipse-lunar',
          category: 'eclipse',
          icon: '🌘',
          title: `${eclipseKindLabel(lunar.kind)} Lunar Eclipse`,
          summary: `A ${lunar.kind} lunar eclipse peaks in ${Math.max(0, Math.round(daysAway))} day(s).`,
          whySpecial:
            'Lunar eclipses are visible from the entire night side of Earth — no special equipment needed.',
          direction: horizontal.altitude > 0 ? azimuthToCompassDirection(horizontal.azimuth) : null,
          timeDescription: `Peak around ${formatTimeUtc(lunar.peak.date)}`,
          visibilityWindow: 'Visible wherever the Moon is above the horizon at peak',
          difficulty: 'Naked eye',
          priority: 0,
          equatorial: moonAtPeak.equatorial,
          selection: { type: 'moon', id: 'moon' },
        })
      }
    }
  } catch {
    // No lunar eclipse found in a reasonable search window — expected
    // most weeks; lunar eclipses are genuinely rare.
  }

  try {
    const solar = Astronomy.SearchLocalSolarEclipse(context.date, observer)
    const daysAway = (solar.peak.time.date.getTime() - context.date.getTime()) / MS_PER_DAY
    if (daysAway >= 0 && daysAway <= ECLIPSE_LOOKAHEAD_DAYS && solar.peak.altitude > 0) {
      const sunAtPeak = computeSunPosition(solar.peak.time.date)
      const sunHorizontal = equatorialToHorizontal(
        sunAtPeak.equatorial,
        context.observer,
        solar.peak.time.date,
      )
      highlights.push({
        id: 'eclipse-solar',
        category: 'eclipse',
        icon: '🌒',
        title: `${eclipseKindLabel(solar.kind)} Solar Eclipse`,
        summary: `A ${solar.kind} solar eclipse is visible from your location in ${Math.max(0, Math.round(daysAway))} day(s).`,
        whySpecial:
          'Solar eclipses are only visible from a narrow path on Earth — this one passes near your location. Always use proper eye protection (eclipse glasses or a solar filter); never look directly at the Sun.',
        direction: azimuthToCompassDirection(sunHorizontal.azimuth),
        timeDescription: `Peak around ${formatTimeUtc(solar.peak.time.date)}`,
        visibilityWindow: `Partial phases from ${formatTimeUtc(solar.partial_begin.time.date)} to ${formatTimeUtc(solar.partial_end.time.date)}`,
        difficulty: 'Naked eye',
        priority: 0,
        equatorial: sunAtPeak.equatorial,
        selection: { type: 'sun', id: 'sun' },
      })
    }
  } catch {
    // No solar eclipse visible from this location in the search window.
  }

  return highlights
}

const DSO_ICONS: Record<string, string> = {
  galaxy: '🌌',
  openCluster: '✨',
  globularCluster: '🔮',
  nebula: '☁️',
  planetaryNebula: '💫',
}

function detectNotableDsos(context: HighlightContext): Highlight[] {
  const visible = context.dsos
    .filter((dso) => dso.id in DSO_CONTENT)
    .map((dso) => ({
      dso,
      horizontal: equatorialToHorizontal(dso.equatorial, context.observer, context.date),
    }))
    .filter(({ horizontal }) => horizontal.altitude > 0)
    .sort((a, b) => (a.dso.magnitude ?? 99) - (b.dso.magnitude ?? 99))
    .slice(0, MAX_DSO_HIGHLIGHTS)

  return visible.map(({ dso, horizontal }): Highlight => {
    const content = DSO_CONTENT[dso.id]
    const meta = DSO_TYPE_META[dso.type]
    const label = dso.messier ?? dso.commonNames[0] ?? dso.id
    const magnitude = dso.magnitude ?? 10

    return {
      id: `dso-${dso.id}`,
      category: 'dso',
      icon: DSO_ICONS[meta.icon] ?? '🌌',
      title: label,
      summary: content?.description ?? `A ${meta.label.toLowerCase()} visible tonight.`,
      whySpecial:
        content?.funFacts[0] ?? `One of the brighter ${meta.label.toLowerCase()}s in the sky.`,
      direction: azimuthToCompassDirection(horizontal.azimuth),
      timeDescription: 'Visible now',
      visibilityWindow: 'Best viewed once fully dark, away from bright lights',
      difficulty: magnitudeToDifficulty(magnitude),
      priority: 6,
      equatorial: dso.equatorial,
      selection: { type: 'dso', id: dso.id },
    }
  })
}

function detectSeasonalConstellations(context: HighlightContext): Highlight[] {
  const candidates = context.constellations
    .filter((constellation) => CONSTELLATION_CONTENT[constellation.id] !== undefined)
    .map((constellation) => ({
      constellation,
      horizontal: equatorialToHorizontal(
        constellation.labelPosition,
        context.observer,
        context.date,
      ),
    }))
    // High in the sky, not just above the horizon — a genuinely
    // prominent placement right now, not a technicality.
    .filter(({ horizontal }) => horizontal.altitude > 20)
    .sort((a, b) => b.horizontal.altitude - a.horizontal.altitude)
    .slice(0, MAX_CONSTELLATION_HIGHLIGHTS)

  return candidates.map(({ constellation, horizontal }): Highlight => {
    const content = CONSTELLATION_CONTENT[constellation.id]
    return {
      id: `constellation-${constellation.id}`,
      category: 'constellation',
      icon: '⭐',
      title: constellation.name,
      summary: content?.mythology ?? `${constellation.name} is well placed in tonight's sky.`,
      whySpecial:
        content?.funFacts[0] ?? 'A prominent constellation well-placed for viewing tonight.',
      direction: azimuthToCompassDirection(horizontal.azimuth),
      timeDescription: 'High in the sky this evening',
      visibilityWindow: constellation.bestViewingMonths,
      difficulty: 'Naked eye',
      priority: 7,
      equatorial: constellation.labelPosition,
      selection: { type: 'constellation', id: constellation.id },
    }
  })
}

/**
 * Runs every detector and returns the most significant results, most
 * important first. Each detector is an independent, self-contained
 * function of the same shape — adding a future event type (e.g. comets,
 * if an orbital-element data source is ever integrated; none exists
 * today, in this project or in astronomy-engine) means adding one more
 * detector to this list, not touching the others.
 */
export function getTonightsHighlights(
  context: HighlightContext,
  limit = MAX_HIGHLIGHTS,
): Highlight[] {
  const detectors: Array<(context: HighlightContext) => Highlight[]> = [
    detectEclipses,
    detectConjunctions,
    detectMeteorShowers,
    detectBrightPlanets,
    detectMoon,
    detectNotableDsos,
    detectSeasonalConstellations,
  ]

  const all = detectors.flatMap((detector) => detector(context))
  return all.sort((a, b) => a.priority - b.priority).slice(0, limit)
}
