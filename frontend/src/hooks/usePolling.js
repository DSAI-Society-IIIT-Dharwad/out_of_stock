import { useEffect, useRef } from 'react'

/**
 * Runs `fn` immediately and then every `intervalMs`.
 * Cleans up on unmount or when deps change.
 */
export function usePolling(fn, intervalMs = 15000, deps = []) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    fnRef.current()
    const id = setInterval(() => fnRef.current(), intervalMs)
    return () => clearInterval(id)
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
