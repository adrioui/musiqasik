import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useElementDimensions } from './useElementDimensions'

describe('useElementDimensions', () => {
  it('should return default dimensions initially', () => {
    const containerRef = { current: null }
    const { result } = renderHook(() => useElementDimensions(containerRef))
    expect(result.current).toEqual({ width: 800, height: 600 })
  })

  it('should update dimensions on resize event', () => {
    vi.useFakeTimers()
    const containerRef = {
      current: {
        getBoundingClientRect: () => ({ width: 1024, height: 768 }),
      } as HTMLElement,
    }

    const { result } = renderHook(() => useElementDimensions(containerRef))

    // Initial update should happen immediately
    expect(result.current).toEqual({ width: 1024, height: 768 })

    // Simulate resize with new dimensions
    containerRef.current.getBoundingClientRect = () => ({ width: 1280, height: 720 }) as DOMRect

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Should not update immediately due to debounce
    expect(result.current).toEqual({ width: 1024, height: 768 })

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toEqual({ width: 1280, height: 720 })

    vi.useRealTimers()
  })
})
