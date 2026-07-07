import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { APP_NAME } from './constants'
import { ErrorBoundary } from './ErrorBoundary'

export function App() {
  return (
    <ErrorBoundary>
      <div className="relative h-dvh w-dvw overflow-hidden bg-space-950">
        <SceneCanvas />
        <header className="pointer-events-none absolute top-4 left-4">
          <GlassPanel className="pointer-events-auto px-4 py-2">
            <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
              {APP_NAME}
            </h1>
          </GlassPanel>
        </header>
      </div>
    </ErrorBoundary>
  )
}
