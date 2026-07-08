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
}

/** Catalog is loaded once in App.tsx and passed down, so the same loaded
 * data can also be looked up by StarPanel outside the canvas — see
 * ARCHITECTURE.md's "Star selection" note. */
export function StarsLayer({ catalog }: StarsLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const { buffers, stars } = catalog
  const { positions, sizes, phases, colors, indices, count } = buffers

  const hoveredIndexRef = useRef(-1)
  const starsRef = useRef<Star[]>(stars)
  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uTwinkleAmount: { value: reducedMotion ? 0 : 1 },
      uHoveredIndex: { value: -1 },
    }),
    [dpr, reducedMotion],
  )

  useFrame((state, delta) => {
    const timeUniform = materialRef.current?.uniforms.uTime
    if (timeUniform) {
      timeUniform.value += delta
    }

    const camera = state.camera as THREE.PerspectiveCamera
    state.raycaster.params.Points.threshold = fovScaledPointThreshold(
      camera.fov,
      BASE_POINT_THRESHOLD,
      BASE_FOV,
    )
  })

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
      setHoveredIndex(event.index ?? -1)
    },
    [setHoveredIndex],
  )

  const handlePointerOut = useCallback(() => {
    setHoveredIndex(-1)
  }, [setHoveredIndex])

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.index === undefined) return
    const star = starsRef.current[event.index]
    if (!star) return
    useSelectionStore.getState().select({ type: 'star', id: star.id })
  }, [])

  if (count === 0) return null

  return (
    <points onPointerMove={handlePointerMove} onPointerOut={handlePointerOut} onClick={handleClick}>
      {/* Keyed on count: each new tier arriving swaps in a fresh, larger
          geometry rather than relying on in-place attribute mutation. */}
      <bufferGeometry key={count}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aTwinklePhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aIndex" args={[indices, 1]} />
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
