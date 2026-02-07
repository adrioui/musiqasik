import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  const createNode = (name: string): GraphNode => ({
    name,
    mbid: '',
    url: '',
    image_small: '',
    image_medium: '',
    image_large: '',
    image_extralarge: '',
    image_mega: '',
    image: [],
    listeners: 0,
    playcount: 0,
    tags: [],
    x: 0,
    y: 0,
  })

  it('returns empty set when links array is empty', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    const { getNeighbors } = result.current

    expect(getNeighbors('Artist A').size).toBe(0)
  })

  it('correctly identifies neighbors for a given node', () => {
    const links: GraphLink[] = [
      { source: 'Artist A', target: 'Artist B', weight: 1 },
      { source: 'Artist A', target: 'Artist C', weight: 1 },
      { source: 'Artist D', target: 'Artist E', weight: 1 },
    ]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('Artist A')
    expect(neighborsA.size).toBe(2)
    expect(neighborsA.has('artist b')).toBe(true)
    expect(neighborsA.has('artist c')).toBe(true)

    const neighborsB = getNeighbors('Artist B')
    expect(neighborsB.size).toBe(1)
    expect(neighborsB.has('artist a')).toBe(true)
  })

  it('handles case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'ARTIST A', target: 'artist b', weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighbors = getNeighbors('Artist A')
    expect(neighbors.has('artist b')).toBe(true)

    const neighborsLower = getNeighbors('artist a')
    expect(neighborsLower.has('artist b')).toBe(true)
  })

  it('handles object references in links', () => {
    const nodeA = createNode('Artist A')
    const nodeB = createNode('Artist B')

    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighbors = getNeighbors('Artist A')
    expect(neighbors.has('artist b')).toBe(true)
  })

  it('memoizes the adjacency list', () => {
    const links: GraphLink[] = [{ source: 'Artist A', target: 'Artist B', weight: 1 }]

    const { result, rerender } = renderHook(({ links }) => useGraphNeighbors(links), {
      initialProps: { links },
    })

    const firstResult = result.current
    rerender({ links })
    const secondResult = result.current

    // The getNeighbors function reference should be stable
    expect(firstResult.getNeighbors).toBe(secondResult.getNeighbors)
  })

  it('updates when links change', () => {
    const initialLinks: GraphLink[] = [{ source: 'Artist A', target: 'Artist B', weight: 1 }]

    const { result, rerender } = renderHook(({ links }) => useGraphNeighbors(links), {
      initialProps: { links: initialLinks },
    })

    expect(result.current.getNeighbors('Artist A').has('artist b')).toBe(true)

    const newLinks: GraphLink[] = [{ source: 'Artist A', target: 'Artist C', weight: 1 }]

    rerender({ links: newLinks })

    expect(result.current.getNeighbors('Artist A').has('artist b')).toBe(false)
    expect(result.current.getNeighbors('Artist A').has('artist c')).toBe(true)
  })
})
