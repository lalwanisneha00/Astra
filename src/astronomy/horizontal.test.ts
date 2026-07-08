import { describe, expect, it } from 'vitest'
import {
  equatorialToHorizontal,
  horizontalToEquatorial,
  localSiderealTimeDegrees,
} from './horizontal'

const NYC = { latitude: 40.7128, longitude: -74.006 }
const EQUATOR = { latitude: 0, longitude: 0 }
const REFERENCE_DATE = new Date('2024-06-15T22:00:00Z')

describe('localSiderealTimeDegrees', () => {
  it('stays within [0, 360)', () => {
    const lst = localSiderealTimeDegrees(REFERENCE_DATE, NYC.longitude)
    expect(lst).toBeGreaterThanOrEqual(0)
    expect(lst).toBeLessThan(360)
  })

  it('shifts by exactly the longitude difference between two observers at the same instant', () => {
    const lstAtZero = localSiderealTimeDegrees(REFERENCE_DATE, 0)
    const lstAt90East = localSiderealTimeDegrees(REFERENCE_DATE, 90)
    // Normalize the wrap so the difference is comparable.
    const diff = ((lstAt90East - lstAtZero + 540) % 360) - 180
    expect(diff).toBeCloseTo(90, 5)
  })
})

describe('equatorialToHorizontal / horizontalToEquatorial round-trip', () => {
  const cases: Array<{ ra: number; dec: number }> = [
    { ra: 0, dec: 0 },
    { ra: 45, dec: 30 },
    { ra: 101.2872, dec: -16.7161 }, // Sirius
    { ra: 279.2346, dec: 38.7837 }, // Vega
    { ra: 310, dec: -60 },
    { ra: 15, dec: 80 },
  ]

  for (const { ra, dec } of cases) {
    it(`recovers RA=${ra}, Dec=${dec} after a round trip (NYC, reference date)`, () => {
      const horizontal = equatorialToHorizontal({ ra, dec }, NYC, REFERENCE_DATE)

      // Below the horizon isn't a meaningful round-trip case for a real
      // "is this star visible" check, but the math should still be
      // self-consistent either way, so no need to skip it.
      const back = horizontalToEquatorial(horizontal, NYC, REFERENCE_DATE)

      // Compare via angular components rather than raw RA to sidestep the
      // 0/360 wraparound at low declinations near the poles.
      expect(back.dec).toBeCloseTo(dec, 3)
      const raDiff = ((back.ra - ra + 540) % 360) - 180
      expect(raDiff).toBeCloseTo(0, 2)
    })
  }
})

describe('equatorialToHorizontal known special cases', () => {
  it('places a star at the zenith when its Dec equals the observer latitude and hour angle is zero', () => {
    // At the equator, a star on the celestial equator (Dec=0) crossing
    // the meridian (H=0, i.e. RA=LST) should sit at the zenith (Alt=90).
    const lstDeg = localSiderealTimeDegrees(REFERENCE_DATE, EQUATOR.longitude)
    const horizontal = equatorialToHorizontal({ ra: lstDeg, dec: 0 }, EQUATOR, REFERENCE_DATE)
    expect(horizontal.altitude).toBeCloseTo(90, 0)
  })

  it('rises a celestial-equator star due east for a mid-latitude northern observer', () => {
    // Find the RA whose hour angle is -90deg (about to rise) at NYC.
    const lstDeg = localSiderealTimeDegrees(REFERENCE_DATE, NYC.longitude)
    const risingRa = (((lstDeg + 90) % 360) + 360) % 360
    const horizontal = equatorialToHorizontal({ ra: risingRa, dec: 0 }, NYC, REFERENCE_DATE)
    expect(horizontal.altitude).toBeCloseTo(0, 0)
    expect(horizontal.azimuth).toBeCloseTo(90, 0)
  })
})

describe('horizontalToEquatorial', () => {
  it('inverts a horizon-ring point (Alt=0) back to a sensible equatorial coordinate', () => {
    const equatorial = horizontalToEquatorial({ altitude: 0, azimuth: 180 }, NYC, REFERENCE_DATE)
    expect(equatorial.dec).toBeGreaterThanOrEqual(-90)
    expect(equatorial.dec).toBeLessThanOrEqual(90)
    expect(equatorial.ra).toBeGreaterThanOrEqual(0)
    expect(equatorial.ra).toBeLessThan(360)
  })
})
