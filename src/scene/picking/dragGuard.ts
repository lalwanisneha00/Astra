/**
 * Suppresses an object's selection when a gesture wasn't a genuine
 * stationary click/tap — either because it was a camera-rotate drag, or
 * a multi-touch (pinch) gesture whose release shouldn't select whatever
 * happens to be under either finger.
 *
 * Every selectable object's own release handler (see the module doc on
 * why that's `onPointerUp`, not `onClick`) checks `wasDrag()` first and
 * bails out if the pointer moved more than a small threshold before
 * release, or if the gesture ever became multi-touch.
 *
 * `CameraController` accumulates the total pixel distance moved since
 * the last pointerdown here (via the same per-move pixel delta already
 * used for yaw/pitch, so this costs nothing extra), and marks a gesture
 * as multi-touch the moment a second pointer joins.
 */
let totalDragDistance = 0
let multiTouchGesture = false

const CLICK_DRAG_THRESHOLD_PX = 6

export function resetDragDistance(): void {
  totalDragDistance = 0
  multiTouchGesture = false
}

export function addDragDistance(dx: number, dy: number): void {
  totalDragDistance += Math.hypot(dx, dy)
}

/** Marks the current gesture as multi-touch (a pinch) — its eventual
 * release(s) must never be treated as a selection tap, even though a
 * pinch alone doesn't accumulate the single-pointer rotate distance
 * `addDragDistance` tracks. */
export function markMultiTouchGesture(): void {
  multiTouchGesture = true
}

export function wasDrag(): boolean {
  return totalDragDistance > CLICK_DRAG_THRESHOLD_PX || multiTouchGesture
}
