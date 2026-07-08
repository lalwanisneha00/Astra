/**
 * Suppresses an object's click-to-select when the click followed a
 * camera-rotate drag rather than a genuine stationary click/tap.
 *
 * The browser's native `click` event fires after any pointerdown +
 * pointerup pair on the same element, regardless of how far the pointer
 * moved in between — and since the whole sky is one `<canvas>`, every
 * drag-to-rotate gesture ends with a `click` on whatever star/object
 * happens to be under the cursor at release, which react-three-fiber
 * then reports as that object being clicked. Without this guard, every
 * drag looks indistinguishable from a deliberate click and opens
 * whatever object's info panel happens to be under the cursor when the
 * user lets go.
 *
 * `CameraController` accumulates the total pixel distance moved since
 * the last pointerdown here (via the same per-move pixel delta already
 * used for yaw/pitch, so this costs nothing extra); every object's
 * onClick handler checks `wasDrag()` first and bails out if the pointer
 * moved more than a small threshold before release.
 */
let totalDragDistance = 0

const CLICK_DRAG_THRESHOLD_PX = 6

export function resetDragDistance(): void {
  totalDragDistance = 0
}

export function addDragDistance(dx: number, dy: number): void {
  totalDragDistance += Math.hypot(dx, dy)
}

export function wasDrag(): boolean {
  return totalDragDistance > CLICK_DRAG_THRESHOLD_PX
}
