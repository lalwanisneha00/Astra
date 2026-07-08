import { useMemo } from 'react'
import type { StarCatalog } from './useStarCatalog'

/** Filters a star catalog's buffers and domain objects down to only the
 * stars above the horizon, renumbering indices so hover-picking (which
 * reports indices relative to what's actually drawn) stays correct. */
function filterCatalogByAltitude(catalog: StarCatalog, altitudes: Float32Array): StarCatalog {
  const keepIndices: number[] = []
  for (let i = 0; i < catalog.buffers.count; i++) {
    if ((altitudes[i] ?? -1) >= 0) keepIndices.push(i)
  }

  const count = keepIndices.length
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const indices = new Float32Array(count)
  const stars: StarCatalog['stars'] = new Array(count)

  keepIndices.forEach((sourceIndex, targetIndex) => {
    positions[targetIndex * 3] = catalog.buffers.positions[sourceIndex * 3] ?? 0
    positions[targetIndex * 3 + 1] = catalog.buffers.positions[sourceIndex * 3 + 1] ?? 0
    positions[targetIndex * 3 + 2] = catalog.buffers.positions[sourceIndex * 3 + 2] ?? 0
    sizes[targetIndex] = catalog.buffers.sizes[sourceIndex] ?? 0
    colors[targetIndex * 3] = catalog.buffers.colors[sourceIndex * 3] ?? 0
    colors[targetIndex * 3 + 1] = catalog.buffers.colors[sourceIndex * 3 + 1] ?? 0
    colors[targetIndex * 3 + 2] = catalog.buffers.colors[sourceIndex * 3 + 2] ?? 0
    phases[targetIndex] = catalog.buffers.phases[sourceIndex] ?? 0
    indices[targetIndex] = targetIndex

    const star = catalog.stars[sourceIndex]
    if (star) stars[targetIndex] = star
  })

  return { buffers: { positions, sizes, colors, phases, indices, count }, stars }
}

/**
 * Returns the catalog unchanged in explore mode (or before a culling
 * computation has come back), or a filtered, above-horizon-only version
 * once `altitudes` (from useHorizonCulling) is available and matches the
 * current catalog size — a length mismatch means a computation for a
 * since-grown/shrunk star list is still in flight, so it's safer to keep
 * showing the last-known-good (unfiltered) catalog than to filter with
 * stale, misaligned data.
 */
export function useVisibleStarCatalog(
  catalog: StarCatalog,
  altitudes: Float32Array | null,
): StarCatalog {
  return useMemo(() => {
    if (!altitudes || altitudes.length !== catalog.buffers.count) return catalog
    return filterCatalogByAltitude(catalog, altitudes)
  }, [catalog, altitudes])
}
