import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink } from './useGraphData'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  const createLink = (source: string, target: string): GraphLink => ({
    source,
    target,
    weight: 1,
  })

  it('returns empty set for unknown node', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    expect(result.current('unknown').size).toBe(0)
  })

  it('correctly identifies neighbors for simple graph', () => {
    const links = [
      createLink('A', 'B'),
      createLink('B', 'C'),
      createLink('A', 'C'),
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))

    const neighborsA = result.current('A')
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.has('c')).toBe(true)
    expect(neighborsA.size).toBe(2)

    const neighborsB = result.current('B')
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('c')).toBe(true)
    expect(neighborsB.size).toBe(2)
  })

  it('handles mixed case inputs', () => {
    const links = [createLink('Artist A', 'Artist B')]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current('artist a').has('artist b')).toBe(true)
    expect(result.current('ARTIST B').has('artist a')).toBe(true)
  })

  it('handles object-based links', () => {
    // Simulate links that have been processed by D3 or similar
    const links: GraphLink[] = [
      {
        source: { name: 'Node A' } as any,
        target: { name: 'Node B' } as any,
        weight: 1,
      },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current('node a').has('node b')).toBe(true)
    expect(result.current('node b').has('node a')).toBe(true)
  })

  it('memoizes the adjacency map', () => {
    const links = [createLink('A', 'B')]
    const { result, rerender } = renderHook(({ links }) => useGraphNeighbors(links), {
      initialProps: { links },
    })

    const firstGetNeighbors = result.current
    rerender({ links }) // Same links reference
    expect(result.current).toBe(firstGetNeighbors)

    // New links array with same content -> useMemo should arguably recompute unless we are careful,
    // but React's useMemo depends on dependency identity.
    // Ideally we want the getNeighbors function identity to be stable if the links are stable.

    const newLinks = [createLink('A', 'B')]
    rerender({ links: newLinks })
    // It is expected to change if the input array reference changes
    expect(result.current).not.toBe(firstGetNeighbors)
  })
})
