import { clamp } from '@/lib/math'

/**
 * Inverse of the camera's forward-vector formula. CameraController
 * builds its look direction from Euler angles in `'YXZ'` order (yaw
 * around world Y, then pitch around the new local X — see its own
 * derivation comment), which works out to:
 *
 *   forward = (-cos(pitch)*sin(yaw), sin(pitch), -cos(pitch)*cos(yaw))
 *
 * Given a target direction (e.g. from `equatorialToCartesian`), this
 * returns the (yaw, pitch) that makes the camera look that way.
 */
export function directionToYawPitch(direction: [number, number, number]): {
  yaw: number
  pitch: number
} {
  const [x, y, z] = direction
  const pitch = Math.asin(clamp(y, -1, 1))
  const yaw = Math.atan2(-x, -z)
  return { yaw, pitch }
}

/**
 * Returns the angle equivalent to `to` that's closest to `from` (i.e.
 * `from` plus the shortest signed delta) — damping `from` toward this
 * result never takes the "long way around" through a full rotation.
 */
export function shortestAngleTarget(from: number, to: number): number {
  const twoPi = Math.PI * 2
  let delta = (to - from) % twoPi
  if (delta > Math.PI) delta -= twoPi
  if (delta < -Math.PI) delta += twoPi
  return from + delta
}
