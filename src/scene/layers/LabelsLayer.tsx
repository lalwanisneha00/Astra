import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { useThrottledFov } from '@/hooks/useThrottledFov'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { fovScaledLabelSeparation, selectDeclutteredLabels } from '@/scene/picking/labelDeclutter'
import { useLayersStore } from '@/state/useLayersStore'
import type { Constellation } from '@/types/constellation'

const FOV_THROTTLE_STEP = 3

interface LabelsLayerProps {
  constellations: Constellation[]
}

/** Constellation name labels. Only 88 of these, so plain drei <Html> per
 * label (each a real DOM node, camera-facing, auto-positioned every
 * frame) is plenty — no custom projection math needed at this scale.
 * Still thinned via `selectDeclutteredLabels` (see StarLabelsLayer):
 * tightly-packed regions of the sky (e.g. Scorpius/Sagittarius/
 * Ophiuchus) can otherwise show overlapping names at wide FOV. There's
 * no natural "priority" for a constellation the way star magnitude
 * gives one, so declaration order stands in — the goal here is purely
 * to stop two labels visually overlapping, not to rank importance. */
export function LabelsLayer({ constellations }: LabelsLayerProps) {
  const showNames = useLayersStore((state) => state.constellationNames)
  const fov = useThrottledFov(FOV_THROTTLE_STEP)

  const declutteredConstellations = useMemo(() => {
    const candidates = constellations.map((constellation, index) => ({
      id: constellation.id,
      priority: index,
      ra: constellation.labelPosition.ra,
      dec: constellation.labelPosition.dec,
    }))
    const selected = selectDeclutteredLabels(candidates, fovScaledLabelSeparation(fov))
    const selectedIds = new Set(selected.map((candidate) => candidate.id))
    return constellations.filter((constellation) => selectedIds.has(constellation.id))
  }, [constellations, fov])

  if (!showNames) return null

  return (
    <>
      {declutteredConstellations.map((constellation) => {
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
