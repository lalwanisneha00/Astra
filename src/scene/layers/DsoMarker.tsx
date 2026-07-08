import { Billboard, Html } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import { clamp } from '@/lib/math'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { getDsoTexture } from '@/scene/textures/dsoTexture'
import { useLayersStore } from '@/state/useLayersStore'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { DeepSkyObject } from '@/types/deepSkyObject'

const BASE_MARKER_SIZE = 2.6
const DEFAULT_SIZE_ARCMIN = 8
const MIN_SIZE_MULTIPLIER = 0.6
const MAX_SIZE_MULTIPLIER = 3
const HIGHLIGHT_SCALE = 1.4
const HIGHLIGHT_BLEND = 0.4

interface DsoMarkerProps {
  dso: DeepSkyObject
}

/** Bigger, closer objects (e.g. Andromeda Galaxy) get a visibly bigger
 * marker than small, unresolved ones — compressed via sqrt so the huge
 * real range (a few arcmin to ~180 for Andromeda) doesn't produce
 * absurdly tiny-vs-giant markers. */
function markerSizeMultiplier(sizeArcmin: number | null): number {
  const value = sizeArcmin ?? DEFAULT_SIZE_ARCMIN
  return clamp(Math.sqrt(value / DEFAULT_SIZE_ARCMIN), MIN_SIZE_MULTIPLIER, MAX_SIZE_MULTIPLIER)
}

/**
 * One deep-sky object's own billboarded sprite — same technique as
 * PlanetMarker (a camera-facing plane, immune to true-sphere perspective
 * distortion at wide FOV) but with no orbit trail: DSOs are fixed on the
 * celestial sphere like stars/constellations, not time-varying like
 * planets, so position never needs recomputing.
 */
export function DsoMarker({ dso }: DsoMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'dso' && state.selection.id === dso.id,
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const showLabels = useLayersStore((state) => state.labels)
  const meta = DSO_TYPE_META[dso.type]
  const texture = useMemo(() => getDsoTexture(meta.icon), [meta.icon])
  const markerSize = BASE_MARKER_SIZE * markerSizeMultiplier(dso.sizeArcmin)

  const color = useMemo(() => {
    const base = new THREE.Color(meta.color)
    return isSelected ? base.lerp(new THREE.Color('#ffffff'), HIGHLIGHT_BLEND) : base
  }, [meta.color, isSelected])

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(dso.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [dso.equatorial])

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    select({ type: 'dso', id: dso.id })
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    setHoveredObjectId(dso.id)
  }

  function handlePointerOut() {
    setHoveredObjectId(null)
  }

  return (
    <>
      <Billboard position={position}>
        <mesh
          scale={isSelected ? HIGHLIGHT_SCALE : 1}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[markerSize, markerSize]} />
          <meshBasicMaterial
            map={texture}
            color={color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
      {showLabels && isSelected && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <span className="block translate-y-3 text-center text-[10px] tracking-wide whitespace-nowrap text-star-300 uppercase select-none">
            {dso.messier ?? dso.commonNames[0] ?? dso.id}
          </span>
        </Html>
      )}
    </>
  )
}
