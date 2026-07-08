import { describe, expect, it } from 'vitest'
import { hitsAnotherObject } from './interactionPriority'

describe('hitsAnotherObject', () => {
  it('is false when there are no intersections at all', () => {
    expect(hitsAnotherObject([], {})).toBe(false)
  })

  it('is false when every intersection belongs to self (e.g. multiple star hits on the same Points object)', () => {
    const self = {}
    const intersections = [{ eventObject: self }, { eventObject: self }, { eventObject: self }]
    expect(hitsAnotherObject(intersections, self)).toBe(false)
  })

  it('is true when a different object was also hit', () => {
    const self = {}
    const other = {}
    const intersections = [{ eventObject: self }, { eventObject: other }]
    expect(hitsAnotherObject(intersections, self)).toBe(true)
  })

  it('is true even when the other object sorts first (nearer) in the intersections list', () => {
    const self = {}
    const other = {}
    const intersections = [{ eventObject: other }, { eventObject: self }]
    expect(hitsAnotherObject(intersections, self)).toBe(true)
  })
})
