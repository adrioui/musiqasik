import { type RefObject, useEffect, useState } from 'react'
import { debounce } from '@/lib/utils'

export interface Dimensions {
  width: number
  height: number
}

export function useElementDimensions(
  containerRef: RefObject<HTMLElement>,
  defaultDimensions: Dimensions = { width: 800, height: 600 },
): Dimensions {
  const [dimensions, setDimensions] = useState<Dimensions>(defaultDimensions)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()

    // Debounce resize events to prevent layout thrashing and excessive re-renders
    const debouncedUpdate = debounce(updateDimensions, 200)

    // Cast to any to satisfy generic constraints if necessary, though () => void is usually assignable to EventListener
    // biome-ignore lint/suspicious/noExplicitAny: Debounce type compatibility
    window.addEventListener('resize', debouncedUpdate as any)

    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: Debounce type compatibility
      window.removeEventListener('resize', debouncedUpdate as any)
      debouncedUpdate.cancel()
    }
  }, [containerRef])

  return dimensions
}
