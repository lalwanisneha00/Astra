import { describe, expect, it } from 'vitest'
import { hexToRgb01, magnitudeToPointSize } from './useStarCatalog'

describe('magnitudeToPointSize', () => {
  it('gives brighter (lower magnitude) stars bigger points', () => {
    const brighter = magnitudeToPointSize(0)
    const dimmer = magnitudeToPointSize(6)
    expect(brighter).toBeGreaterThan(dimmer)
  })

  it('clamps to a sane size range at the extremes', () => {
    expect(magnitudeToPointSize(-10)).toBeLessThanOrEqual(6)
    expect(magnitudeToPointSize(20)).toBeGreaterThanOrEqual(0.6)
  })
})

describe('hexToRgb01', () => {
  it('parses white as (1, 1, 1)', () => {
    expect(hexToRgb01('#ffffff')).toEqual([1, 1, 1])
  })

  it('parses black as (0, 0, 0)', () => {
    expect(hexToRgb01('#000000')).toEqual([0, 0, 0])
  })

  it('parses a mid-tone channel correctly', () => {
    const [r] = hexToRgb01('#80ffff')
    expect(r).toBeCloseTo(128 / 255, 3)
  })
})
