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
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    // Initialize dimensions
    updateDimensions()

    // Create a debounced resize handler
    // 200ms debounce prevents continuous re-simulation during window resize
    const debouncedUpdate = debounce(updateDimensions, 200)

    const observer = new ResizeObserver(() => {
      debouncedUpdate()
    })

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [containerRef])

  return dimensions
}
