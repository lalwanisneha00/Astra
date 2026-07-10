import { ConstellationFigure } from '@/scene/layers/ConstellationFigure'
import { useLayersStore } from '@/state/useLayersStore'
import type { Constellation } from '@/types/constellation'

interface ConstellationLayerProps {
  constellations: Constellation[]
}

export function ConstellationLayer({ constellations }: ConstellationLayerProps) {
  const showLines = useLayersStore((state) => state.constellationLines)

  if (!showLines || constellations.length === 0) return null

  return (
    <>
      {constellations.map((constellation) => (
        <ConstellationFigure key={constellation.id} constellation={constellation} />
      ))}
    </>
  )
}
