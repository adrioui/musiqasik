import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('should return empty set for empty graph', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    const { getNeighbors } = result.current
    expect(getNeighbors('foo').size).toBe(0)
  })

  it('should return neighbors for string links', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.size).toBe(1)

    const neighborsB = getNeighbors('B')
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('c')).toBe(true)
    expect(neighborsB.size).toBe(2)
  })

  it('should handle object references (D3 mutation)', () => {
    const nodeA = { name: 'A' } as GraphNode
    const nodeB = { name: 'B' } as GraphNode
    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('A').has('b')).toBe(true)
    expect(getNeighbors('B').has('a')).toBe(true)
  })

  it('should be case insensitive', () => {
    const links: GraphLink[] = [{ source: 'ArtistOne', target: 'ArtistTwo', weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('artistone').has('artisttwo')).toBe(true)
    expect(getNeighbors('ArtistOne').has('artisttwo')).toBe(true)
    expect(getNeighbors('ARTISTONE').has('artisttwo')).toBe(true)
  })
})
