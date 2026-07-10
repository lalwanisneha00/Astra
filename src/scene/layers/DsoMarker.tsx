import { Billboard, Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import { damp } from '@/lib/easing'
import { clamp } from '@/lib/math'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { DSO_CLICKABLE_OPACITY, dsoRevealLevel, revealProgress } from '@/scene/exploration'
import { wasDrag } from '@/scene/picking/dragGuard'
import { PICK_PRIORITY } from '@/scene/picking/interactionPriority'
import { selectionPulseIntensity } from '@/scene/selectionPulse'
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
// Extra scale on top of HIGHLIGHT_SCALE at the instant of selection,
// decaying away over the pulse — see scene/selectionPulse.ts.
const PULSE_SCALE_BOOST = 0.5
const HIGHLIGHT_BLEND = 0.4
const OPACITY_DAMPING = 6
// Once the damped opacity is this close to its target, snap to the
// exact value and stop recomputing every frame — see the useFrame
// comment below for why this matters at ~500 instances.
const OPACITY_CONVERGED_EPSILON = 0.001

interface DsoMarkerProps {
  dso: DeepSkyObject
  /** Whether the Earth-to-Universe progressive reveal applies. Always
   * true in both modes — in observer mode, `DeepSkyLayer` has already
   * filtered to only above-horizon objects, so this fades *within* that
   * real set the same way it fades the full set in explore mode. */
  explorationEnabled: boolean
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
 *
 * Opacity eases toward a target derived from the object's own reveal
 * level (see scene/exploration.ts's `dsoRevealLevel`) each frame — cheap
 * at ~500 objects, and gives the spec's "fade them in smoothly" directly,
 * with no CPU-side filtering or geometry rebuild (the exact pattern this
 * app's star catalog already learned to avoid).
 */
export function DsoMarker({ dso, explorationEnabled }: DsoMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'dso' && state.selection.id === dso.id,
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const showLabels = useLayersStore((state) => state.labels)
  const meta = DSO_TYPE_META[dso.type]
  const texture = useMemo(() => getDsoTexture(meta.icon), [meta.icon])
  const markerSize = BASE_MARKER_SIZE * markerSizeMultiplier(dso.sizeArcmin)
  const revealLevel = useMemo(() => dsoRevealLevel(dso), [dso])

  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const currentOpacityRef = useRef(1)
  // Tracked inline (rather than via the shared useSelectionPulse hook)
  // to avoid a second useFrame subscription per instance — this layer
  // already has its own for opacity, and at up to ~500 objects, doubling
  // the per-frame callback count is exactly the kind of cost this app's
  // performance work has learned to avoid.
  const wasSelectedRef = useRef(false)
  const selectedAtRef = useRef<number | null>(null)
  // FOV-change + convergence tracking so the opacity fade only actually
  // recomputes while it's genuinely mid-transition (the camera is
  // zooming, or this object hasn't finished fading in/out yet) — at
  // ~500 objects, redoing this math every single frame forever, even
  // while the camera sits perfectly still, is exactly the "unnecessary
  // recalculation" this pass exists to remove.
  const lastFovRef = useRef<number | null>(null)
  const opacityConvergedRef = useRef(false)

  const color = useMemo(() => {
    const base = new THREE.Color(meta.color)
    return isSelected ? base.lerp(new THREE.Color('#ffffff'), HIGHLIGHT_BLEND) : base
  }, [meta.color, isSelected])

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(dso.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [dso.equatorial])

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const fov = camera.fov
    const fovChanged = lastFovRef.current !== fov
    lastFovRef.current = fov

    if (fovChanged || !opacityConvergedRef.current) {
      const target = explorationEnabled ? revealProgress(fov, revealLevel) : 1
      const next = damp(currentOpacityRef.current, target, OPACITY_DAMPING, delta)
      const converged = Math.abs(next - target) < OPACITY_CONVERGED_EPSILON
      currentOpacityRef.current = converged ? target : next
      opacityConvergedRef.current = converged
      if (materialRef.current) materialRef.current.opacity = currentOpacityRef.current
    }

    if (isSelected && !wasSelectedRef.current) selectedAtRef.current = state.clock.elapsedTime
    const justDeselected = !isSelected && wasSelectedRef.current
    wasSelectedRef.current = isSelected

    if (isSelected) {
      const pulse =
        selectedAtRef.current !== null
          ? selectionPulseIntensity(state.clock.elapsedTime - selectedAtRef.current)
          : 0
      if (meshRef.current)
        meshRef.current.scale.setScalar(HIGHLIGHT_SCALE + pulse * PULSE_SCALE_BOOST)
    } else if (justDeselected && meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
  })

  // A release, not `onClick` — see StarsLayer's detailed comment on why
  // react-three-fiber's own `onClick` unreliably drops clicks in a scene
  // with continuous camera easing between pointerdown and the click
  // event.
  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (wasDrag() || currentOpacityRef.current < DSO_CLICKABLE_OPACITY) return
    event.stopPropagation()
    select({ type: 'dso', id: dso.id })
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    if (currentOpacityRef.current < DSO_CLICKABLE_OPACITY) return
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
          ref={meshRef}
          userData={{ pickPriority: PICK_PRIORITY.precise }}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[markerSize, markerSize]} />
          <meshBasicMaterial
            ref={materialRef}
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
