import { describe, expect, it } from 'vitest'
import { resolveSheetSnap } from './bottomSheetSnap'

const PEEK_Y = 400
const MAX_Y = 700

describe('resolveSheetSnap', () => {
  it('stays at peek when released near its starting position with no velocity', () => {
    expect(resolveSheetSnap(PEEK_Y, 0, PEEK_Y, MAX_Y)).toEqual({ snap: 'peek', dismiss: false })
  })

  it('expands when dragged well above peek toward fully expanded', () => {
    const currentY = PEEK_Y * 0.4
    expect(resolveSheetSnap(currentY, 0, PEEK_Y, MAX_Y)).toEqual({
      snap: 'expanded',
      dismiss: false,
    })
  })

  it('dismisses when dragged well below peek toward fully hidden', () => {
    const currentY = PEEK_Y + (MAX_Y - PEEK_Y) * 0.8
    expect(resolveSheetSnap(currentY, 0, PEEK_Y, MAX_Y)).toEqual({ snap: 'peek', dismiss: true })
  })

  it('a fast downward flick dismisses regardless of release position', () => {
    // Released right at the expanded position, which alone would expand -
    // but the flick velocity should override that.
    expect(resolveSheetSnap(0, 1000, PEEK_Y, MAX_Y)).toEqual({ snap: 'peek', dismiss: true })
  })

  it('a fast upward flick expands regardless of release position', () => {
    // Released right at the dismiss threshold, which alone would dismiss -
    // but the flick velocity should override that.
    const currentY = MAX_Y
    expect(resolveSheetSnap(currentY, -1000, PEEK_Y, MAX_Y)).toEqual({
      snap: 'expanded',
      dismiss: false,
    })
  })

  it('a small drag that stays between the two thresholds springs back to peek', () => {
    const currentY = PEEK_Y + 10
    expect(resolveSheetSnap(currentY, 0, PEEK_Y, MAX_Y)).toEqual({ snap: 'peek', dismiss: false })
  })

  it('a slow drag just past the dismiss threshold dismisses', () => {
    const dismissThreshold = PEEK_Y + (MAX_Y - PEEK_Y) * 0.4
    expect(resolveSheetSnap(dismissThreshold + 1, 0, PEEK_Y, MAX_Y)).toEqual({
      snap: 'peek',
      dismiss: true,
    })
  })

  it('a slow drag just past the expand threshold expands', () => {
    const expandThreshold = PEEK_Y * 0.5
    expect(resolveSheetSnap(expandThreshold - 1, 0, PEEK_Y, MAX_Y)).toEqual({
      snap: 'expanded',
      dismiss: false,
    })
  })
})
