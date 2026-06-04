import * as React from "react"

/** True only after client hydration — matches server snapshot (false) during SSR/hydration. */
export function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
