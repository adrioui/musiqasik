import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('should return empty set for unknown node', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    expect(result.current.getNeighbors('unknown').size).toBe(0)
  })

  it('should correctly identify neighbors with string sources/targets', () => {
    const links = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))

    const neighborsA = result.current.getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.size).toBe(1)

    const neighborsB = result.current.getNeighbors('B')
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('c')).toBe(true)
    expect(neighborsB.size).toBe(2)
  })

  it('should correctly identify neighbors with object sources/targets', () => {
    // Mimic D3 mutated links or GraphNode objects
    const links = [{ source: { name: 'A' }, target: { name: 'B' }, weight: 1 }] as any

    const { result } = renderHook(() => useGraphNeighbors(links))

    const neighborsA = result.current.getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
  })

  it('should be case insensitive', () => {
    const links = [{ source: 'ArtistOne', target: 'ArtistTwo', weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.getNeighbors('artistone').has('artisttwo')).toBe(true)
    expect(result.current.getNeighbors('ARTISTTWO').has('artistone')).toBe(true)
  })
})
