import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { StarCatalog } from '@/hooks/useStarCatalog'
import { prefersReducedMotion } from '@/lib/motion'
import { MAGNITUDE_FADE_WIDTH, starMagnitudeCutoff } from '@/scene/exploration'
import { wasDrag } from '@/scene/picking/dragGuard'
import { hitsHigherPriorityObject, PICK_PRIORITY } from '@/scene/picking/interactionPriority'
import { fovScaledPointThreshold } from '@/scene/picking/pointThreshold'
import { selectionPulseIntensity } from '@/scene/selectionPulse'
import fragmentShader from '@/scene/shaders/starField.frag.glsl?raw'
import vertexShader from '@/scene/shaders/starField.vert.glsl?raw'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Star } from '@/types/star'

// Tuned for the catalog's typical star spacing at SPHERE_RADIUS=150 (see
// useStarCatalog); scaled by FOV each frame so the clickable radius around
// a star stays roughly constant on screen regardless of zoom.
const BASE_POINT_THRESHOLD = 2
const BASE_FOV = 75

interface StarsLayerProps {
  catalog: StarCatalog
  /** Whether below-horizon stars should be hidden at all (explore mode:
   * always false — there's no horizon to hide anything relative to). */
  horizonCullingEnabled: boolean
  /** Per-star altitude in degrees, index-aligned with `catalog`, from
   * useHorizonCulling. Updated in place on the GPU (bufferAttribute
   * mutation + needsUpdate) rather than by rebuilding the star buffers
   * or the geometry — full CPU-side filtering plus a geometry remount on
   * every horizon recompute was the actual cause of the time-scrubbing
   * hang this replaced (see ARCHITECTURE.md's Phase 8 fix note). */
  altitudes: Float32Array | null
  /** Whether the Earth-to-Universe progressive reveal applies. Always
   * true in both modes: in explore mode it's the only visibility
   * filter; in observer mode it composes with `horizonCullingEnabled`
   * (a star must be both above the horizon *and* revealed at the
   * current zoom depth), so Today's Night Sky starts at the same
   * naked-eye baseline and reveals more exactly the way Explore Mode
   * does, on top of showing only what's really in the sky right now. */
  explorationEnabled: boolean
}

/** Catalog is loaded once in App.tsx and passed down, so the same loaded
 * data can also be looked up by StarPanel outside the canvas — see
 * ARCHITECTURE.md's "Star selection" note. */
export function StarsLayer({
  catalog,
  horizonCullingEnabled,
  altitudes,
  explorationEnabled,
}: StarsLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const altitudeAttributeRef = useRef<THREE.BufferAttribute>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const { buffers, stars } = catalog
  const { positions, sizes, phases, colors, indices, magnitudes, count } = buffers

  const hoveredIndexRef = useRef(-1)
  const starsRef = useRef<Star[]>(stars)
  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  // The selected star's index (or -1) plus when it was selected, for the
  // brief "just selected" pulse (see scene/selectionPulse.ts) — same
  // highlight-on-selection treatment every other object type gets.
  // Looked up only when the selection itself changes (a rare, user-driven
  // event), never per-frame — an O(n) scan every frame across a catalog
  // this size would be the exact kind of per-frame cost this app has
  // learned to avoid (see ARCHITECTURE.md's Phase 8 note).
  const selectedStarIndexRef = useRef(-1)
  const selectedAtRef = useRef<number | null>(null)
  const selectedStarId = useSelectionStore((state) =>
    state.selection?.type === 'star' ? state.selection.id : null,
  )
  useEffect(() => {
    if (selectedStarId === null) {
      selectedStarIndexRef.current = -1
      selectedAtRef.current = null
      return
    }
    selectedStarIndexRef.current = starsRef.current.findIndex((s) => s.id === selectedStarId)
    selectedAtRef.current = performance.now() / 1000
  }, [selectedStarId])

  const altitudesRef = useRef<Float32Array | null>(null)
  useEffect(() => {
    altitudesRef.current = altitudes
  }, [altitudes])

  // Updated every frame in useFrame below — read imperatively by
  // isRevealed rather than as a React dependency, matching this file's
  // existing altitude-culling pattern.
  const magnitudeCutoffRef = useRef(Infinity)

  // Stable across altitude recomputes — only a new array when the star
  // count itself changes (tiers loading), not on every horizon update.
  const initialAltitudeBuffer = useMemo(() => new Float32Array(count), [count])

  useEffect(() => {
    const attribute = altitudeAttributeRef.current
    if (!attribute) return
    const array = attribute.array as Float32Array

    if (altitudes && altitudes.length === array.length) {
      array.set(altitudes)
    } else {
      array.fill(0)
    }
    attribute.needsUpdate = true
  }, [altitudes])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uTwinkleAmount: { value: reducedMotion ? 0 : 1 },
      uHoveredIndex: { value: -1 },
      uSelectedIndex: { value: -1 },
      uSelectionPulse: { value: 0 },
      uHorizonCullingEnabled: { value: 0 },
      uExplorationEnabled: { value: 0 },
      uMagnitudeCutoff: { value: Infinity },
    }),
    [dpr, reducedMotion],
  )

  useFrame((state, delta) => {
    const uniforms = materialRef.current?.uniforms
    const timeUniform = uniforms?.uTime
    const cullingUniform = uniforms?.uHorizonCullingEnabled
    const explorationUniform = uniforms?.uExplorationEnabled
    const cutoffUniform = uniforms?.uMagnitudeCutoff
    if (timeUniform) timeUniform.value += delta
    if (cullingUniform) cullingUniform.value = horizonCullingEnabled ? 1 : 0

    const camera = state.camera as THREE.PerspectiveCamera
    const cutoff = explorationEnabled ? starMagnitudeCutoff(camera.fov) : Infinity
    magnitudeCutoffRef.current = cutoff
    if (explorationUniform) explorationUniform.value = explorationEnabled ? 1 : 0
    if (cutoffUniform) cutoffUniform.value = cutoff

    const selectedIndexUniform = uniforms?.uSelectedIndex
    const selectionPulseUniform = uniforms?.uSelectionPulse
    if (selectedIndexUniform) selectedIndexUniform.value = selectedStarIndexRef.current
    if (selectionPulseUniform) {
      selectionPulseUniform.value =
        selectedAtRef.current !== null
          ? selectionPulseIntensity(performance.now() / 1000 - selectedAtRef.current)
          : 0
    }

    state.raycaster.params.Points.threshold = fovScaledPointThreshold(
      camera.fov,
      BASE_POINT_THRESHOLD,
      BASE_FOV,
    )
  })

  const isCulled = useCallback(
    (index: number) => {
      if (horizonCullingEnabled) {
        const altitude = altitudesRef.current?.[index]
        if (altitude !== undefined && altitude < 0) return true
      }
      // Mirrors the shader's own fully-invisible threshold (magnitude
      // cutoff plus the fade band) — a star that's still fading in
      // remains clickable, one that's fully hidden shouldn't be.
      const magnitude = magnitudes[index]
      if (
        magnitude !== undefined &&
        magnitude > magnitudeCutoffRef.current + MAGNITUDE_FADE_WIDTH
      ) {
        return true
      }
      return false
    },
    [horizonCullingEnabled, magnitudes],
  )

  const setHoveredIndex = useCallback((index: number) => {
    if (hoveredIndexRef.current === index) return
    hoveredIndexRef.current = index

    const uniform = materialRef.current?.uniforms.uHoveredIndex
    if (uniform) uniform.value = index

    const star = index >= 0 ? (starsRef.current[index] ?? null) : null
    useSceneStore.getState().setHoveredObjectId(star?.id ?? null)
  }, [])

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // See interactionPriority.ts: a star's threshold-based hit can
      // out-rank a precisely-clicked DSO/planet/Sun/Moon marker at the
      // same radius, so defer to it rather than showing a star hover
      // highlight over what's actually a different object. Only defers
      // to *higher*-priority objects (not constellation lines, which are
      // lower priority) — otherwise a star anchoring a constellation
      // line would mutually defer with that line and neither would ever
      // show hover feedback.
      if (hitsHigherPriorityObject(event.intersections, event.eventObject, PICK_PRIORITY.star)) {
        setHoveredIndex(-1)
        return
      }
      event.stopPropagation()
      const index = event.index ?? -1
      setHoveredIndex(index >= 0 && isCulled(index) ? -1 : index)
    },
    [setHoveredIndex, isCulled],
  )

  const handlePointerOut = useCallback(() => {
    setHoveredIndex(-1)
  }, [setHoveredIndex])

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (wasDrag()) return
      // See interactionPriority.ts's doc comment for why this check is
      // necessary: without it, a star can silently swallow a click
      // meant for a DSO/planet/Sun/Moon marker sitting at the same
      // on-screen position.
      if (hitsHigherPriorityObject(event.intersections, event.eventObject, PICK_PRIORITY.star))
        return
      event.stopPropagation()
      if (event.index === undefined || isCulled(event.index)) return
      const star = starsRef.current[event.index]
      if (!star) return
      useSelectionStore.getState().select({ type: 'star', id: star.id })
    },
    [isCulled],
  )

  if (count === 0) return null

  return (
    <points
      userData={{ pickPriority: PICK_PRIORITY.star }}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Keyed on count: only changes when a new tier finishes loading,
          not on every horizon recompute (altitude is a separate,
          in-place-updated attribute, not part of what determines count
          any more). */}
      <bufferGeometry key={count}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aTwinklePhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aIndex" args={[indices, 1]} />
        <bufferAttribute attach="attributes-aMagnitude" args={[magnitudes, 1]} />
        <bufferAttribute
          ref={altitudeAttributeRef}
          attach="attributes-aAltitude"
          args={[initialAltitudeBuffer, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
