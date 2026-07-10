import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { damp } from '@/lib/easing'
import { clamp } from '@/lib/math'
import { prefersReducedMotion } from '@/lib/motion'
import { directionToYawPitch, shortestAngleTarget } from '@/scene/camera/orientation'
import { stepZoomTarget } from '@/scene/camera/zoom'
import { MAX_FOV, MIN_FOV } from '@/scene/constants'
import {
  addDragDistance,
  markMultiTouchGesture,
  resetDragDistance,
} from '@/scene/picking/dragGuard'
import { useSceneStore } from '@/state/useSceneStore'
import type { EquatorialCoord } from '@/types/coordinates'

const MAX_PITCH = THREE.MathUtils.degToRad(85)
const FOV_DAMPING = 10
const INERTIA_DAMPING = 6
const VELOCITY_EPSILON = 0.0005
const FLY_TO_DAMPING = 4
const FLY_TO_EPSILON = 0.0005

// Zoom target now advances in log-FOV space (see zoom.ts) driven by a
// velocity — degrees-per-second-equivalent, but expressed as log-FOV
// units per second — rather than jumping straight to a new target on
// every wheel tick. This is what turns zoom from a series of discrete
// optical steps into what reads as continuous travel: a flick keeps
// coasting and decaying smoothly (same "momentum" feel `INERTIA_DAMPING`
// already gives rotation), and the same relative step size applies
// whether the camera is near the wide baseline or deep in the
// exploration levels.
const WHEEL_ZOOM_IMPULSE = 0.0032
const ZOOM_INERTIA_DAMPING = 5
const ZOOM_VELOCITY_EPSILON = 0.0005
// How many degrees of FOV before either hard limit the zoom starts
// visibly slowing — turns "hits a wall" into "arrives and settles."
const ZOOM_EDGE_BAND_DEG = 12

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

  // Zoom velocity, in log-FOV units per second — see the WHEEL_ZOOM_IMPULSE
  // comment above and zoom.ts. Wheel ticks add an impulse; pinch sets it
  // directly from the gesture's instantaneous rate; both decay through the
  // same momentum curve every frame.
  const zoomVelocityRef = useRef(0)

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
    let lastPinchTime = 0

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
        // Fresh gesture: any accumulated distance (or multi-touch flag)
        // from a prior gesture no longer applies (see dragGuard.ts —
        // this is what tells every object's release handler whether the
        // eventual release was a real tap or the tail end of a drag).
        resetDragDistance()
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
        lastPinchTime = performance.now()
        zoomVelocityRef.current = 0
        // A pinch's eventual release(s) must never be read as a
        // selection tap on whatever's under either finger — see
        // dragGuard.ts.
        markMultiTouchGesture()
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
            // Fingers spreading (ratio > 1) means zooming in, i.e.
            // decreasing FOV — negative velocity, matching
            // stepZoomTarget's log-FOV convention. Setting (not adding
            // to) velocity here keeps the gesture directly, precisely
            // tracking finger movement while it's active; only after
            // release does this last value coast and decay like a wheel
            // flick's momentum (see the useFrame loop below).
            const now = performance.now()
            const dt = Math.max((now - lastPinchTime) / 1000, 1 / 240)
            const ratio = distance / pinchLastDistance
            zoomVelocityRef.current = -Math.log(ratio) / dt
            lastPinchTime = now
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

      addDragDistance(dx, dy)

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
      if (reducedMotion) {
        // No coast to animate through: apply the impulse's total
        // eventual effect (impulse / damping-rate is the same integral
        // the velocity system below would otherwise settle to) in one
        // step, via the same stepZoomTarget curve so the edge-softening
        // behavior stays identical either way.
        const store = useSceneStore.getState()
        const totalLogFovChange = (event.deltaY * WHEEL_ZOOM_IMPULSE) / ZOOM_INERTIA_DAMPING
        store.setTargetFov(
          stepZoomTarget(
            store.targetFov,
            totalLogFovChange,
            1,
            MIN_FOV,
            MAX_FOV,
            ZOOM_EDGE_BAND_DEG,
          ),
        )
        return
      }
      // An impulse, not a direct target jump: rapid scrolling
      // accumulates velocity (a natural "accelerating" feel) and a
      // single flick coasts to a stop afterward instead of halting the
      // instant the wheel stops moving — see the useFrame loop below.
      zoomVelocityRef.current += event.deltaY * WHEEL_ZOOM_IMPULSE
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
  }, [gl, perspectiveCamera, reducedMotion])

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

    const sceneStore = useSceneStore.getState()
    let targetFov = sceneStore.targetFov

    // Zoom momentum: velocity advances the target in log-FOV space (see
    // zoom.ts) every frame, then decays — the same coast-and-settle
    // feel INERTIA_DAMPING already gives rotation, applied here so
    // zooming reads as continuous travel rather than discrete optical
    // steps.
    if (zoomVelocityRef.current !== 0) {
      targetFov = stepZoomTarget(
        targetFov,
        zoomVelocityRef.current,
        delta,
        MIN_FOV,
        MAX_FOV,
        ZOOM_EDGE_BAND_DEG,
      )
      sceneStore.setTargetFov(targetFov)
    }

    if (reducedMotion) {
      zoomVelocityRef.current = 0
    } else {
      zoomVelocityRef.current = damp(zoomVelocityRef.current, 0, ZOOM_INERTIA_DAMPING, delta)
      if (Math.abs(zoomVelocityRef.current) < ZOOM_VELOCITY_EPSILON) zoomVelocityRef.current = 0
    }

    const nextFov = reducedMotion
      ? targetFov
      : damp(perspectiveCamera.fov, targetFov, FOV_DAMPING, delta)

    if (Math.abs(nextFov - perspectiveCamera.fov) > 1e-3) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
      sceneStore.setFov(nextFov)
    }
  })

  return null
}
