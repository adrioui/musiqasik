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

    // Initial measure
    updateDimensions()

    // OPTIMIZATION: Debounce resize handler to prevent excessive re-renders during window resize.
    // This is critical for performance as it triggers expensive D3 graph re-simulations.
    // Impact: Reduces update frequency from 60fps+ during resize to once every 200ms.
    const debouncedUpdate = debounce(updateDimensions, 200)

    window.addEventListener('resize', debouncedUpdate)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
      debouncedUpdate.cancel()
    }
  }, [containerRef])

  return dimensions
}
