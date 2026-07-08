import { useEffect, useState } from 'react'
import {
  estimateBestViewingMonths,
  hemisphereFromDeclination,
  isZodiacConstellation,
} from '@/astronomy/constellationFacts'
import { loadConstellations } from '@/data/loaders/constellationLoader'
import { useDataStore } from '@/state/useDataStore'
import type { Constellation } from '@/types/constellation'

export function useConstellations(): Constellation[] {
  const [constellations, setConstellations] = useState<Constellation[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      useDataStore.getState().setCatalogStatus('constellations', 'loading')
      try {
        const records = await loadConstellations()
        if (cancelled) return

        const enriched: Constellation[] = records.map((record) => ({
          id: record.id,
          name: record.name,
          genitive: record.genitive,
          labelPosition: { ra: record.labelRa, dec: record.labelDec },
          lines: record.lines,
          isZodiac: isZodiacConstellation(record.id),
          hemisphere: hemisphereFromDeclination(record.labelDec),
          bestViewingMonths: estimateBestViewingMonths(record.labelRa),
        }))

        setConstellations(enriched)
        useDataStore.getState().setCatalogStatus('constellations', 'loaded')
      } catch (error) {
        useDataStore.getState().setCatalogStatus('constellations', 'error')
        useDataStore
          .getState()
          .setCatalogError('constellations', error instanceof Error ? error.message : String(error))
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return constellations
}
