export type SheetSnap = 'expanded' | 'peek'

export interface SheetSnapResult {
  snap: SheetSnap
  dismiss: boolean
}

/** A flick this fast (px/s) wins outright over wherever the sheet
 * happened to be released, matching native map-app bottom sheets. */
const FLICK_VELOCITY = 800

/**
 * Decides where a dragged mobile info sheet should come to rest:
 * dismissed off the bottom of the screen, snapped to its initial
 * "peek" height, or snapped to its near-full-screen "expanded" height.
 *
 * `currentY` and the two reference points are all in the same
 * coordinate space used by the sheet's own drag transform: `0` is
 * fully expanded (its top edge at the safe area below the header),
 * `maxY` is fully off-screen (dragged down by its own full height).
 * `peekY` sits between them, at the sheet's initial resting position.
 *
 * A fast flick decides the outcome regardless of release position
 * (flinging down anywhere dismisses; flinging up anywhere expands);
 * otherwise a slow drag settles by proximity — past 40% of the way
 * from peek toward fully hidden dismisses, past halfway from peek
 * toward expanded expands, otherwise it springs back to peek.
 */
export function resolveSheetSnap(
  currentY: number,
  velocityY: number,
  peekY: number,
  maxY: number,
): SheetSnapResult {
  if (velocityY > FLICK_VELOCITY) return { snap: 'peek', dismiss: true }
  if (velocityY < -FLICK_VELOCITY) return { snap: 'expanded', dismiss: false }

  const dismissThreshold = peekY + (maxY - peekY) * 0.4
  if (currentY > dismissThreshold) return { snap: 'peek', dismiss: true }

  const expandThreshold = peekY * 0.5
  if (currentY < expandThreshold) return { snap: 'expanded', dismiss: false }

  return { snap: 'peek', dismiss: false }
}
