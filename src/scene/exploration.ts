import { DSO_CONTENT } from '@/content/dso'
import { clamp, smoothstep01 } from '@/lib/math'
import type { DeepSkyObject } from '@/types/deepSkyObject'

/**
 * The zoom is deliberately *not* an optical telescope — zooming in
 * represents traveling progressively farther from Earth into deeper
 * space, revealing more of the universe rather than just magnifying the
 * current view. This is the one place that mapping lives, driving both
 * the star catalog's magnitude cutoff (continuous) and deep-sky
 * objects' reveal (level-based). Applies in both Explore Mode and
 * Today's Night Sky — in observer mode it composes with (rather than
 * replaces) horizon-based visibility, so the sky always shows what's
 * both real *and* revealed at the current depth.
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

// A little comfortably past the threshold itself (rather than sitting
// exactly on the edge of the fade band) for anything that flies the
// camera *to* a level, e.g. search navigation — a firm, unambiguous
// arrival rather than a value that's mathematically "revealed" but only
// just barely so.
const FOV_ARRIVAL_MARGIN_DEG = 2

/**
 * The FOV that fully reveals a given exploration level — the inverse of
 * the threshold `revealProgress` fades across, used to fly the camera
 * to a level rather than just query it. Level 1 (or below) has no
 * specific FOV requirement (always revealed), so this returns the wide
 * baseline FOV, comfortable and unremarkable to arrive at.
 */
export function fovForExplorationLevel(level: number): number {
  const threshold = fovThresholdForLevel(level)
  // LEVEL_START_FOV always has this first element; the fallback only
  // satisfies noUncheckedIndexedAccess, never actually used.
  if (threshold === null) return LEVEL_START_FOV[0] ?? 65
  return threshold - FOV_ARRIVAL_MARGIN_DEG
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

// Below this, a deep-sky object is faded in too little to be worth
// clicking or treating as "currently visible" — shared between
// DsoMarker's own click-gating and `isDsoRevealed` below, so both agree
// on exactly the same bar.
export const DSO_CLICKABLE_OPACITY = 0.1

/** Whether a deep-sky object is revealed enough, at the given FOV, to
 * count as genuinely visible right now — e.g. for deciding whether
 * search navigation needs to zoom deeper to reach it, rather than just
 * flying to a spot that's still faded out. */
export function isDsoRevealed(fov: number, dso: DeepSkyObject): boolean {
  return revealProgress(fov, dsoRevealLevel(dso)) >= DSO_CLICKABLE_OPACITY
}

// Star catalog tiers already double as a natural magnitude ladder
// (tier0 <=4, tier1 <=6.5, tier2 <=8) — nothing fainter is ever loaded
// regardless, so the cutoff simply reaches TIER2_MAG and stays there.
const TIER0_MAG = 4
const TIER1_MAG = 6.5
const TIER2_MAG = 8

// FOV bands the star magnitude cutoff ramps across — coincidentally
// close to (but distinct from) LEVEL_START_FOV's first two values, so
// kept as their own named constants rather than reusing that array.
const STAR_TIER1_FOV_START = 65
const STAR_TIER1_FOV_END = 50
const STAR_TIER2_FOV_END = 35

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
  const revealTier1 = inverseLerpClamped(STAR_TIER1_FOV_START, STAR_TIER1_FOV_END, fov)
  const revealTier2 = inverseLerpClamped(STAR_TIER1_FOV_END, STAR_TIER2_FOV_END, fov)
  const afterTier1 = lerp(TIER0_MAG, TIER1_MAG, revealTier1)
  return lerp(afterTier1, TIER2_MAG, revealTier2)
}

/** Whether a star of the given magnitude is revealed enough, at the
 * given FOV, to count as genuinely visible right now — mirrors
 * StarsLayer's own `isCulled` cutoff exactly, so search navigation's
 * idea of "visible" always agrees with what's actually clickable. */
export function isStarRevealed(fov: number, magnitude: number): boolean {
  return magnitude <= starMagnitudeCutoff(fov) + MAGNITUDE_FADE_WIDTH
}

/**
 * The FOV that reveals a star of the given magnitude clearly and
 * comfortably (past its fade band, not just at the bare threshold) —
 * the inverse of `starMagnitudeCutoff`, used to fly the camera deep
 * enough to reach a star that search navigation found isn't currently
 * revealed.
 */
export function fovForStarMagnitude(magnitude: number): number {
  const target = magnitude + MAGNITUDE_FADE_WIDTH
  if (target <= TIER0_MAG) return STAR_TIER1_FOV_START
  if (target <= TIER1_MAG) {
    const t = (target - TIER0_MAG) / (TIER1_MAG - TIER0_MAG)
    return lerp(STAR_TIER1_FOV_START, STAR_TIER1_FOV_END, t)
  }
  if (target <= TIER2_MAG) {
    const t = (target - TIER1_MAG) / (TIER2_MAG - TIER1_MAG)
    return lerp(STAR_TIER1_FOV_END, STAR_TIER2_FOV_END, t)
  }
  return STAR_TIER2_FOV_END
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
