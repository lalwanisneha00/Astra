import { useEffect, useState } from 'react'

// Generous fallback in case, for any reason, no `<header>` is found
// before the first measurement — better to leave too much space below
// it than risk covering the logo/search button.
const FALLBACK_SAFE_BOTTOM = 128

/**
 * The app header's bottom edge, in viewport pixels — used to cap how far
 * the mobile info sheet can be dragged upward so it never covers the
 * Astra logo or search button, regardless of how tall the header
 * happens to be (its button row can wrap to two lines on a narrow
 * phone, and it differs between portrait/landscape). Re-measures on
 * resize, orientation change, and whenever the header's own size
 * changes (e.g. that wrapping).
 */
export function useHeaderSafeBottom(): number {
  const [safeBottom, setSafeBottom] = useState(FALLBACK_SAFE_BOTTOM)

  useEffect(() => {
    const header: HTMLElement | null = document.querySelector('header')
    if (!header) return

    function measure() {
      if (!header) return
      setSafeBottom(header.getBoundingClientRect().bottom)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return safeBottom
}
