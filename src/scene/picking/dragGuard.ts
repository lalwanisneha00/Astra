/**
 * Suppresses an object's selection when a gesture wasn't a genuine
 * stationary click/tap — either because it was a camera-rotate drag, or
 * a multi-touch (pinch) gesture whose release shouldn't select whatever
 * happens to be under either finger.
 *
 * Every selectable object's own release handler (see the module doc on
 * why that's `onPointerUp`, not `onClick`) checks `wasDrag()` first and
 * bails out if the pointer's *net* displacement since the last
 * pointerdown exceeds a small threshold, or if the gesture ever became
 * multi-touch.
 *
 * Tracked as the vector sum of every per-move delta (`netDx`/`netDy`),
 * not the sum of each delta's own magnitude — that distinction matters:
 * a click's incidental hand-tremor/touchpad jitter produces several tiny
 * moves in alternating directions that *cancel out* in a net-displacement
 * vector sum, but would wrongly add up past the threshold if each step's
 * magnitude were summed independently regardless of direction. A real
 * drag's deltas consistently point the same general way and still
 * accumulate correctly either way — only jitter is affected, which is
 * exactly the "record the down position, only start dragging once the
 * pointer has *clearly* moved away from it" behavior a click/drag
 * distinction should have.
 *
 * `CameraController` accumulates these deltas here (the same per-move
 * pixel delta it already computes for yaw/pitch, so this costs nothing
 * extra), and marks a gesture as multi-touch the moment a second pointer
 * joins.
 */
let netDx = 0
let netDy = 0
let multiTouchGesture = false

const CLICK_DRAG_THRESHOLD_PX = 6

export function resetDragDistance(): void {
  netDx = 0
  netDy = 0
  multiTouchGesture = false
}

export function addDragDistance(dx: number, dy: number): void {
  netDx += dx
  netDy += dy
}

/** Marks the current gesture as multi-touch (a pinch) — its eventual
 * release(s) must never be treated as a selection tap, even though a
 * pinch alone doesn't accumulate the single-pointer rotate distance
 * `addDragDistance` tracks. */
export function markMultiTouchGesture(): void {
  multiTouchGesture = true
}

export function wasDrag(): boolean {
  return Math.hypot(netDx, netDy) > CLICK_DRAG_THRESHOLD_PX || multiTouchGesture
}
