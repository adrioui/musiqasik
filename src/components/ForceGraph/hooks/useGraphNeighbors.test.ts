import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGraphNeighbors } from './useGraphNeighbors'
import type { GraphLink, GraphNode } from './useGraphData'

describe('useGraphNeighbors', () => {
  it('returns empty neighbors for unknown node', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    expect(result.current.getNeighbors('unknown')).toEqual(new Set())
  })

  it('builds neighbors from string links', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'A', target: 'C', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.getNeighbors('A')).toEqual(new Set(['b', 'c']))
    expect(result.current.getNeighbors('B')).toEqual(new Set(['a']))
    expect(result.current.getNeighbors('C')).toEqual(new Set(['a']))
  })

  it('builds neighbors from object links', () => {
    const nodeA = { name: 'A' } as GraphNode
    const nodeB = { name: 'B' } as GraphNode
    const links: GraphLink[] = [
      { source: nodeA, target: nodeB, weight: 1 }
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    expect(result.current.getNeighbors('A')).toEqual(new Set(['b']))
    expect(result.current.getNeighbors('B')).toEqual(new Set(['a']))
  })

  it('handles mixed links', () => {
    const nodeA = { name: 'A' } as GraphNode
    const links: GraphLink[] = [
      { source: nodeA, target: 'B', weight: 1 },
      { source: 'C', target: nodeA, weight: 1 }
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    expect(result.current.getNeighbors('A')).toEqual(new Set(['b', 'c']))
  })

  it('is case insensitive', () => {
    const links: GraphLink[] = [
      { source: 'ArtistA', target: 'ArtistB', weight: 1 }
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))
    expect(result.current.getNeighbors('artista')).toEqual(new Set(['artistb']))
    expect(result.current.getNeighbors('ARTISTB')).toEqual(new Set(['artista']))
  })
})
