import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fovScaledPointThreshold } from '@/scene/picking/pointThreshold'
import { ConstellationFigure } from '@/scene/layers/ConstellationFigure'
import { useLayersStore } from '@/state/useLayersStore'
import type { Constellation } from '@/types/constellation'

// Bigger than stars' point threshold (see StarsLayer) — thin line figures
// are a sparser click target than stars, so they get a more forgiving
// hit radius, per the spec's own guidance on this exact trade-off.
const BASE_LINE_THRESHOLD = 4
const BASE_FOV = 75

interface ConstellationLayerProps {
  constellations: Constellation[]
}

export function ConstellationLayer({ constellations }: ConstellationLayerProps) {
  const showLines = useLayersStore((state) => state.constellationLines)

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera
    state.raycaster.params.Line.threshold = fovScaledPointThreshold(
      camera.fov,
      BASE_LINE_THRESHOLD,
      BASE_FOV,
    )
  })

  if (!showLines || constellations.length === 0) return null

  return (
    <>
      {constellations.map((constellation) => (
        <ConstellationFigure key={constellation.id} constellation={constellation} />
      ))}
    </>
  )
}
