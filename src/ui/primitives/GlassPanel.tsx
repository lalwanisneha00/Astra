import { forwardRef, type ComponentPropsWithoutRef } from 'react'

type GlassPanelProps = ComponentPropsWithoutRef<'div'>

/** Frosted glass surface used for every overlay panel, dock, and dialog. */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-glass-border bg-glass shadow-glass backdrop-blur-glass ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
})
