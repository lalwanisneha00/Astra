import { describe, expect, it } from 'vitest'
import {
  estimateBestViewingMonths,
  hemisphereFromDeclination,
  isZodiacConstellation,
} from './constellationFacts'

describe('isZodiacConstellation', () => {
  it('recognizes all 12 zodiac constellations', () => {
    for (const id of [
      'Ari',
      'Tau',
      'Gem',
      'Cnc',
      'Leo',
      'Vir',
      'Lib',
      'Sco',
      'Sgr',
      'Cap',
      'Aqr',
      'Psc',
    ]) {
      expect(isZodiacConstellation(id)).toBe(true)
    }
  })

  it('rejects a non-zodiac constellation', () => {
    expect(isZodiacConstellation('Ori')).toBe(false)
    expect(isZodiacConstellation('UMa')).toBe(false)
  })
})

describe('hemisphereFromDeclination', () => {
  it('classifies a clearly northern declination', () => {
    expect(hemisphereFromDeclination(60)).toBe('northern')
  })

  it('classifies a clearly southern declination', () => {
    expect(hemisphereFromDeclination(-60)).toBe('southern')
  })

  it('classifies a near-equatorial declination', () => {
    expect(hemisphereFromDeclination(0)).toBe('equatorial')
  })
})

describe('estimateBestViewingMonths', () => {
  it('returns a "Month–Month" range', () => {
    expect(estimateBestViewingMonths(84)).toMatch(/^[A-Za-z]+–[A-Za-z]+$/)
  })

  it('wraps correctly around the year boundary', () => {
    // 352deg -> 23.47h -> centerIndex round(11.73) % 12 = 0 (January) ->
    // range spans the surrounding months, December through February.
    expect(estimateBestViewingMonths(352)).toBe('December–February')
  })
})
