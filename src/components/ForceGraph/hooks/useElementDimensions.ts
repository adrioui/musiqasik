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

    // Debounce resize updates to prevent excessive re-renders and D3 simulation restarts
    // Wait 200ms after last resize event before updating dimensions
    const debouncedUpdate = debounce(updateDimensions, 200)

    window.addEventListener('resize', debouncedUpdate)
    return () => {
      window.removeEventListener('resize', debouncedUpdate)
      debouncedUpdate.cancel()
    }
  }, [containerRef])

  return dimensions
}
