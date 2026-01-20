import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('should correctly identify neighbors in an undirected graph', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 },
    ]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    // Check neighbors of A
    const neighborsA = getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.size).toBe(1)

    // Check neighbors of B (should have A and C)
    const neighborsB = getNeighbors('B')
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('c')).toBe(true)
    expect(neighborsB.size).toBe(2)

    // Check neighbors of C
    const neighborsC = getNeighbors('C')
    expect(neighborsC.has('b')).toBe(true)
    expect(neighborsC.size).toBe(1)
  })

  it('should handle case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'ArtistOne', target: 'ArtistTwo', weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighbors = getNeighbors('artistone')
    expect(neighbors.has('artisttwo')).toBe(true)
  })

  it('should handle empty links', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    const { getNeighbors } = result.current

    expect(getNeighbors('any').size).toBe(0)
  })

  it('should handle disconnected nodes (no neighbors)', () => {
    const links: GraphLink[] = [{ source: 'A', target: 'B', weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('C').size).toBe(0)
  })
})
