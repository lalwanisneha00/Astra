import type { EquatorialCoord } from '@/types/coordinates'

/**
 * Converts an equatorial J2000 coordinate to a unit vector on the
 * celestial sphere, with the north celestial pole at +Y (matching
 * Three.js's Y-up world) and RA=0 pointing along +X.
 *
 * Orientation/handedness here is a deliberate but not yet externally
 * validated choice — Phase 6/7 (observer mode + real horizon/cardinal
 * directions) is what actually proves whether this matches reality. If
 * east/west ever turn out swapped once there's a horizon to check
 * against, this is the one function to flip.
 */
export function equatorialToCartesian({ ra, dec }: EquatorialCoord): [number, number, number] {
  const raRad = (ra * Math.PI) / 180
  const decRad = (dec * Math.PI) / 180
  const cosDec = Math.cos(decRad)

  return [cosDec * Math.cos(raRad), Math.sin(decRad), -cosDec * Math.sin(raRad)]
}
