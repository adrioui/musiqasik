import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, SimulationNode } from '../types'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('returns empty neighbors for unknown node', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    expect(result.current.getNeighbors('unknown').size).toBe(0)
  })

  it('correctly maps neighbors from string links', () => {
    const links: GraphLink[] = [
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

  it('handles case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'Artist A', target: 'ARTIST B', weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.getNeighbors('artist a').has('artist b')).toBe(true)
    expect(result.current.getNeighbors('Artist B').has('artist a')).toBe(true)
  })

  it('handles object references in links', () => {
    const nodeA = { name: 'A' } as SimulationNode
    const nodeB = { name: 'B' } as SimulationNode

    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]

    const { result } = renderHook(() => useGraphNeighbors(links))
    expect(result.current.getNeighbors('A').has('b')).toBe(true)
  })

  it('memoizes the neighbors map', () => {
    const links: GraphLink[] = [{ source: 'A', target: 'B', weight: 1 }]
    const { result, rerender } = renderHook((initialLinks) => useGraphNeighbors(initialLinks), {
      initialProps: links,
    })

    const firstGetNeighbors = result.current.getNeighbors

    rerender(links)

    expect(result.current.getNeighbors).toBe(firstGetNeighbors)

    rerender([{ source: 'A', target: 'C', weight: 1 }])

    expect(result.current.getNeighbors).not.toBe(firstGetNeighbors)
  })
})
