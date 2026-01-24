import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from './useGraphData'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  it('returns empty map for empty links', () => {
    const { result } = renderHook(() => useGraphNeighbors([]))
    expect(result.current.size).toBe(0)
  })

  it('builds adjacency list for simple connections', () => {
    const links: GraphLink[] = [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 },
    ]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.get('a')?.has('b')).toBe(true)
    expect(result.current.get('b')?.has('a')).toBe(true)
    expect(result.current.get('b')?.has('c')).toBe(true)
    expect(result.current.get('c')?.has('b')).toBe(true)
    expect(result.current.get('a')?.has('c')).toBe(false)
  })

  it('handles case insensitivity', () => {
    const links: GraphLink[] = [{ source: 'Artist A', target: 'ARTIST B', weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.get('artist a')?.has('artist b')).toBe(true)
    expect(result.current.get('artist b')?.has('artist a')).toBe(true)
  })

  it('handles object references for source/target', () => {
    const nodeA = { name: 'A' } as GraphNode
    const nodeB = { name: 'B' } as GraphNode

    const links: GraphLink[] = [{ source: nodeA, target: nodeB, weight: 1 }]
    const { result } = renderHook(() => useGraphNeighbors(links))

    expect(result.current.get('a')?.has('b')).toBe(true)
    expect(result.current.get('b')?.has('a')).toBe(true)
  })

  it('updates when links change', () => {
    const links1: GraphLink[] = [{ source: 'A', target: 'B', weight: 1 }]
    const { result, rerender } = renderHook(({ links }) => useGraphNeighbors(links), {
      initialProps: { links: links1 },
    })

    expect(result.current.get('a')?.has('b')).toBe(true)

    const links2: GraphLink[] = [{ source: 'A', target: 'C', weight: 1 }]
    rerender({ links: links2 })

    expect(result.current.get('a')?.has('b')).toBe(false)
    expect(result.current.get('a')?.has('c')).toBe(true)
  })
})
