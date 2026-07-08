import { DSO_CONTENT } from '@/content/dso'
import { clamp, smoothstep01 } from '@/lib/math'
import type { DeepSkyObject } from '@/types/deepSkyObject'

/**
 * Explore Mode's zoom is deliberately *not* an optical telescope — per
 * the spec, zooming in represents traveling progressively farther from
 * Earth into deeper space, revealing more of the universe rather than
 * just magnifying the current view. This is the one place that mapping
 * lives, driving both the star catalog's magnitude cutoff (continuous)
 * and deep-sky objects' reveal (level-based). Only applies in explore
 * mode — Today's Night Sky (observer mode) keeps its existing
 * horizon-based visibility untouched, per the spec's explicit "separate
 * from Today's Night Sky."
 */

export const EXPLORATION_LEVEL_COUNT = 6

// FOV (degrees) at which levels 2-6 begin, as FOV decreases while
// zooming in from the default/baseline view (INITIAL_FOV=75, well
// within level 1). Level 1 is the naked-eye baseline and covers
// everything from here up through the widest FOV (MAX_FOV=100).
const LEVEL_START_FOV = [65, 50, 40, 30, 22]

const FADE_BAND_FOV = 12

/** Must match the `fadeWidth` literal in starField.vert.glsl — GLSL has
 * no way to import this, so the shader hardcodes the same value with a
 * comment pointing back here. Used on the TS side to decide whether a
 * star is revealed enough to still be clickable/hoverable (see
 * StarsLayer's `isRevealed`). */
export const MAGNITUDE_FADE_WIDTH = 0.5

/** Maps the camera's current FOV to a discrete exploration depth level
 * (1-6) — used for deep-sky object staging (see `dsoRevealLevel`). */
export function getExplorationLevel(fov: number): number {
  let level = 1
  for (const threshold of LEVEL_START_FOV) {
    if (fov < threshold) level++
  }
  return level
}

function fovThresholdForLevel(level: number): number | null {
  if (level <= 1) return null
  return LEVEL_START_FOV[level - 2] ?? null
}

/**
 * 0 = fully hidden, 1 = fully revealed, ramping smoothly across
 * `FADE_BAND_FOV` degrees rather than popping instantly at the
 * threshold. A `revealLevel` of 1 (or less) is always fully revealed —
 * the naked-eye baseline.
 */
export function revealProgress(fov: number, revealLevel: number): number {
  const threshold = fovThresholdForLevel(revealLevel)
  if (threshold === null) return 1
  const t = (threshold + FADE_BAND_FOV - fov) / FADE_BAND_FOV
  return smoothstep01(t)
}

// Star catalog tiers already double as a natural magnitude ladder
// (tier0 <=4, tier1 <=6.5, tier2 <=8) — nothing fainter is ever loaded
// regardless, so the cutoff simply reaches TIER2_MAG and stays there.
const TIER0_MAG = 4
const TIER1_MAG = 6.5
const TIER2_MAG = 8

function inverseLerpClamped(edgeHigh: number, edgeLow: number, x: number): number {
  return clamp((edgeHigh - x) / (edgeHigh - edgeLow), 0, 1)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * The faintest star magnitude currently revealed, as a continuous
 * function of FOV — smoother than routing stars through the same
 * discrete level ladder DSOs use, since there's real magnitude data to
 * interpolate across rather than a handful of categories.
 */
export function starMagnitudeCutoff(fov: number): number {
  const revealTier1 = inverseLerpClamped(65, 50, fov)
  const revealTier2 = inverseLerpClamped(50, 35, fov)
  const afterTier1 = lerp(TIER0_MAG, TIER1_MAG, revealTier1)
  return lerp(afterTier1, TIER2_MAG, revealTier2)
}

/**
 * Which exploration level a deep-sky object reveals at. A handful of
 * major, bright, well-known objects (curated content or a Messier
 * number, and bright enough to plausibly spot with the naked eye) are
 * part of the Level-1 baseline itself, per the spec's "a small number
 * of major naked-eye deep-sky objects" — everything else is staged by
 * type: clusters first (Level 2, "additional star clusters"), nebulae
 * next (Level 4, "brighter nebulae"), galaxies last (Level 5, "major
 * galaxies").
 */
export function dsoRevealLevel(dso: DeepSkyObject): number {
  const isMajor = dso.messier !== null || dso.id in DSO_CONTENT
  if (isMajor && (dso.magnitude ?? 99) <= 6) return 1

  switch (dso.type) {
    case 'OCl':
    case 'GCl':
    case 'Cl+N':
      return 2
    case 'Neb':
    case 'HII':
    case 'RfN':
    case 'PN':
    case 'SNR':
      return 4
    case 'G':
      return 5
    default:
      return 3
  }
}
