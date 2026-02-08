import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink } from './useGraphData'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('should return empty set for unknown node', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    const getNeighbors = result.current
    expect(getNeighbors('unknown').size).toBe(0)
  })

  it('should correctly identify neighbors', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const getNeighbors = result.current

    const neighborsA = getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.size).toBe(1)

    const neighborsB = getNeighbors('B')
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('c')).toBe(true)
    expect(neighborsB.size).toBe(2)
  })

  it('should handle case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'ArtistOne', target: 'ArtistTwo', weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const getNeighbors = result.current

    const neighbors = getNeighbors('artistone')
    expect(neighbors.has('artisttwo')).toBe(true)
  })

  it('should handle duplicate links gracefully', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'A', target: 'B', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const getNeighbors = result.current

    const neighborsA = getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.size).toBe(1)
  })
})
