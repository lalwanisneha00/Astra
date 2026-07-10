/**
 * Pick priority tiers — when the same ray hits more than one object with
 * its own handler, the higher-priority one wins the click/hover, and the
 * lower-priority one(s) defer instead of consuming the event.
 *
 * `line` and `star` both use broad, threshold-based hit-testing
 * (Three.js's `Line.raycast`/`Points.raycast`), which reports a hit's
 * `distance` as the distance to the closest point *on the ray itself* to
 * the segment/star, not its true position — systematically under-
 * reporting distance versus a real mesh-surface intersection at the same
 * radius (a flat billboard tangent to the celestial sphere only equals
 * the sphere's true radius exactly at its own center). That bias means a
 * star or constellation line near the cursor almost always sorts as
 * "nearer" than the precise object the user actually clicked, and —
 * since react-three-fiber dispatches events nearest-first and stops at
 * the first `stopPropagation()` — would silently swallow the event
 * before the real target's own handler ever ran.
 *
 * `star` outranks `line` for the same reason within the broad tier:
 * constellation lines are drawn *between* named stars, so a line
 * segment's raycast threshold very often also covers the exact position
 * of the star it connects to — clicking that star must not lose to the
 * decorative line passing through the same point.
 */
export const PICK_PRIORITY = {
  line: 0,
  star: 1,
  precise: 2,
} as const

interface HasUserData {
  userData?: Record<string, unknown>
}

function pickPriorityOf(object: HasUserData): number {
  const value = object.userData?.pickPriority
  return typeof value === 'number' ? value : 0
}

/**
 * Whether this same raycast also hit an object of *strictly higher*
 * pick priority than `ownPriority` — i.e. whether something more
 * specific than this object was also intersected and should win instead.
 * Unlike a plain "was anything else also hit" check, this correctly
 * resolves ties between two broad-hit-testing layers (star vs.
 * constellation line) instead of both mutually deferring to each other
 * and neither ever handling the event.
 */
export function hitsHigherPriorityObject<T extends { eventObject: HasUserData }>(
  intersections: T[],
  self: unknown,
  ownPriority: number,
): boolean {
  return intersections.some(
    (hit) => hit.eventObject !== self && pickPriorityOf(hit.eventObject) > ownPriority,
  )
}
