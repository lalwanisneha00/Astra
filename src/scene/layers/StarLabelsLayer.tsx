import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useLayersStore } from '@/state/useLayersStore'
import type { ObserverLocation } from '@/types/coordinates'
import type { Star } from '@/types/star'

interface StarLabelsLayerProps {
  stars: Star[]
  observer: ObserverLocation | null
  date: Date
}

/** Named star labels, off by default (see useLayersStore) — up to
 * ~3,400 named stars across all three catalog tiers is enough plain
 * drei <Html> nodes to clutter the sky badly, unlike constellation
 * names (88, always on). Horizon culling here is a plain per-star CPU
 * check, same reasoning as PlanetsLayer/DeepSkyLayer: this list is
 * nowhere near the scale that needed StarsLayer's GPU-side discard. */
export function StarLabelsLayer({ stars, observer, date }: StarLabelsLayerProps) {
  const showNames = useLayersStore((state) => state.starNames)

  const namedStars = useMemo(() => stars.filter((star) => star.names.length > 0), [stars])

  const visibleStars = useMemo(() => {
    if (!observer) return namedStars
    return namedStars.filter(
      (star) => equatorialToHorizontal(star.equatorial, observer, date).altitude >= 0,
    )
  }, [namedStars, observer, date])

  if (!showNames) return null

  return (
    <>
      {visibleStars.map((star) => {
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
