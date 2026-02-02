import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElementDimensions } from './useElementDimensions'

describe('useElementDimensions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates dimensions on resize with debounce', () => {
    const containerRef = {
      current: {
        getBoundingClientRect: vi.fn().mockReturnValue({ width: 1000, height: 800 }),
      } as unknown as HTMLElement,
    }

    const { result } = renderHook(() => useElementDimensions(containerRef))

    // Initial state
    expect(result.current).toEqual({ width: 1000, height: 800 })

    // Simulate resize - update mock
    containerRef.current.getBoundingClientRect = vi.fn().mockReturnValue({ width: 500, height: 400 })

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Should not update immediately (debounce 200ms)
    expect(result.current).toEqual({ width: 1000, height: 800 })

    // Advance time by 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toEqual({ width: 1000, height: 800 })

    // Advance time by another 150ms (total 250ms)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Should update now
    expect(result.current).toEqual({ width: 500, height: 400 })
  })

  it('debounces multiple resize events', () => {
    const containerRef = {
      current: {
        getBoundingClientRect: vi.fn().mockReturnValue({ width: 1000, height: 800 }),
      } as unknown as HTMLElement,
    }
    const { result } = renderHook(() => useElementDimensions(containerRef))

    // Trigger multiple resize events
    containerRef.current.getBoundingClientRect = vi.fn().mockReturnValue({ width: 500, height: 400 })
    act(() => {
        window.dispatchEvent(new Event('resize'))
    })

    containerRef.current.getBoundingClientRect = vi.fn().mockReturnValue({ width: 600, height: 500 })
    act(() => {
        window.dispatchEvent(new Event('resize'))
    })

    // Advance time
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Should update to the last one
    expect(result.current).toEqual({ width: 600, height: 500 })
  })
})
