import type { Vector3 } from 'three'
import type { SelectableObjectType } from '@/state/useSelectionStore'

export interface PickCandidate {
  type: SelectableObjectType
  id: string
  /** True direction from the camera (the origin) to this candidate. */
  direction: Vector3
  /** Only meaningful for stars. */
  index?: number
}

/**
 * How "specific"/foreground each object type is — used *only* to break
 * a near-tie between two candidates whose true angular distance from
 * the cursor is otherwise indistinguishable. Never overrides a
 * genuinely closer candidate of a "less specific" type: a constellation
 * line precisely under the cursor still wins over a planet ten degrees
 * away.
 */
const SPECIFICITY: Record<SelectableObjectType, number> = {
  dso: 3,
  planet: 3,
  sun: 3,
  moon: 3,
  star: 2,
  constellation: 1,
}

/** Ties within this many radians (a small fraction of a degree) are
 * broken by type specificity rather than candidate supply order. */
const TIE_EPSILON_RAD = 1e-4

/**
 * Picks the single best candidate for a raycast: whichever has the
 * smallest true angular separation from the ray direction — i.e.
 * whichever the cursor is most precisely pointing at — rather than
 * whichever object's own raycasting technique happened to report the
 * smallest (possibly approximate) hit distance.
 *
 * This is the fix for the recurring "a star/constellation line steals a
 * click meant for something else" class of bug: Three.js's `Points`/
 * `Line` raycasting reports a hit's `distance` as the distance to the
 * closest point *on the ray itself*, not the star/segment's true
 * position — systematically different from a mesh's exact ray-surface
 * intersection distance at the same radius, and not comparable at face
 * value. Comparing *true angular separation from the ray* instead, for
 * every candidate uniformly, sidesteps that bias entirely: whichever
 * object really is closest to where the user is pointing simply wins,
 * with no per-type priority rules or defer logic needed at all.
 */
export function pickNearest(
  rayDirection: Vector3,
  candidates: PickCandidate[],
): PickCandidate | null {
  let best: PickCandidate | null = null
  let bestAngle = Infinity

  for (const candidate of candidates) {
    const angle = rayDirection.angleTo(candidate.direction)

    if (best === null || angle < bestAngle - TIE_EPSILON_RAD) {
      best = candidate
      bestAngle = angle
    } else if (
      Math.abs(angle - bestAngle) <= TIE_EPSILON_RAD &&
      SPECIFICITY[candidate.type] > SPECIFICITY[best.type]
    ) {
      best = candidate
      bestAngle = angle
    }
  }

  return best
}
