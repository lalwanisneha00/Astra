/**
 * Three.js's point-cloud raycasting hit-tests against a fixed world-space
 * distance ("threshold"). Since every star sits on the same fixed-radius
 * sphere (see SceneCanvas/useStarCatalog), a FOV-scaled threshold keeps the
 * clickable radius around a point roughly constant on screen regardless of
 * zoom level — otherwise zooming in would make points effectively harder
 * to hit relative to how big they look, and zooming out would make nearby
 * stars ambiguous to pick apart.
 */
export function fovScaledPointThreshold(
  fovDegrees: number,
  baseThreshold: number,
  baseFovDegrees: number,
): number {
  return baseThreshold * (fovDegrees / baseFovDegrees)
}
