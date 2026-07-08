/**
 * Standard leading+trailing throttle: invokes `fn` immediately on the
 * first call, then at most once every `waitMs` after that. A call that
 * arrives mid-window is remembered and fired once the window ends, so
 * the *last* set of arguments always eventually gets applied — critical
 * for a time slider, where the final scrubbed-to date must never be
 * silently dropped.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): (...args: Args) => void {
  let lastCallTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Args | null = null

  function invoke(args: Args) {
    lastCallTime = Date.now()
    fn(...args)
  }

  return (...args: Args) => {
    const now = Date.now()
    const remaining = waitMs - (now - lastCallTime)

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      invoke(args)
      return
    }

    pendingArgs = args
    timeoutId ??= setTimeout(() => {
      timeoutId = null
      if (pendingArgs) {
        invoke(pendingArgs)
        pendingArgs = null
      }
    }, remaining)
  }
}
