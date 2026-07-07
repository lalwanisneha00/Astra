import type { ComponentPropsWithoutRef } from 'react'

type GlassPanelProps = ComponentPropsWithoutRef<'div'>

/** Frosted glass surface used for every overlay panel, dock, and dialog. */
export function GlassPanel({ className = '', children, ...rest }: GlassPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-glass-border bg-glass shadow-glass backdrop-blur-glass ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
