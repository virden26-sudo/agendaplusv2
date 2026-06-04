import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeMobile(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const onChange = () => onStoreChange()
  mql.addEventListener("change", onChange)
  window.addEventListener("resize", onChange)
  return () => {
    mql.removeEventListener("change", onChange)
    window.removeEventListener("resize", onChange)
  }
}

function getMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/** SSR-safe: false on server and during hydration, then tracks viewport. */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false)
}
