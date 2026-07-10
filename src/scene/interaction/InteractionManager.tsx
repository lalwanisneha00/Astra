import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { wasDrag } from '@/scene/picking/dragGuard'
import { fovScaledPointThreshold } from '@/scene/picking/pointThreshold'
import { useInteractionStore } from '@/state/useInteractionStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import { pickNearest, type PickCandidate } from './pick'
import { getPickableEntry, getPickableObjects } from './pickableRegistry'

// Same base/reference values StarsLayer and ConstellationLayer used to
// tune their own raycaster thresholds before this rebuild — kept here
// since threshold tuning is a picking concern, not a rendering one.
const BASE_POINT_THRESHOLD = 2
const BASE_LINE_THRESHOLD = 4
const BASE_FOV = 75

/**
 * Owns hover detection, object picking, click handling, and opening the
 * information panel (via `useSelectionStore.select`) — the *only* place
 * any of that logic lives. Every selectable render layer (stars,
 * constellations, DSOs, planets, Sun, Moon) only ever *declares* itself
 * pick-able (see usePickable.ts) and *reads* the resulting hover/
 * selection state to drive its own visual feedback; none of them do
 * their own hit-testing.
 *
 * Deliberately independent of the camera/zoom system, the rendering
 * layers, and search:
 * - Owns its own `Raycaster` instance and native pointer listeners, and
 *   never reads or writes any camera-rotation/zoom state.
 * - The *only* thing it shares with the drag system is a read-only call
 *   to `wasDrag()` — it never feeds anything back into how dragging
 *   itself is detected (that logic is untouched, in
 *   `scene/picking/dragGuard.ts` and `CameraController.tsx`).
 * - Renders nothing and takes no props: every candidate object is
 *   discovered through the registry render layers populate themselves,
 *   not threaded through this component.
 *
 * Picks the true nearest object under the cursor by comparing each
 * raycast hit's *true angular separation from the ray* (see pick.ts's
 * module doc) rather than trusting each hit-testing technique's own
 * (sometimes approximate) reported distance — this is what makes
 * picking reliable across stars, constellation lines, and precise mesh
 * markers without any bespoke per-type priority rules.
 */
export function InteractionManager() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2(0, 0)

    function updatePointerFromEvent(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    function pickAtCurrentPointer(): PickCandidate | null {
      const perspectiveCamera = camera as THREE.PerspectiveCamera
      raycaster.params.Points = {
        threshold: fovScaledPointThreshold(perspectiveCamera.fov, BASE_POINT_THRESHOLD, BASE_FOV),
      }
      raycaster.params.Line = {
        threshold: fovScaledPointThreshold(perspectiveCamera.fov, BASE_LINE_THRESHOLD, BASE_FOV),
      }
      raycaster.setFromCamera(pointerNdc, perspectiveCamera)

      const hits = raycaster.intersectObjects(getPickableObjects(), false)
      const candidates: PickCandidate[] = []
      for (const hit of hits) {
        const entry = getPickableEntry(hit.object)
        if (!entry) continue
        const resolved = entry.resolve(hit.index, hit.point)
        if (!resolved) continue
        candidates.push({
          type: entry.type,
          id: resolved.id,
          direction: resolved.direction,
          index: resolved.index,
        })
      }

      return pickNearest(raycaster.ray.direction, candidates)
    }

    function handlePointerMove(event: PointerEvent) {
      updatePointerFromEvent(event)
      const picked = pickAtCurrentPointer()
      useInteractionStore
        .getState()
        .setHovered(picked ? { type: picked.type, id: picked.id, index: picked.index } : null)
    }

    function handlePointerLeave() {
      useInteractionStore.getState().setHovered(null)
    }

    // A release, not a native `click`: react-three-fiber's own `onClick`
    // (which this app no longer relies on for picking at all) only fires
    // if the object was *also* hit at the preceding `pointerdown` — but
    // this app's camera keeps easing (zoom momentum, fly-to) between
    // pointerdown and any later click-equivalent event, so a fresh
    // raycast can legitimately land on a different object a frame or
    // two later even with no real pointer movement. `pointerup` has no
    // such restriction — it always reflects the current raycast at the
    // exact moment of release.
    function handlePointerUp(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      // The only coupling to the drag system: a read-only query of
      // whether *this* gesture (per the untouched drag/threshold logic
      // in dragGuard.ts) turned out to be a drag. If dragging began,
      // there is no pending click to cancel — one was simply never
      // registered, since this handler only ever acts on release.
      if (wasDrag()) return
      updatePointerFromEvent(event)
      const picked = pickAtCurrentPointer()
      if (picked) useSelectionStore.getState().select({ type: picked.type, id: picked.id })
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('pointerup', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }, [camera, gl])

  return null
}
