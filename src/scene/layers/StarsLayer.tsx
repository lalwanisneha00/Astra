import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import fragmentShader from '@/scene/shaders/starField.frag.glsl?raw'
import vertexShader from '@/scene/shaders/starField.vert.glsl?raw'

// TODO(Phase 3): replace this procedural field with the real HYG star
// catalog (positions from RA/Dec, magnitude-based size, and B-V based color).

const STAR_COUNT = 8000
const SPHERE_RADIUS = 150

interface StarFieldAttributes {
  positions: Float32Array
  sizes: Float32Array
  phases: Float32Array
  colors: Float32Array
}

/** Distributes points evenly over a sphere using a Fibonacci lattice. */
function generateStarField(count: number, radius: number): StarFieldAttributes {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i

    positions[i * 3] = Math.cos(theta) * radiusAtY * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius

    sizes[i] = 1.2 + Math.random() * 2.4
    phases[i] = Math.random() * Math.PI * 2

    const warmth = Math.random()
    colors[i * 3] = 0.85 + warmth * 0.15
    colors[i * 3 + 1] = 0.88 + warmth * 0.1
    colors[i * 3 + 2] = 0.95 + (1 - warmth) * 0.05
  }

  return { positions, sizes, phases, colors }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function StarsLayer() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const { positions, sizes, phases, colors } = useMemo(
    () => generateStarField(STAR_COUNT, SPHERE_RADIUS),
    [],
  )

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

  return (
    <points>
      <bufferGeometry>
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
