import { clamp, smoothstep01 } from '@/lib/math'

/**
 * How strongly zoom velocity should still push the target FOV, given how
 * close the *target* already is to its boundary in the current direction
 * of travel — 1 far from the relevant edge, tapering smoothly to 0 right
 * at it. This is what makes reaching the zoom limit feel like arriving
 * and settling rather than hitting a wall: `stepZoomTarget` still clamps
 * as a numerical safety net, but that clamp is rarely what's actually
 * perceived, since velocity fades out well before it would ever engage.
 */
export function zoomEdgeResistance(
  targetFov: number,
  velocity: number,
  minFov: number,
  maxFov: number,
  edgeBandDeg: number,
): number {
  if (velocity > 0) return smoothstep01((maxFov - targetFov) / edgeBandDeg)
  if (velocity < 0) return smoothstep01((targetFov - minFov) / edgeBandDeg)
  return 1
}

/**
 * Advances the zoom target by one frame in log-FOV space rather than
 * linear degrees, so the same input (a wheel notch, a pinch ratio) feels
 * like an equally-large proportional step in the journey through scale
 * regardless of whether the camera is already zoomed far in or still
 * near the wide baseline — the same reason real "distance" scales (map
 * zoom levels, camera dollies) are conventionally multiplicative rather
 * than additive. `velocity` is in log-FOV units per second, so a
 * constant velocity produces a constant *relative* zoom rate.
 */
export function stepZoomTarget(
  currentTargetFov: number,
  velocity: number,
  deltaTime: number,
  minFov: number,
  maxFov: number,
  edgeBandDeg: number,
): number {
  const resistance = zoomEdgeResistance(currentTargetFov, velocity, minFov, maxFov, edgeBandDeg)
  const nextLogFov = Math.log(currentTargetFov) + velocity * resistance * deltaTime
  return clamp(Math.exp(nextLogFov), minFov, maxFov)
}
