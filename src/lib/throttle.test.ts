import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from './throttle'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes immediately on the first call (leading edge)', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('drops calls that arrive within the window, but fires the last one on the trailing edge', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled(1)
    throttled(2)
    throttled(3)
    expect(fn).toHaveBeenCalledTimes(1) // only the leading call so far

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3) // the *last* pending call, not the first
  })

  it('allows a new leading call once the window has fully elapsed with no pending calls', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled(1)
    vi.advanceTimersByTime(150)
    expect(fn).toHaveBeenCalledTimes(1)

    throttled(2)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(2)
  })

  it('never fires more often than the wait interval under sustained rapid calls', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    for (let i = 0; i < 50; i++) {
      throttled(i)
      vi.advanceTimersByTime(10)
    }
    vi.advanceTimersByTime(100)

    // ~500ms of calls at a 100ms window is at most ~6 invocations, never 50.
    expect(fn.mock.calls.length).toBeLessThan(10)
  })
})
