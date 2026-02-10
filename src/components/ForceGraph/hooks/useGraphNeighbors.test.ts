import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('returns empty set for node with no neighbors', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    const { getNeighbors } = result.current

    expect(getNeighbors('Node A').size).toBe(0)
  })

  it('correctly identifies neighbors for string-based links', () => {
    const links: GraphLink[] = [
      { source: 'Node A', target: 'Node B', weight: 1 },
      { source: 'Node A', target: 'Node C', weight: 1 },
    ]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('Node A')
    expect(neighborsA.has('node b')).toBe(true)
    expect(neighborsA.has('node c')).toBe(true)
    expect(neighborsA.size).toBe(2)

    const neighborsB = getNeighbors('Node B')
    expect(neighborsB.has('node a')).toBe(true)
    expect(neighborsB.size).toBe(1)
  })

  it('correctly identifies neighbors for object-based links (D3 mutation)', () => {
    const nodeA: GraphNode = { name: 'Node A' }
    const nodeB: GraphNode = { name: 'Node B' }

    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('Node A')
    expect(neighborsA.has('node b')).toBe(true)
  })

  it('handles case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'Node A', target: 'Node B', weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    // Look up with different casing
    const neighbors = getNeighbors('NODE A')
    expect(neighbors.has('node b')).toBe(true)
  })
})
