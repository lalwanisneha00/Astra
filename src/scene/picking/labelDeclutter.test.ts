import { describe, expect, it } from 'vitest'
import { fovScaledLabelSeparation, selectDeclutteredLabels } from './labelDeclutter'

describe('selectDeclutteredLabels', () => {
  it('keeps every candidate when none are close together', () => {
    const candidates = [
      { id: 'a', priority: 1, ra: 0, dec: 0 },
      { id: 'b', priority: 2, ra: 90, dec: 0 },
      { id: 'c', priority: 3, ra: 180, dec: 0 },
    ]
    const result = selectDeclutteredLabels(candidates, 3)
    expect(result.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('keeps the higher-priority (lower number) candidate when two collide', () => {
    const candidates = [
      { id: 'dim', priority: 5, ra: 10, dec: 10 },
      { id: 'bright', priority: 1, ra: 10.5, dec: 10 },
    ]
    const result = selectDeclutteredLabels(candidates, 3)
    expect(result.map((c) => c.id)).toEqual(['bright'])
  })

  it('does not reject two candidates that are each individually far from an accepted one but close to each other', () => {
    // Chain: a and b collide, b and c collide, but a and c do not.
    // b should be rejected (loses to a, the higher priority), and c
    // should then be accepted since it doesn't collide with a.
    const candidates = [
      { id: 'a', priority: 1, ra: 0, dec: 0 },
      { id: 'b', priority: 2, ra: 2, dec: 0 },
      { id: 'c', priority: 3, ra: 4, dec: 0 },
    ]
    const result = selectDeclutteredLabels(candidates, 3)
    expect(result.map((c) => c.id).sort()).toEqual(['a', 'c'])
  })

  it('returns an empty array for an empty input', () => {
    expect(selectDeclutteredLabels([], 3)).toEqual([])
  })

  it('keeps a single candidate regardless of threshold', () => {
    const candidates = [{ id: 'only', priority: 1, ra: 42, dec: -17 }]
    expect(selectDeclutteredLabels(candidates, 100)).toEqual(candidates)
  })
})

describe('fovScaledLabelSeparation', () => {
  it('returns the base separation at the reference FOV', () => {
    expect(fovScaledLabelSeparation(75)).toBeCloseTo(3, 5)
  })

  it('shrinks the threshold when zoomed in (narrower FOV)', () => {
    expect(fovScaledLabelSeparation(37.5)).toBeCloseTo(1.5, 5)
  })

  it('grows the threshold when zoomed out (wider FOV)', () => {
    expect(fovScaledLabelSeparation(100)).toBeGreaterThan(fovScaledLabelSeparation(75))
  })
})
