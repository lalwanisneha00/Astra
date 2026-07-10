import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import { useThrottledFov } from '@/hooks/useThrottledFov'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { starMagnitudeCutoff } from '@/scene/exploration'
import { fovScaledLabelSeparation, selectDeclutteredLabels } from '@/scene/picking/labelDeclutter'
import { useLayersStore } from '@/state/useLayersStore'
import type { ObserverLocation } from '@/types/coordinates'
import type { Star } from '@/types/star'

// Re-checking FOV every 3 degrees of zoom is plenty responsive without
// re-sorting/filtering thousands of candidates every single frame.
const FOV_THROTTLE_STEP = 3

interface StarLabelsLayerProps {
  stars: Star[]
  observer: ObserverLocation | null
  date: Date
  /** Whether the Earth-to-Universe progressive reveal applies (see
   * scene/exploration.ts) — a star not yet faded in shouldn't have a
   * visible name label either. Always true in both modes: composes
   * with the horizon filter above rather than replacing it, so Today's
   * Night Sky labels reveal the same way Explore Mode's do, on top of
   * only ever labeling stars actually above the horizon. */
  explorationEnabled: boolean
}

/** Named star labels, off by default (see useLayersStore) — up to
 * ~3,400 named stars across all three catalog tiers is enough plain
 * drei <Html> nodes to clutter the sky badly, unlike constellation
 * names (88, always on). Horizon culling here is a plain per-star CPU
 * check, same reasoning as PlanetsLayer/DeepSkyLayer: this list is
 * nowhere near the scale that needed StarsLayer's GPU-side discard.
 *
 * Labels are further thinned by `selectDeclutteredLabels` (brightest
 * first, skipping anything that would visually overlap a more
 * prominent label already shown) and, in explore mode, hidden entirely
 * for stars not yet revealed at the current zoom depth — no point
 * labeling a star that's still faded out.
 */
export function StarLabelsLayer({
  stars,
  observer,
  date,
  explorationEnabled,
}: StarLabelsLayerProps) {
  const showNames = useLayersStore((state) => state.starNames)
  const fov = useThrottledFov(FOV_THROTTLE_STEP)

  // Short-circuits the whole reveal/declutter chain below when names
  // are hidden (the common case - off by default) rather than just the
  // final `return null`: hooks must still run every render, but with an
  // empty `namedStars`, every downstream memo does nothing instead of
  // still filtering/decluttering the full named-star catalog (up to
  // ~3,400 candidates) on every FOV bucket change for a result that
  // gets thrown away regardless. This was measured to cost over 1
  // second of CPU time during a single zoom gesture even with names off.
  const namedStars = useMemo(
    () => (showNames ? stars.filter((star) => star.names.length > 0) : []),
    [stars, showNames],
  )

  const visibleStars = useMemo(() => {
    if (!observer) return namedStars
    return namedStars.filter(
      (star) => equatorialToHorizontal(star.equatorial, observer, date).altitude >= 0,
    )
  }, [namedStars, observer, date])

  const revealedStars = useMemo(() => {
    if (!explorationEnabled) return visibleStars
    const cutoff = starMagnitudeCutoff(fov)
    return visibleStars.filter((star) => star.magnitude <= cutoff)
  }, [visibleStars, explorationEnabled, fov])

  const declutteredStars = useMemo(() => {
    const candidates = revealedStars.map((star) => ({
      id: star.id,
      priority: star.magnitude,
      ra: star.equatorial.ra,
      dec: star.equatorial.dec,
    }))
    const selected = selectDeclutteredLabels(candidates, fovScaledLabelSeparation(fov))
    const selectedIds = new Set(selected.map((candidate) => candidate.id))
    return revealedStars.filter((star) => selectedIds.has(star.id))
  }, [revealedStars, fov])

  if (!showNames) return null

  return (
    <>
      {declutteredStars.map((star) => {
        const [x, y, z] = equatorialToCartesian(star.equatorial)
        return (
          <Html
            key={star.id}
            position={[
              x * CELESTIAL_SPHERE_RADIUS,
              y * CELESTIAL_SPHERE_RADIUS,
              z * CELESTIAL_SPHERE_RADIUS,
            ]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <span className="block translate-y-2 text-[10px] tracking-wide whitespace-nowrap text-star-400/80 uppercase select-none">
              {star.names[0]}
            </span>
          </Html>
        )
      })}
    </>
  )
}
