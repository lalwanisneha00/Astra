import { Canvas } from '@react-three/fiber'
import type { StarCatalog } from '@/hooks/useStarCatalog'
import { CameraController } from '@/scene/camera/CameraController'
import { ConstellationLayer } from '@/scene/layers/ConstellationLayer'
import { LabelsLayer } from '@/scene/layers/LabelsLayer'
import { StarsLayer } from '@/scene/layers/StarsLayer'
import type { Constellation } from '@/types/constellation'

const INITIAL_FOV = 75
const NEAR_PLANE = 0.1
const FAR_PLANE = 500

// Matches --color-space-950 in src/styles/tokens.css.
const BACKGROUND_COLOR = '#04060c'

interface SceneCanvasProps {
  starCatalog: StarCatalog
  constellations: Constellation[]
}

/**
 * The camera always sits at the origin, at the center of the celestial
 * sphere: panning rotates it, zoom changes its FOV, and it never dollies
 * forward or back. See ARCHITECTURE.md for the full rendering model.
 */
export function SceneCanvas({ starCatalog, constellations }: SceneCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 touch-none"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: INITIAL_FOV, near: NEAR_PLANE, far: FAR_PLANE, position: [0, 0, 0] }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <CameraController />
      {/* Rendered before StarsLayer so bright star points sit visually on
          top of the dimmer connecting lines. */}
      <ConstellationLayer constellations={constellations} />
      <StarsLayer catalog={starCatalog} />
      <LabelsLayer constellations={constellations} />
    </Canvas>
  )
}
