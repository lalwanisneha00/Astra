import type { Hemisphere } from '@/types/constellation'

/** The 12 constellations of the zodiac (the ecliptic's path), by IAU abbreviation. */
export const ZODIAC_IDS = new Set([
  'Ari',
  'Tau',
  'Gem',
  'Cnc',
  'Leo',
  'Vir',
  'Lib',
  'Sco',
  'Sgr',
  'Cap',
  'Aqr',
  'Psc',
])

export function isZodiacConstellation(id: string): boolean {
  return ZODIAC_IDS.has(id)
}

/** Classifies a constellation by its label declination — a simple,
 * approximate split, not an assertion about every star within it. */
export function hemisphereFromDeclination(decDegrees: number): Hemisphere {
  if (decDegrees > 10) return 'northern'
  if (decDegrees < -10) return 'southern'
  return 'equatorial'
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Rough estimate of the 3-month window when a constellation is best
 * placed for evening viewing (roughly opposite the Sun, high in the sky
 * around local evening). This is a well-known amateur-astronomy rule of
 * thumb — local sidereal time at ~9pm reaches 0h around early March and
 * advances about 2 hours of RA per month — not a precise ephemeris
 * calculation (that's what Phase 6+'s astronomy-engine integration is
 * for). Good enough to point someone at "roughly when," not exact dates.
 */
export function estimateBestViewingMonths(raDegrees: number): string {
  const raHours = raDegrees / 15
  const centerIndex = Math.round(raHours / 2) % 12
  const prevIndex = (centerIndex + 11) % 12
  const nextIndex = (centerIndex + 1) % 12

  return `${MONTHS[prevIndex]}–${MONTHS[nextIndex]}`
}
