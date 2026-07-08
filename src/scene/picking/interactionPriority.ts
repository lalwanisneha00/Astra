/**
 * Whether this same raycast also hit an object other than `self` — i.e.
 * whether some *other* object with its own event handler was also
 * intersected. Broad, threshold-based hit-testing (star `Points`,
 * constellation `Line`s) uses this to defer to a more specific object
 * (a DSO/planet/Sun/Moon marker) rather than unconditionally consuming
 * the click/hover itself.
 *
 * This exists because Three.js's `Points.raycast` and `Line.raycast`
 * report a hit's `distance` as the distance to the closest point *on
 * the ray itself* to the star/segment, not the star/segment's true
 * position — which systematically under-reports distance versus a real
 * mesh-surface intersection at the same radius (a flat billboard
 * tangent to the celestial sphere only equals the sphere's radius
 * exactly at its own center; everywhere else on it is slightly
 * farther). That bias means a star or constellation line near the
 * cursor will almost always sort as "nearer" than the marker the user
 * actually clicked, and — since react-three-fiber dispatches events
 * nearest-first and stops at the first `stopPropagation()` — it would
 * silently swallow the event before the real target's own handler ever
 * ran.
 */
export function hitsAnotherObject<T extends { eventObject: unknown }>(
  intersections: T[],
  self: unknown,
): boolean {
  return intersections.some((hit) => hit.eventObject !== self)
}
