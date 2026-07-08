import { Html } from '@react-three/drei'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useLayersStore } from '@/state/useLayersStore'
import type { Constellation } from '@/types/constellation'

interface LabelsLayerProps {
  constellations: Constellation[]
}

/** Constellation name labels. Only 88 of these, so plain drei <Html> per
 * label (each a real DOM node, camera-facing, auto-positioned every
 * frame) is plenty — no custom projection math needed at this scale. */
export function LabelsLayer({ constellations }: LabelsLayerProps) {
  const showNames = useLayersStore((state) => state.constellationNames)

  if (!showNames) return null

  return (
    <>
      {constellations.map((constellation) => {
        const [x, y, z] = equatorialToCartesian(constellation.labelPosition)
        return (
          <Html
            key={constellation.id}
            position={[
              x * CELESTIAL_SPHERE_RADIUS,
              y * CELESTIAL_SPHERE_RADIUS,
              z * CELESTIAL_SPHERE_RADIUS,
            ]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <span className="text-star-500/70 text-[10px] tracking-wide whitespace-nowrap uppercase select-none">
              {constellation.name}
            </span>
          </Html>
        )
      })}
    </>
  )
}
