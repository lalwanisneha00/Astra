import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { damp } from '@/lib/easing'
import { clamp } from '@/lib/math'
import { prefersReducedMotion } from '@/lib/motion'
import { directionToYawPitch, shortestAngleTarget } from '@/scene/camera/orientation'
import { useSceneStore } from '@/state/useSceneStore'
import type { EquatorialCoord } from '@/types/coordinates'

const MIN_FOV = 20
const MAX_FOV = 100
const MAX_PITCH = THREE.MathUtils.degToRad(85)
const WHEEL_ZOOM_SPEED = 0.05
const FOV_DAMPING = 10
const INERTIA_DAMPING = 6
const VELOCITY_EPSILON = 0.0005
const FLY_TO_DAMPING = 4
const FLY_TO_EPSILON = 0.0005

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
 *
 * `yawRef` (horizontal rotation) is a plain unbounded accumulator — it was
 * never clamped or wrapped, so rotation was always mathematically
 * unlimited. What *did* limit it in practice: a mouse drag is tracked by
 * absolute screen position, so a continuous drag runs out of physical
 * screen to cross well before completing a full 360° turn, forcing a
 * release-and-regrab that reads as "stopping." Mouse drags now use the
 * Pointer Lock API (relative `movementX`/`movementY` deltas instead of
 * absolute position — see `handlePointerMove`), removing that screen-edge
 * limit entirely. Touch drags don't need this: repeated swipes already
 * accumulate into the same `yawRef` with no such bound, a normal mobile
 * pattern.
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

  // Eased reorientation toward useSceneStore.flyToTarget (e.g. Phase 7's
  // "look roughly south" on entering observer mode; Phase 11's search
  // fly-to will set the same field later).
  const isFlyingRef = useRef(false)
  const flyTargetYawRef = useRef(0)
  const flyTargetPitchRef = useRef(0)
  const lastFlyToTargetRef = useRef<EquatorialCoord | null>(null)

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
      isFlyingRef.current = false

      if (activePointers.size === 1) {
        isDraggingRef.current = true
        lastPointer = { x: event.clientX, y: event.clientY }
        lastMoveTime = performance.now()
        // Best-effort: if denied/unsupported, dragging still works via
        // the absolute-position fallback in handlePointerMove, just
        // bounded by the screen edge again.
        if (event.pointerType === 'mouse') {
          canvas.requestPointerLock?.()?.catch(() => {})
        }
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

      if (!isDraggingRef.current) return

      const isPointerLocked = document.pointerLockElement === canvas
      let dx: number
      let dy: number
      if (isPointerLocked) {
        // Relative deltas — unbounded by the physical screen edge, since
        // the OS cursor doesn't move at all while locked.
        dx = event.movementX
        dy = event.movementY
      } else {
        if (!lastPointer) return
        dx = event.clientX - lastPointer.x
        dy = event.clientY - lastPointer.y
      }

      const now = performance.now()
      const deltaTime = Math.max((now - lastMoveTime) / 1000, 1 / 240)
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
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock()
        }
      }
    }

    // The browser can also exit pointer lock on its own (e.g. Escape,
    // per spec) — if that happens mid-drag, end the drag cleanly rather
    // than risk a spurious jump from stale absolute coordinates once the
    // cursor reappears somewhere else on screen. The user can just
    // click-drag again to resume.
    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas && isDraggingRef.current) {
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
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock()
      }
    }
  }, [gl, perspectiveCamera])

  useFrame((_state, delta) => {
    const flyToTarget = useSceneStore.getState().flyToTarget
    if (flyToTarget && flyToTarget !== lastFlyToTargetRef.current) {
      lastFlyToTargetRef.current = flyToTarget
      const direction = equatorialToCartesian(flyToTarget)
      const { yaw: targetYaw, pitch: targetPitch } = directionToYawPitch(direction)
      flyTargetYawRef.current = shortestAngleTarget(yawRef.current, targetYaw)
      flyTargetPitchRef.current = clamp(targetPitch, -MAX_PITCH, MAX_PITCH)
      isFlyingRef.current = true
      velocityRef.current = { yaw: 0, pitch: 0 }
    }

    if (!isDraggingRef.current && isFlyingRef.current) {
      if (reducedMotion) {
        yawRef.current = flyTargetYawRef.current
        pitchRef.current = flyTargetPitchRef.current
        isFlyingRef.current = false
      } else {
        yawRef.current = damp(yawRef.current, flyTargetYawRef.current, FLY_TO_DAMPING, delta)
        pitchRef.current = damp(pitchRef.current, flyTargetPitchRef.current, FLY_TO_DAMPING, delta)
        const yawDone = Math.abs(yawRef.current - flyTargetYawRef.current) < FLY_TO_EPSILON
        const pitchDone = Math.abs(pitchRef.current - flyTargetPitchRef.current) < FLY_TO_EPSILON
        if (yawDone && pitchDone) isFlyingRef.current = false
      }
    } else if (!isDraggingRef.current) {
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
