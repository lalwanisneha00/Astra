import { describe, expect, it } from 'vitest'
import { equatorialToCartesian } from './coordinates'

describe('equatorialToCartesian', () => {
  it('places RA=0, Dec=0 along +X', () => {
    const [x, y, z] = equatorialToCartesian({ ra: 0, dec: 0 })
    expect(x).toBeCloseTo(1)
    expect(y).toBeCloseTo(0)
    expect(z).toBeCloseTo(0)
  })

  it('places Dec=90 at the +Y pole regardless of RA', () => {
    const [x1, y1, z1] = equatorialToCartesian({ ra: 0, dec: 90 })
    const [x2, y2, z2] = equatorialToCartesian({ ra: 200, dec: 90 })
    expect(y1).toBeCloseTo(1)
    expect(x1).toBeCloseTo(0)
    expect(z1).toBeCloseTo(0)
    expect(y2).toBeCloseTo(1)
    expect(x2).toBeCloseTo(0)
    expect(z2).toBeCloseTo(0)
  })

  it('always returns a unit vector', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [45, 30],
      [123.4, -56.7],
      [359, -89],
      [270, 45],
    ]

    for (const [ra, dec] of cases) {
      const [x, y, z] = equatorialToCartesian({ ra, dec })
      const length = Math.sqrt(x * x + y * y + z * z)
      expect(length).toBeCloseTo(1)
    }
  })

  it('keeps antipodal RA values on opposite sides', () => {
    const [x1, , z1] = equatorialToCartesian({ ra: 0, dec: 0 })
    const [x2, , z2] = equatorialToCartesian({ ra: 180, dec: 0 })
    expect(x2).toBeCloseTo(-x1)
    expect(z2).toBeCloseTo(-z1)
  })
})
