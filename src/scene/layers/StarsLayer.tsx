import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { StarCatalog } from '@/hooks/useStarCatalog'
import { prefersReducedMotion } from '@/lib/motion'
import { fovScaledPointThreshold } from '@/scene/picking/pointThreshold'
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
}

/** Catalog is loaded once in App.tsx and passed down, so the same loaded
 * data can also be looked up by StarPanel outside the canvas — see
 * ARCHITECTURE.md's "Star selection" note. */
export function StarsLayer({ catalog, horizonCullingEnabled, altitudes }: StarsLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const altitudeAttributeRef = useRef<THREE.BufferAttribute>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const { buffers, stars } = catalog
  const { positions, sizes, phases, colors, indices, count } = buffers

  const hoveredIndexRef = useRef(-1)
  const starsRef = useRef<Star[]>(stars)
  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  const altitudesRef = useRef<Float32Array | null>(null)
  useEffect(() => {
    altitudesRef.current = altitudes
  }, [altitudes])

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
      uHorizonCullingEnabled: { value: 0 },
    }),
    [dpr, reducedMotion],
  )

  useFrame((state, delta) => {
    const uniforms = materialRef.current?.uniforms
    const timeUniform = uniforms?.uTime
    const cullingUniform = uniforms?.uHorizonCullingEnabled
    if (timeUniform) timeUniform.value += delta
    if (cullingUniform) cullingUniform.value = horizonCullingEnabled ? 1 : 0

    const camera = state.camera as THREE.PerspectiveCamera
    state.raycaster.params.Points.threshold = fovScaledPointThreshold(
      camera.fov,
      BASE_POINT_THRESHOLD,
      BASE_FOV,
    )
  })

  const isCulled = useCallback(
    (index: number) => {
      if (!horizonCullingEnabled) return false
      const altitude = altitudesRef.current?.[index]
      return altitude !== undefined && altitude < 0
    },
    [horizonCullingEnabled],
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
    <points onPointerMove={handlePointerMove} onPointerOut={handlePointerOut} onClick={handleClick}>
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
