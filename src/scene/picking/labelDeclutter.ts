import { degToRad, radToDeg } from '@/lib/math'

export interface DeclutterCandidate {
  id: string
  /** Lower = more prominent, shown first when two candidates collide. */
  priority: number
  ra: number
  dec: number
}

function angularSeparationDeg(
  a: { ra: number; dec: number },
  b: { ra: number; dec: number },
): number {
  const raA = degToRad(a.ra)
  const decA = degToRad(a.dec)
  const raB = degToRad(b.ra)
  const decB = degToRad(b.dec)
  const cosSeparation =
    Math.sin(decA) * Math.sin(decB) + Math.cos(decA) * Math.cos(decB) * Math.cos(raA - raB)
  return radToDeg(Math.acos(Math.min(Math.max(cosSeparation, -1), 1)))
}

/**
 * Greedily picks which labels to show, most-prominent first, skipping
 * any candidate within `minSeparationDeg` of an already-accepted
 * (necessarily higher- or equal-priority) candidate — so two labels
 * that would visually overlap never both show, and the more prominent
 * one always wins. Angular separation on the celestial sphere is used
 * as a cheap proxy for on-screen distance rather than true per-frame
 * 2D projection (see `fovScaledLabelSeparation`, which scales the
 * threshold by current FOV so the same on-screen gap is respected at
 * any zoom level — the same reasoning `fovScaledPointThreshold`
 * already uses for click targets).
 *
 * O(n·k) where k is the accepted count so far (typically small, since
 * most candidates in a crowded region get rejected before comparing
 * against every other candidate) — not O(n²), which would be too
 * expensive for thousands of star labels.
 */
export function selectDeclutteredLabels<T extends DeclutterCandidate>(
  candidates: T[],
  minSeparationDeg: number,
): T[] {
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority)
  const accepted: T[] = []

  for (const candidate of sorted) {
    const collides = accepted.some(
      (other) => angularSeparationDeg(candidate, other) < minSeparationDeg,
    )
    if (!collides) accepted.push(candidate)
  }

  return accepted
}

const BASE_LABEL_SEPARATION_DEG = 3
const BASE_FOV = 75

/** Minimum angular separation (degrees) two labels need to both show,
 * scaled by current FOV so the same *on-screen* gap is respected at any
 * zoom level: zoomed in (smaller FOV), the same screen gap corresponds
 * to a smaller angular separation, and vice versa. */
export function fovScaledLabelSeparation(fov: number): number {
  return BASE_LABEL_SEPARATION_DEG * (fov / BASE_FOV)
}
