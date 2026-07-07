import { describe, expect, it } from 'vitest'
import { clamp, degToRad, radToDeg } from './math'

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to the minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('degToRad / radToDeg', () => {
  it('converts degrees to radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI)
  })

  it('converts radians to degrees', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180)
  })

  it('round-trips a value', () => {
    expect(radToDeg(degToRad(57))).toBeCloseTo(57)
  })
})
