import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElementDimensions } from './useElementDimensions'

describe('useElementDimensions', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    // Mock getBoundingClientRect
    container.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces dimension updates on resize', () => {
    const ref = { current: container }
    const { result } = renderHook(() => useElementDimensions(ref))

    expect(result.current).toEqual({ width: 100, height: 100 })

    // Change mock return value
    container.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      height: 200,
      top: 0,
      left: 0,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Should NOT update immediately because of debounce
    expect(result.current).toEqual({ width: 100, height: 100 })

    // Advance time by 200ms
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should update now
    expect(result.current).toEqual({ width: 200, height: 200 })
  })
})
