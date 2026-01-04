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

    // Debounce resize handler to prevent excessive re-renders during window resize
    const debouncedUpdate = debounce(updateDimensions, 200)

    updateDimensions()
    window.addEventListener('resize', debouncedUpdate)
    return () => window.removeEventListener('resize', debouncedUpdate)
  }, [containerRef])

  return dimensions
}
