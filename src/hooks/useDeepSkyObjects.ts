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
        setObjects(records)
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
