import { describe, expect, it } from 'vitest'
import { fovScaledPointThreshold } from './pointThreshold'

describe('fovScaledPointThreshold', () => {
  it('returns the base threshold when FOV matches the baseline', () => {
    expect(fovScaledPointThreshold(75, 2, 75)).toBeCloseTo(2)
  })

  it('shrinks the threshold when zoomed in (lower FOV)', () => {
    expect(fovScaledPointThreshold(20, 2, 75)).toBeLessThan(2)
  })

  it('grows the threshold when zoomed out (higher FOV)', () => {
    expect(fovScaledPointThreshold(100, 2, 75)).toBeGreaterThan(2)
  })

  it('scales linearly with FOV', () => {
    const half = fovScaledPointThreshold(37.5, 2, 75)
    expect(half).toBeCloseTo(1)
  })
})
