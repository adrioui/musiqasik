import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from './useGraphData'
import { useGraphNeighbors } from './useGraphNeighbors'

describe('useGraphNeighbors', () => {
  const createLink = (source: string | GraphNode, target: string | GraphNode): GraphLink => ({
    source,
    target,
    weight: 1,
  })

  const createNode = (name: string): GraphNode => ({
    name,
    listeners: 0,
    mbid: '',
    url: '',
    image: [],
    tags: [],
    links: [],
  })

  it('correctly identifies neighbors from string links', () => {
    const links = [createLink('Node A', 'Node B'), createLink('Node B', 'Node C')]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('Node A')
    expect(neighborsA.has('node b')).toBe(true)
    expect(neighborsA.size).toBe(1)

    const neighborsB = getNeighbors('Node B')
    expect(neighborsB.has('node a')).toBe(true)
    expect(neighborsB.has('node c')).toBe(true)
    expect(neighborsB.size).toBe(2)

    const neighborsC = getNeighbors('Node C')
    expect(neighborsC.has('node b')).toBe(true)
    expect(neighborsC.size).toBe(1)
  })

  it('correctly identifies neighbors from object links (GraphNode)', () => {
    const nodeA = createNode('Node A')
    const nodeB = createNode('Node B')
    const nodeC = createNode('Node C')

    const links = [createLink(nodeA, nodeB), createLink(nodeB, nodeC)]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighborsA = getNeighbors('Node A')
    expect(neighborsA.has('node b')).toBe(true)

    const neighborsB = getNeighbors('Node B')
    expect(neighborsB.has('node a')).toBe(true)
    expect(neighborsB.has('node c')).toBe(true)
  })

  it('handles mixed string and object links', () => {
    const nodeB = createNode('Node B')
    const links = [createLink('Node A', nodeB), createLink(nodeB, 'Node C')]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    expect(getNeighbors('Node A').has('node b')).toBe(true)
    expect(getNeighbors('Node B').has('node a')).toBe(true)
    expect(getNeighbors('Node B').has('node c')).toBe(true)
  })

  it('is case insensitive', () => {
    const links = [createLink('Node A', 'Node B')]

    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    // Input case shouldn't matter
    expect(getNeighbors('node a').has('node b')).toBe(true)
    expect(getNeighbors('NODE A').has('node b')).toBe(true)

    // Neighbor set should be lowercase
    expect(getNeighbors('Node A').has('node b')).toBe(true)
  })

  it('returns empty set for isolated nodes', () => {
    const links = [createLink('Node A', 'Node B')]
    const { result } = renderHook(() => useGraphNeighbors(links))
    const { getNeighbors } = result.current

    const neighbors = getNeighbors('Node C')
    expect(neighbors.size).toBe(0)
  })

  it('returns stable function reference', () => {
    const links = [createLink('Node A', 'Node B')]
    const { result, rerender } = renderHook(() => useGraphNeighbors(links))

    const firstGetNeighbors = result.current.getNeighbors

    rerender()

    expect(result.current.getNeighbors).toBe(firstGetNeighbors)
  })

  it('updates when links change', () => {
    const initialLinks = [createLink('Node A', 'Node B')]
    const { result, rerender } = renderHook(({ links }) => useGraphNeighbors(links), {
      initialProps: { links: initialLinks },
    })

    expect(result.current.getNeighbors('Node A').has('node b')).toBe(true)
    expect(result.current.getNeighbors('Node A').has('node c')).toBe(false)

    const newLinks = [createLink('Node A', 'Node C')]
    rerender({ links: newLinks })

    expect(result.current.getNeighbors('Node A').has('node b')).toBe(false)
    expect(result.current.getNeighbors('Node A').has('node c')).toBe(true)
  })
})
