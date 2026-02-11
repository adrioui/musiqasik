import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, SimulationNode } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('returns empty set when no links exist', () => {
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

  it('handles object-based links (SimulationNode)', () => {
    const nodeA = { name: 'Node A' } as SimulationNode
    const nodeB = { name: 'Node B' } as SimulationNode

    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('Node A').has('node b')).toBe(true)
    expect(getNeighbors('Node B').has('node a')).toBe(true)
  })

  it('is case-insensitive', () => {
    const links: GraphLink[] = [{ source: 'Node A', target: 'Node B', weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('node a').has('node b')).toBe(true)
    expect(getNeighbors('NODE B').has('node a')).toBe(true)
  })

  it('returns stable reference for getNeighbors', () => {
    const links: GraphLink[] = []
    const { result, rerender } = renderHook(() => useGraphNeighbors(links))

    const firstRef = result.current.getNeighbors
    rerender()
    const secondRef = result.current.getNeighbors

    expect(firstRef).toBe(secondRef)
  })
})
