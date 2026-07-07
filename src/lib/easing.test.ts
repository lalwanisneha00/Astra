import { describe, expect, it } from 'vitest'
import { damp } from './easing'

describe('damp', () => {
  it('moves toward the target without overshooting', () => {
    const result = damp(0, 10, 5, 0.1)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10)
  })

  it('gets arbitrarily close to the target given enough time', () => {
    let value = 0
    for (let i = 0; i < 200; i++) {
      value = damp(value, 10, 5, 1 / 60)
    }
    expect(value).toBeCloseTo(10, 2)
  })

  it('returns the current value unchanged when already at the target', () => {
    expect(damp(5, 5, 5, 0.5)).toBeCloseTo(5)
  })

  it('produces the same end state regardless of step size (frame-rate independence)', () => {
    let coarse = 0
    for (let i = 0; i < 30; i++) {
      coarse = damp(coarse, 10, 5, 1 / 30)
    }

    let fine = 0
    for (let i = 0; i < 60; i++) {
      fine = damp(fine, 10, 5, 1 / 60)
    }

    expect(coarse).toBeCloseTo(fine, 5)
  })
})
