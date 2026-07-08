import type { EquatorialCoord } from '@/types/coordinates'

/**
 * Converts an equatorial J2000 coordinate to a unit vector on the
 * celestial sphere, with the north celestial pole at +Y (matching
 * Three.js's Y-up world) and RA=0 pointing along +X.
 *
 * Orientation/handedness validated end-to-end since Phase 6/7: observer
 * mode's horizon/cardinal directions and the default south-facing camera
 * view have matched real sky orientation in practice ever since, so this
 * is no longer an open question — east/west are not swapped.
 */
export function equatorialToCartesian({ ra, dec }: EquatorialCoord): [number, number, number] {
  const raRad = (ra * Math.PI) / 180
  const decRad = (dec * Math.PI) / 180
  const cosDec = Math.cos(decRad)

  return [cosDec * Math.cos(raRad), Math.sin(decRad), -cosDec * Math.sin(raRad)]
}
