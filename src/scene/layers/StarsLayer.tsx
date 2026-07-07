import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { prefersReducedMotion } from '@/lib/motion'
import fragmentShader from '@/scene/shaders/starField.frag.glsl?raw'
import vertexShader from '@/scene/shaders/starField.vert.glsl?raw'

export function StarsLayer() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const { positions, sizes, phases, colors, count } = useStarCatalog()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uTwinkleAmount: { value: reducedMotion ? 0 : 1 },
    }),
    [dpr, reducedMotion],
  )

  useFrame((_state, delta) => {
    const timeUniform = materialRef.current?.uniforms.uTime
    if (timeUniform) {
      timeUniform.value += delta
    }
  })

  if (count === 0) return null

  return (
    <points>
      {/* Keyed on count: each new tier arriving swaps in a fresh, larger
          geometry rather than relying on in-place attribute mutation. */}
      <bufferGeometry key={count}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aTwinklePhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
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
