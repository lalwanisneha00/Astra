import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { damp } from '@/lib/easing'
import { clamp } from '@/lib/math'
import { prefersReducedMotion } from '@/lib/motion'
import { useSceneStore } from '@/state/useSceneStore'

const MIN_FOV = 20
const MAX_FOV = 100
const MAX_PITCH = THREE.MathUtils.degToRad(85)
const WHEEL_ZOOM_SPEED = 0.05
const FOV_DAMPING = 10
const INERTIA_DAMPING = 6
const VELOCITY_EPSILON = 0.0005

interface PointerPoint {
  x: number
  y: number
}

function distanceBetween(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Owns all pointer/wheel/touch input for the sky. The camera always sits at
 * the scene origin (see SceneCanvas): dragging rotates it (yaw/pitch),
 * wheel and pinch change its FOV. Both are eased/damped every frame in
 * `useFrame` rather than through React state, so navigating the sky never
 * triggers a re-render. Renders nothing itself.
 */
export function CameraController() {
  const { camera, gl } = useThree()
  // SceneCanvas always configures a perspective (fov-based) camera.
  const perspectiveCamera = camera as THREE.PerspectiveCamera
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])

  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const velocityRef = useRef({ yaw: 0, pitch: 0 })
  const isDraggingRef = useRef(false)
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  useEffect(() => {
    const canvas = gl.domElement
    const activePointers = new Map<number, PointerPoint>()
    let lastPointer: PointerPoint | null = null
    let lastMoveTime = 0
    let pinchLastDistance: number | null = null

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      velocityRef.current = { yaw: 0, pitch: 0 }

      if (activePointers.size === 1) {
        isDraggingRef.current = true
        lastPointer = { x: event.clientX, y: event.clientY }
        lastMoveTime = performance.now()
      } else if (activePointers.size === 2) {
        isDraggingRef.current = false
        const [a, b] = [...activePointers.values()]
        pinchLastDistance = a && b ? distanceBetween(a, b) : null
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!activePointers.has(event.pointerId)) return
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (activePointers.size === 2) {
        const [a, b] = [...activePointers.values()]
        if (a && b) {
          const distance = distanceBetween(a, b)
          if (pinchLastDistance) {
            const store = useSceneStore.getState()
            const ratio = distance / pinchLastDistance
            store.setTargetFov(clamp(store.targetFov / ratio, MIN_FOV, MAX_FOV))
          }
          pinchLastDistance = distance
        }
        return
      }

      if (!isDraggingRef.current || !lastPointer) return

      const now = performance.now()
      const deltaTime = Math.max((now - lastMoveTime) / 1000, 1 / 240)
      const dx = event.clientX - lastPointer.x
      const dy = event.clientY - lastPointer.y
      const radPerPixel = THREE.MathUtils.degToRad(perspectiveCamera.fov) / canvas.clientHeight

      const yawDelta = dx * radPerPixel
      const pitchDelta = dy * radPerPixel

      yawRef.current += yawDelta
      pitchRef.current = clamp(pitchRef.current + pitchDelta, -MAX_PITCH, MAX_PITCH)
      velocityRef.current = { yaw: yawDelta / deltaTime, pitch: pitchDelta / deltaTime }

      lastPointer = { x: event.clientX, y: event.clientY }
      lastMoveTime = now
    }

    const handlePointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId)
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      if (activePointers.size < 2) {
        pinchLastDistance = null
      }
      if (activePointers.size === 0) {
        isDraggingRef.current = false
        lastPointer = null
      }
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const store = useSceneStore.getState()
      store.setTargetFov(clamp(store.targetFov + event.deltaY * WHEEL_ZOOM_SPEED, MIN_FOV, MAX_FOV))
    }

    const handleContextMenu = (event: Event) => event.preventDefault()

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [gl, perspectiveCamera])

  useFrame((_state, delta) => {
    if (!isDraggingRef.current) {
      yawRef.current += velocityRef.current.yaw * delta
      pitchRef.current = clamp(
        pitchRef.current + velocityRef.current.pitch * delta,
        -MAX_PITCH,
        MAX_PITCH,
      )

      if (reducedMotion) {
        velocityRef.current.yaw = 0
        velocityRef.current.pitch = 0
      } else {
        velocityRef.current.yaw = damp(velocityRef.current.yaw, 0, INERTIA_DAMPING, delta)
        velocityRef.current.pitch = damp(velocityRef.current.pitch, 0, INERTIA_DAMPING, delta)
        if (Math.abs(velocityRef.current.yaw) < VELOCITY_EPSILON) velocityRef.current.yaw = 0
        if (Math.abs(velocityRef.current.pitch) < VELOCITY_EPSILON) velocityRef.current.pitch = 0
      }
    }

    eulerRef.current.set(pitchRef.current, yawRef.current, 0, 'YXZ')
    perspectiveCamera.quaternion.setFromEuler(eulerRef.current)

    const { targetFov, setFov } = useSceneStore.getState()
    const nextFov = reducedMotion
      ? targetFov
      : damp(perspectiveCamera.fov, targetFov, FOV_DAMPING, delta)

    if (Math.abs(nextFov - perspectiveCamera.fov) > 1e-3) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
      setFov(nextFov)
    }
  })

  return null
}
