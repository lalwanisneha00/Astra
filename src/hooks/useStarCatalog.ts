import { useEffect, useState } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { loadStarTier, type StarTierData, type StarTierName } from '@/data/loaders/starLoader'
import { clamp } from '@/lib/math'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useDataStore } from '@/state/useDataStore'
import type { Star } from '@/types/star'

const TIER_ORDER: StarTierName[] = ['tier0', 'tier1', 'tier2']

const MIN_POINT_SIZE = 0.6
const MAX_POINT_SIZE = 6.0
// Roughly Sirius's apparent magnitude — the practical "brightest star" anchor.
const BRIGHTEST_REFERENCE_MAG = -1.5
const SIZE_PER_MAGNITUDE = 0.57

export interface StarRenderBuffers {
  positions: Float32Array
  sizes: Float32Array
  colors: Float32Array
  phases: Float32Array
  /** Each star's own index, 0..count-1 — lets the shader identify the
   * hovered point via a uHoveredIndex uniform (see StarsLayer). */
  indices: Float32Array
  /** Apparent magnitude — drives Explore Mode's progressive reveal (see
   * scene/exploration.ts): the shader compares this against a per-frame
   * cutoff derived from camera FOV, rather than this app re-filtering
   * the buffers on zoom (the exact CPU-rebuild pattern the Phase 8 fix
   * eliminated for horizon culling). */
  magnitudes: Float32Array
  count: number
}

export interface StarCatalog {
  buffers: StarRenderBuffers
  /** Index-aligned with `buffers` — stars[i] describes the star rendered
   * at buffers.positions[i*3..i*3+2], etc. */
  stars: Star[]
}

const EMPTY_BUFFERS: StarRenderBuffers = {
  positions: new Float32Array(0),
  sizes: new Float32Array(0),
  colors: new Float32Array(0),
  phases: new Float32Array(0),
  indices: new Float32Array(0),
  magnitudes: new Float32Array(0),
  count: 0,
}

const EMPTY_CATALOG: StarCatalog = { buffers: EMPTY_BUFFERS, stars: [] }

/** Bigger point for brighter (lower/negative magnitude) stars. */
export function magnitudeToPointSize(mag: number): number {
  const size = MAX_POINT_SIZE - (mag - BRIGHTEST_REFERENCE_MAG) * SIZE_PER_MAGNITUDE
  return clamp(size, MIN_POINT_SIZE, MAX_POINT_SIZE)
}

export function hexToRgb01(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function tierRowToStar(tier: StarTierData, i: number): Star {
  return {
    id: tier.id[i] ?? String(i),
    names: tier.names[i] ?? [],
    magnitude: tier.mag[i] ?? 0,
    absoluteMagnitude: tier.absMag[i] ?? 0,
    distanceLy: tier.distLy[i] ?? 0,
    spectralClass: tier.spect[i] ?? null,
    colorIndex: tier.ci[i] ?? 0,
    colorHex: tier.colorHex[i] ?? '#ffffff',
    temperatureK: tier.temperatureK[i] ?? 0,
    luminositySolar: tier.lum[i] ?? null,
    constellation: tier.con[i] ?? null,
    equatorial: { ra: tier.ra[i] ?? 0, dec: tier.dec[i] ?? 0 },
  }
}

/** Converts one fetched tier's columnar data into shader-ready buffers
 * plus its index-aligned Star domain objects. */
function tierToCatalog(tier: StarTierData): StarCatalog {
  const { count } = tier
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const indices = new Float32Array(count)
  const magnitudes = new Float32Array(count)
  const stars: Star[] = new Array(count)

  for (let i = 0; i < count; i++) {
    const [x, y, z] = equatorialToCartesian({ ra: tier.ra[i] ?? 0, dec: tier.dec[i] ?? 0 })
    positions[i * 3] = x * CELESTIAL_SPHERE_RADIUS
    positions[i * 3 + 1] = y * CELESTIAL_SPHERE_RADIUS
    positions[i * 3 + 2] = z * CELESTIAL_SPHERE_RADIUS

    sizes[i] = magnitudeToPointSize(tier.mag[i] ?? BRIGHTEST_REFERENCE_MAG)
    magnitudes[i] = tier.mag[i] ?? BRIGHTEST_REFERENCE_MAG

    const [r, g, b] = hexToRgb01(tier.colorHex[i] ?? '#ffffff')
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    phases[i] = Math.random() * Math.PI * 2
    indices[i] = i

    stars[i] = tierRowToStar(tier, i)
  }

  return { buffers: { positions, sizes, colors, phases, indices, magnitudes, count }, stars }
}

function mergeCatalogs(a: StarCatalog, b: StarCatalog): StarCatalog {
  const count = a.buffers.count + b.buffers.count
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const indices = new Float32Array(count)
  const magnitudes = new Float32Array(count)

  positions.set(a.buffers.positions, 0)
  positions.set(b.buffers.positions, a.buffers.count * 3)
  sizes.set(a.buffers.sizes, 0)
  sizes.set(b.buffers.sizes, a.buffers.count)
  colors.set(a.buffers.colors, 0)
  colors.set(b.buffers.colors, a.buffers.count * 3)
  phases.set(a.buffers.phases, 0)
  phases.set(b.buffers.phases, a.buffers.count)
  magnitudes.set(a.buffers.magnitudes, 0)
  magnitudes.set(b.buffers.magnitudes, a.buffers.count)
  // Indices renumber across the merge so they stay 0..count-1 overall,
  // matching the concatenated stars array below.
  for (let i = 0; i < count; i++) indices[i] = i

  return {
    buffers: { positions, sizes, colors, phases, indices, magnitudes, count },
    stars: [...a.stars, ...b.stars],
  }
}

/**
 * Loads the star catalog tier by tier (brightest first, for instant first
 * paint) and merges each newly-arrived tier into a single growing catalog.
 * Loading happens a handful of times per session, not per frame, so plain
 * React state here is fine — this is not part of the render loop.
 */
export function useStarCatalog(): StarCatalog {
  const [catalog, setCatalog] = useState<StarCatalog>(EMPTY_CATALOG)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      let merged = EMPTY_CATALOG
      for (const tierName of TIER_ORDER) {
        if (cancelled) return
        useDataStore.getState().setCatalogStatus(tierName, 'loading')
        try {
          const tierData = await loadStarTier(tierName)
          merged = mergeCatalogs(merged, tierToCatalog(tierData))
          useDataStore.getState().setCatalogStatus(tierName, 'loaded')
          if (!cancelled) setCatalog(merged)
        } catch (error) {
          useDataStore.getState().setCatalogStatus(tierName, 'error')
          useDataStore
            .getState()
            .setCatalogError(tierName, error instanceof Error ? error.message : String(error))
        }
      }
    }

    void loadAll()

    return () => {
      cancelled = true
    }
  }, [])

  return catalog
}
