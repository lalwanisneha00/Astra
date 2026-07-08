import { Canvas } from '@react-three/fiber'
import type { StarCatalog } from '@/hooks/useStarCatalog'
import { CameraController } from '@/scene/camera/CameraController'
import { ConstellationLayer } from '@/scene/layers/ConstellationLayer'
import { GridLayer } from '@/scene/layers/GridLayer'
import { HorizonLayer } from '@/scene/layers/HorizonLayer'
import { LabelsLayer } from '@/scene/layers/LabelsLayer'
import { PlanetsLayer } from '@/scene/layers/PlanetsLayer'
import { StarsLayer } from '@/scene/layers/StarsLayer'
import type { Constellation } from '@/types/constellation'
import type { ObserverLocation } from '@/types/coordinates'

const INITIAL_FOV = 75
const NEAR_PLANE = 0.1
const FAR_PLANE = 500

// Matches --color-space-950 in src/styles/tokens.css.
const BACKGROUND_COLOR = '#04060c'

interface SceneCanvasProps {
  starCatalog: StarCatalog
  constellations: Constellation[]
  observer: ObserverLocation | null
  date: Date
  horizonCullingEnabled: boolean
  altitudes: Float32Array | null
}

/**
 * The camera always sits at the origin, at the center of the celestial
 * sphere: panning rotates it, zoom changes its FOV, and it never dollies
 * forward or back. See ARCHITECTURE.md for the full rendering model.
 */
export function SceneCanvas({
  starCatalog,
  constellations,
  observer,
  date,
  horizonCullingEnabled,
  altitudes,
}: SceneCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 z-0 touch-none"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: INITIAL_FOV, near: NEAR_PLANE, far: FAR_PLANE, position: [0, 0, 0] }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <CameraController />
      {/* Rendered before StarsLayer so bright star points sit visually on
          top of the dimmer connecting lines/grids. */}
      <GridLayer observer={observer} date={date} />
      <ConstellationLayer constellations={constellations} />
      <StarsLayer
        catalog={starCatalog}
        horizonCullingEnabled={horizonCullingEnabled}
        altitudes={altitudes}
      />
      <LabelsLayer constellations={constellations} />
      <PlanetsLayer observer={observer} date={date} />
      <HorizonLayer observer={observer} date={date} />
    </Canvas>
  )
}
