import { describe, expect, it } from 'vitest'
import { hitsHigherPriorityObject, PICK_PRIORITY } from './interactionPriority'

function withPriority(priority: number) {
  return { userData: { pickPriority: priority } }
}

describe('hitsHigherPriorityObject', () => {
  it('is false when there are no intersections at all', () => {
    expect(hitsHigherPriorityObject([], {}, PICK_PRIORITY.star)).toBe(false)
  })

  it('is false when every intersection belongs to self (e.g. multiple star hits on the same Points object)', () => {
    const self = withPriority(PICK_PRIORITY.star)
    const intersections = [{ eventObject: self }, { eventObject: self }, { eventObject: self }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.star)).toBe(false)
  })

  it('is true when a strictly higher-priority object was also hit (star defers to a precise marker)', () => {
    const self = withPriority(PICK_PRIORITY.star)
    const precise = withPriority(PICK_PRIORITY.precise)
    const intersections = [{ eventObject: self }, { eventObject: precise }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.star)).toBe(true)
  })

  it('is true regardless of which order the intersections sort in', () => {
    const self = withPriority(PICK_PRIORITY.star)
    const precise = withPriority(PICK_PRIORITY.precise)
    const intersections = [{ eventObject: precise }, { eventObject: self }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.star)).toBe(true)
  })

  it('is false when the other object is lower priority (star does not defer to a constellation line)', () => {
    const self = withPriority(PICK_PRIORITY.star)
    const line = withPriority(PICK_PRIORITY.line)
    const intersections = [{ eventObject: self }, { eventObject: line }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.star)).toBe(false)
  })

  it('is true when a line is also hit alongside a star (line defers to the star)', () => {
    const self = withPriority(PICK_PRIORITY.line)
    const star = withPriority(PICK_PRIORITY.star)
    const intersections = [{ eventObject: self }, { eventObject: star }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.line)).toBe(true)
  })

  it('resolves a three-way hit (line, star, precise) so only the precise object proceeds', () => {
    const line = withPriority(PICK_PRIORITY.line)
    const star = withPriority(PICK_PRIORITY.star)
    const precise = withPriority(PICK_PRIORITY.precise)
    const intersections = [{ eventObject: line }, { eventObject: star }, { eventObject: precise }]

    expect(hitsHigherPriorityObject(intersections, line, PICK_PRIORITY.line)).toBe(true)
    expect(hitsHigherPriorityObject(intersections, star, PICK_PRIORITY.star)).toBe(true)
    expect(hitsHigherPriorityObject(intersections, precise, PICK_PRIORITY.precise)).toBe(false)
  })

  it('treats an object with no pickPriority tag as priority 0 (same as a line)', () => {
    const self = withPriority(PICK_PRIORITY.star)
    const untagged = {}
    const intersections = [{ eventObject: self }, { eventObject: untagged }]
    expect(hitsHigherPriorityObject(intersections, self, PICK_PRIORITY.star)).toBe(false)
  })
})
