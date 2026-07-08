import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type * as THREE from 'three'

/**
 * Camera FOV, quantized to `step`-degree buckets and only triggering a
 * React re-render when the bucket actually changes. For components whose
 * output only needs to change occasionally as the user zooms (e.g. label
 * decluttering, which re-sorts/filters a whole candidate list) rather
 * than every frame like shader uniforms — subscribing to
 * `useSceneStore`'s reactive `fov` field directly would re-render on
 * every frame during an active zoom, since `CameraController` updates it
 * that often.
 */
export function useThrottledFov(step: number): number {
  const [bucket, setBucket] = useState(0)
  const lastBucketRef = useRef(0)

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const nextBucket = Math.round(camera.fov / step)
    if (nextBucket !== lastBucketRef.current) {
      lastBucketRef.current = nextBucket
      setBucket(nextBucket)
    }
  })

  return bucket * step
}
