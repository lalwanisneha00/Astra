import { describe, expect, it } from 'vitest'
import {
  dsoRevealLevel,
  fovForExplorationLevel,
  fovForStarMagnitude,
  getExplorationLevel,
  isDsoRevealed,
  isStarRevealed,
  revealProgress,
  starMagnitudeCutoff,
} from './exploration'
import type { DeepSkyObject } from '@/types/deepSkyObject'

function makeDso(overrides: Partial<DeepSkyObject>): DeepSkyObject {
  return {
    id: 'NGC9999',
    type: 'G',
    equatorial: { ra: 0, dec: 0 },
    constellation: null,
    magnitude: 10,
    sizeArcmin: null,
    messier: null,
    commonNames: [],
    ...overrides,
  }
}

describe('getExplorationLevel', () => {
  it('is level 1 at and above the widest baseline FOV', () => {
    expect(getExplorationLevel(100)).toBe(1)
    expect(getExplorationLevel(75)).toBe(1)
    expect(getExplorationLevel(65)).toBe(1)
  })

  it('increases as FOV narrows past each threshold', () => {
    expect(getExplorationLevel(64)).toBe(2)
    expect(getExplorationLevel(49)).toBe(3)
    expect(getExplorationLevel(39)).toBe(4)
    expect(getExplorationLevel(29)).toBe(5)
    expect(getExplorationLevel(21)).toBe(6)
  })

  it('never exceeds the max level even at the narrowest FOV', () => {
    expect(getExplorationLevel(1)).toBe(6)
  })
})

describe('revealProgress', () => {
  it('is always fully revealed for level 1 regardless of FOV', () => {
    expect(revealProgress(100, 1)).toBe(1)
    expect(revealProgress(20, 1)).toBe(1)
    expect(revealProgress(20, 0)).toBe(1)
  })

  it("is fully hidden well above a level's threshold", () => {
    expect(revealProgress(100, 2)).toBe(0)
  })

  it("is fully revealed at or below a level's threshold", () => {
    expect(revealProgress(65, 2)).toBe(1)
    expect(revealProgress(30, 2)).toBe(1)
  })

  it('ramps smoothly (monotonically) through the fade band, not abruptly', () => {
    const samples = [76, 74, 71, 68, 65].map((fov) => revealProgress(fov, 2))
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!)
    }
    expect(samples[0]).toBeGreaterThan(0)
    expect(samples[0]).toBeLessThan(1)
  })
})

describe('starMagnitudeCutoff', () => {
  it('only reveals the brightest tier at the default baseline FOV', () => {
    expect(starMagnitudeCutoff(75)).toBeCloseTo(4, 5)
    expect(starMagnitudeCutoff(65)).toBeCloseTo(4, 5)
  })

  it('reaches the second tier boundary at fov=50', () => {
    expect(starMagnitudeCutoff(50)).toBeCloseTo(6.5, 5)
  })

  it('reaches and holds the faintest catalog magnitude once zoomed in enough', () => {
    expect(starMagnitudeCutoff(35)).toBeCloseTo(8, 5)
    expect(starMagnitudeCutoff(20)).toBeCloseTo(8, 5)
  })

  it('is monotonically non-decreasing as FOV narrows (never reveals fewer stars when zooming in)', () => {
    const fovs = [100, 90, 75, 65, 55, 50, 42, 35, 25, 20]
    const cutoffs = fovs.map(starMagnitudeCutoff)
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i]).toBeGreaterThanOrEqual(cutoffs[i - 1]! - 1e-9)
    }
  })
})

describe('fovForExplorationLevel', () => {
  it('returns the wide baseline FOV for level 1', () => {
    expect(fovForExplorationLevel(1)).toBeGreaterThanOrEqual(65)
  })

  it('returns a FOV that fully reveals the requested level', () => {
    for (const level of [2, 3, 4, 5, 6]) {
      const fov = fovForExplorationLevel(level)
      expect(revealProgress(fov, level)).toBe(1)
    }
  })

  it('returns progressively narrower FOVs for deeper levels', () => {
    const fovs = [1, 2, 3, 4, 5, 6].map(fovForExplorationLevel)
    for (let i = 1; i < fovs.length; i++) {
      expect(fovs[i]).toBeLessThan(fovs[i - 1]!)
    }
  })
})

describe('isDsoRevealed', () => {
  it('is true for a level-1 object at any FOV', () => {
    const andromeda = makeDso({ id: 'NGC0224', messier: 'M31', magnitude: 3.44, type: 'G' })
    expect(isDsoRevealed(100, andromeda)).toBe(true)
    expect(isDsoRevealed(20, andromeda)).toBe(true)
  })

  it('is false for a deep-level object at the wide baseline FOV', () => {
    const galaxy = makeDso({ type: 'G', magnitude: 12 })
    expect(isDsoRevealed(90, galaxy)).toBe(false)
  })

  it('is true once zoomed to the FOV fovForExplorationLevel recommends', () => {
    const galaxy = makeDso({ type: 'G', magnitude: 12 })
    const requiredFov = fovForExplorationLevel(dsoRevealLevel(galaxy))
    expect(isDsoRevealed(requiredFov, galaxy)).toBe(true)
  })
})

describe('fovForStarMagnitude', () => {
  it('returns the wide baseline FOV for a bright, always-visible star', () => {
    expect(fovForStarMagnitude(1)).toBeGreaterThanOrEqual(65)
  })

  it('returns a narrower FOV for fainter stars', () => {
    const brightStarFov = fovForStarMagnitude(3)
    const faintStarFov = fovForStarMagnitude(7)
    const veryFaintStarFov = fovForStarMagnitude(8)
    expect(faintStarFov).toBeLessThan(brightStarFov)
    expect(veryFaintStarFov).toBeLessThan(faintStarFov)
  })

  it('returns a FOV that actually reveals the star', () => {
    for (const magnitude of [2, 5, 6.5, 7.5, 8]) {
      const fov = fovForStarMagnitude(magnitude)
      expect(isStarRevealed(fov, magnitude)).toBe(true)
    }
  })

  it('never returns a FOV narrower than the deepest star tier needs', () => {
    expect(fovForStarMagnitude(20)).toBeGreaterThanOrEqual(35)
  })
})

describe('isStarRevealed', () => {
  it('is true for a bright star at any FOV', () => {
    expect(isStarRevealed(100, 2)).toBe(true)
    expect(isStarRevealed(20, 2)).toBe(true)
  })

  it('is false for a faint star at the wide baseline FOV', () => {
    expect(isStarRevealed(90, 7.5)).toBe(false)
  })

  it('agrees with starMagnitudeCutoff plus the fade width', () => {
    expect(isStarRevealed(50, 6.5)).toBe(true)
    expect(isStarRevealed(50, 7.5)).toBe(false)
  })
})

describe('dsoRevealLevel', () => {
  it('puts bright, well-known Messier objects at level 1 (the naked-eye baseline)', () => {
    // NGC0224 is Andromeda -- both a Messier object and in DSO_CONTENT.
    const andromeda = makeDso({ id: 'NGC0224', messier: 'M31', magnitude: 3.44, type: 'G' })
    expect(dsoRevealLevel(andromeda)).toBe(1)
  })

  it('does not grant level 1 to a dim Messier object', () => {
    const dimMessier = makeDso({ messier: 'M999', magnitude: 9, type: 'G' })
    expect(dsoRevealLevel(dimMessier)).toBeGreaterThan(1)
  })

  it('stages clusters earlier than nebulae, and nebulae earlier than galaxies', () => {
    const cluster = makeDso({ type: 'OCl', magnitude: 9 })
    const nebula = makeDso({ type: 'Neb', magnitude: 9 })
    const galaxy = makeDso({ type: 'G', magnitude: 9 })
    expect(dsoRevealLevel(cluster)).toBeLessThan(dsoRevealLevel(nebula))
    expect(dsoRevealLevel(nebula)).toBeLessThan(dsoRevealLevel(galaxy))
  })
})
