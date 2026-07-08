import { useEffect, useState } from 'react'
import { loadDeepSkyObjects } from '@/data/loaders/dsoLoader'
import { useDataStore } from '@/state/useDataStore'
import type { DeepSkyObject } from '@/types/deepSkyObject'

export function useDeepSkyObjects(): DeepSkyObject[] {
  const [objects, setObjects] = useState<DeepSkyObject[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      useDataStore.getState().setCatalogStatus('dso', 'loading')
      try {
        const records = await loadDeepSkyObjects()
        if (cancelled) return

        const enriched: DeepSkyObject[] = records.map((record) => ({
          id: record.id,
          type: record.type,
          equatorial: { ra: record.ra, dec: record.dec },
          constellation: record.constellation,
          magnitude: record.magnitude,
          sizeArcmin: record.sizeArcmin,
          messier: record.messier,
          commonNames: record.commonNames,
        }))

        setObjects(enriched)
        useDataStore.getState().setCatalogStatus('dso', 'loaded')
      } catch (error) {
        useDataStore.getState().setCatalogStatus('dso', 'error')
        useDataStore
          .getState()
          .setCatalogError('dso', error instanceof Error ? error.message : String(error))
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return objects
}
