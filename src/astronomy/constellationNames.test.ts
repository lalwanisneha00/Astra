import { describe, expect, it } from 'vitest'
import { getConstellationName } from './constellationNames'

describe('getConstellationName', () => {
  it('resolves a known abbreviation to its full name', () => {
    expect(getConstellationName('Ori')).toBe('Orion')
    expect(getConstellationName('CMa')).toBe('Canis Major')
    expect(getConstellationName('UMa')).toBe('Ursa Major')
  })

  it('returns null for null input', () => {
    expect(getConstellationName(null)).toBeNull()
  })

  it('falls back to the raw abbreviation if unrecognized', () => {
    expect(getConstellationName('Xyz')).toBe('Xyz')
  })
})
