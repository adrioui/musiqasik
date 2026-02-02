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

    // Initial update
    updateDimensions()

    const handleResize = debounce(updateDimensions, 200)

    window.addEventListener('resize', handleResize)
    return () => {
      handleResize.cancel()
      window.removeEventListener('resize', handleResize)
    }
  }, [containerRef])

  return dimensions
}
