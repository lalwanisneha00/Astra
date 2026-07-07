import { useEffect, useState } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { loadStarTier, type StarTierData, type StarTierName } from '@/data/loaders/starLoader'
import { clamp } from '@/lib/math'
import { useDataStore } from '@/state/useDataStore'

// Matches the celestial sphere radius the camera and StarsLayer assume.
const SPHERE_RADIUS = 150

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
  count: number
}

const EMPTY_BUFFERS: StarRenderBuffers = {
  positions: new Float32Array(0),
  sizes: new Float32Array(0),
  colors: new Float32Array(0),
  phases: new Float32Array(0),
  count: 0,
}

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

/** Converts one fetched tier's columnar data into shader-ready buffers. */
function tierToBuffers(tier: StarTierData): StarRenderBuffers {
  const { count } = tier
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const [x, y, z] = equatorialToCartesian({ ra: tier.ra[i] ?? 0, dec: tier.dec[i] ?? 0 })
    positions[i * 3] = x * SPHERE_RADIUS
    positions[i * 3 + 1] = y * SPHERE_RADIUS
    positions[i * 3 + 2] = z * SPHERE_RADIUS

    sizes[i] = magnitudeToPointSize(tier.mag[i] ?? BRIGHTEST_REFERENCE_MAG)

    const [r, g, b] = hexToRgb01(tier.colorHex[i] ?? '#ffffff')
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    phases[i] = Math.random() * Math.PI * 2
  }

  return { positions, sizes, colors, phases, count }
}

function mergeBuffers(a: StarRenderBuffers, b: StarRenderBuffers): StarRenderBuffers {
  const count = a.count + b.count
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const phases = new Float32Array(count)

  positions.set(a.positions, 0)
  positions.set(b.positions, a.count * 3)
  sizes.set(a.sizes, 0)
  sizes.set(b.sizes, a.count)
  colors.set(a.colors, 0)
  colors.set(b.colors, a.count * 3)
  phases.set(a.phases, 0)
  phases.set(b.phases, a.count)

  return { positions, sizes, colors, phases, count }
}

/**
 * Loads the star catalog tier by tier (brightest first, for instant first
 * paint) and merges each newly-arrived tier into a single growing buffer
 * set. Loading happens a handful of times per session, not per frame, so
 * plain React state here is fine — this is not part of the render loop.
 */
export function useStarCatalog(): StarRenderBuffers {
  const [buffers, setBuffers] = useState<StarRenderBuffers>(EMPTY_BUFFERS)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      let merged = EMPTY_BUFFERS
      for (const tierName of TIER_ORDER) {
        if (cancelled) return
        useDataStore.getState().setCatalogStatus(tierName, 'loading')
        try {
          const tierData = await loadStarTier(tierName)
          merged = mergeBuffers(merged, tierToBuffers(tierData))
          useDataStore.getState().setCatalogStatus(tierName, 'loaded')
          if (!cancelled) setBuffers(merged)
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

  return buffers
}
