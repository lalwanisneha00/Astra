import { describe, expect, it } from 'vitest'
import { formatDeclination, formatRightAscension } from './format'

describe('formatRightAscension', () => {
  it('formats 0 degrees as 0h 0m 0s', () => {
    expect(formatRightAscension(0)).toBe('0h 0m 0s')
  })

  it('formats Sirius-like RA (~101.29 deg -> ~6h 45m) correctly', () => {
    expect(formatRightAscension(101.2872)).toBe('6h 45m 9s')
  })

  it('carries seconds that round up to 60 into the next minute', () => {
    // 14.99999 hours -> should not print "60s"
    const result = formatRightAscension(14.99999 * 15)
    expect(result).not.toMatch(/60s/)
  })
})

describe('formatDeclination', () => {
  it('formats a positive declination with a + sign', () => {
    expect(formatDeclination(7.4071)).toBe('+7° 24′ 26″')
  })

  it('formats a negative declination with a - sign', () => {
    expect(formatDeclination(-16.7161)).toBe('-16° 42′ 58″')
  })

  it('formats zero without a leading negative sign', () => {
    expect(formatDeclination(0)).toBe('+0° 0′ 0″')
  })
})
