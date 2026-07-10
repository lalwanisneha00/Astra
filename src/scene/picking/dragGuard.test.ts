import { beforeEach, describe, expect, it } from 'vitest'
import { addDragDistance, markMultiTouchGesture, resetDragDistance, wasDrag } from './dragGuard'

describe('dragGuard', () => {
  beforeEach(() => {
    resetDragDistance()
  })

  it('reports no drag immediately after a reset', () => {
    expect(wasDrag()).toBe(false)
  })

  it('does not count a tiny, click-like wobble as a drag', () => {
    addDragDistance(1, 0)
    addDragDistance(0, 1)
    expect(wasDrag()).toBe(false)
  })

  it('counts a real rotate-drag gesture as a drag', () => {
    for (let i = 0; i < 20; i++) {
      addDragDistance(10, 0)
    }
    expect(wasDrag()).toBe(true)
  })

  it('accumulates distance across many small moves, not just the single largest one', () => {
    // Each individual move is below the threshold, but a long drag made
    // of many small moves must still add up to a real drag.
    for (let i = 0; i < 10; i++) {
      addDragDistance(2, 0)
    }
    expect(wasDrag()).toBe(true)
  })

  it('resets cleanly for a new gesture after a prior drag', () => {
    addDragDistance(50, 50)
    expect(wasDrag()).toBe(true)
    resetDragDistance()
    expect(wasDrag()).toBe(false)
  })

  it('treats a marked multi-touch gesture as a drag even with zero accumulated distance', () => {
    markMultiTouchGesture()
    expect(wasDrag()).toBe(true)
  })

  it('clears the multi-touch flag on reset for the next gesture', () => {
    markMultiTouchGesture()
    expect(wasDrag()).toBe(true)
    resetDragDistance()
    expect(wasDrag()).toBe(false)
  })
})
