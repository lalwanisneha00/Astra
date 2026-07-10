import { useEffect, useState } from 'react'

// A phone's *short* dimension stays roughly constant across rotation
// (e.g. ~390px wide in portrait, ~390px tall in landscape), while its
// long dimension swaps between the two — so matching on width alone
// (Tailwind's `md` breakpoint) would misclassify a rotated phone in
// landscape (e.g. 844×390) as desktop, since 844 exceeds any reasonable
// width cutoff. Matching on width *or* height instead correctly catches
// the phone-shaped dimension regardless of which one is currently
// "width": a tablet or laptop has neither dimension this small.
const MOBILE_QUERY = '(max-width: 767px), (max-height: 500px)'

/**
 * True when the viewport is mobile-sized in *either* orientation.
 * Reactive to resizing and orientation changes (not just measured once
 * on mount), so rotating a phone or resizing a desktop browser window
 * crosses the boundary live — used to switch the info panel between its
 * desktop layout and the mobile bottom sheet without a page reload.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
