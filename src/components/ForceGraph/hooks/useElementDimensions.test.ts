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

  it('should debounce resize events', () => {
    const container = document.createElement('div')
    // Mock getBoundingClientRect
    container.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      toJSON: () => {},
    }))

    const ref = { current: container }

    const { result } = renderHook(() => useElementDimensions(ref))

    // Initial value
    expect(result.current).toEqual({ width: 100, height: 100 })

    // Change dimensions mock
    container.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 200,
      bottom: 200,
      toJSON: () => {},
    }))

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Without debouncing, this would update immediately.
    // With debouncing (assuming > 0 wait), this should still be the old value.
    // We expect this to FAIL on the current implementation if we assert it hasn't changed.
    // But since I'm implementing the optimization, I'll write the test to pass ONLY if debouncing is in place.

    // Assert it HAS NOT changed yet (proving debounce is working)
    expect(result.current).toEqual({ width: 100, height: 100 })

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300) // Assuming 200ms debounce
    })

    // Now it should have changed
    expect(result.current).toEqual({ width: 200, height: 200 })
  })
})
