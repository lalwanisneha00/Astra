/** Radius of the celestial sphere every layer (stars, constellation
 * lines, labels, ...) places its geometry on. The camera sits at the
 * origin (see SceneCanvas), so this value only affects relative scale,
 * not perspective — but every layer must agree on it. */
export const CELESTIAL_SPHERE_RADIUS = 150

/** The camera's FOV bounds — shared so anything that sets a zoom target
 * (CameraController's own wheel/pinch handling, search navigation's
 * "zoom deep enough to reveal this object" flight) clamps against the
 * same range. */
export const MIN_FOV = 20
export const MAX_FOV = 100
