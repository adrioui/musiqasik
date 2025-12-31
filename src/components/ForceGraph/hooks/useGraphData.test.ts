import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Artist, SimilarityEdge } from '@/types/artist'
import { useGraphData } from './useGraphData'

describe('useGraphData', () => {
  const createArtist = (name: string): Artist => ({
    name,
    listeners: 1000,
  })

  const createEdge = (source: string, target: string, weight: number): SimilarityEdge => ({
    source,
    target,
    weight,
  })

  it('returns empty results when nodes array is empty', () => {
    const { result } = renderHook(() =>
      useGraphData({
        nodes: [],
        edges: [],
        centerArtist: null,
        threshold: 0,
      }),
    )

    expect(result.current.filteredNodes).toEqual([])
    expect(result.current.graphLinks).toEqual([])
    expect(result.current.nodeMap.size).toBe(0)
  })

  it('filters edges below threshold', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B'), createArtist('Artist C')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9), createEdge('Artist A', 'Artist C', 0.3)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0.5,
      }),
    )

    // Only edge with weight >= 0.5 should be included
    expect(result.current.graphLinks).toHaveLength(1)
    expect(result.current.graphLinks[0].weight).toBe(0.9)
  })

  it('includes all edges when threshold is 0', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B'), createArtist('Artist C')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9), createEdge('Artist A', 'Artist C', 0.1)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    expect(result.current.graphLinks).toHaveLength(2)
  })

  it('only includes nodes that are connected by filtered edges', () => {
    const nodes = [
      createArtist('Artist A'),
      createArtist('Artist B'),
      createArtist('Artist C'),
      createArtist('Artist D'), // Not connected
    ]
    const edges = [createEdge('Artist A', 'Artist B', 0.9), createEdge('Artist A', 'Artist C', 0.7)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    const nodeNames = result.current.filteredNodes.map((n) => n.name)
    expect(nodeNames).toContain('Artist A')
    expect(nodeNames).toContain('Artist B')
    expect(nodeNames).toContain('Artist C')
    expect(nodeNames).not.toContain('Artist D')
  })

  it('always includes center artist even if not connected', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B'), createArtist('Artist C')]
    const edges = [createEdge('Artist B', 'Artist C', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    const nodeNames = result.current.filteredNodes.map((n) => n.name)
    expect(nodeNames).toContain('Artist A')
  })

  it('marks center artist with isCenter flag', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    const centerNode = result.current.filteredNodes.find((n) => n.name === 'Artist A')
    const otherNode = result.current.filteredNodes.find((n) => n.name === 'Artist B')

    expect(centerNode?.isCenter).toBe(true)
    expect(otherNode?.isCenter).toBe(false)
  })

  it('handles case insensitivity for center artist matching', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'ARTIST A',
        threshold: 0,
      }),
    )

    const centerNode = result.current.filteredNodes.find((n) => n.name === 'Artist A')
    expect(centerNode?.isCenter).toBe(true)
  })

  it('creates nodeMap with lowercase keys', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    expect(result.current.nodeMap.has('artist a')).toBe(true)
    expect(result.current.nodeMap.has('artist b')).toBe(true)
    expect(result.current.nodeMap.has('Artist A')).toBe(false)
  })

  it('creates graphLinks with proper source and target references', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    expect(result.current.graphLinks).toHaveLength(1)
    expect(result.current.graphLinks[0].source).toBe('Artist A')
    expect(result.current.graphLinks[0].target).toBe('Artist B')
    expect(result.current.graphLinks[0].weight).toBe(0.9)
  })

  it('filters out links where source or target node is missing', () => {
    const nodes = [createArtist('Artist A')] // Missing Artist B
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    expect(result.current.graphLinks).toHaveLength(0)
  })

  it('handles null centerArtist', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: null,
        threshold: 0,
      }),
    )

    // Nodes should still be included based on edges
    expect(result.current.filteredNodes).toHaveLength(2)
    // No node should be marked as center
    expect(result.current.filteredNodes.every((n) => !n.isCenter)).toBe(true)
  })

  it('handles edge case sensitivity in matching', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('ARTIST A', 'artist b', 0.9)]

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist A',
        threshold: 0,
      }),
    )

    expect(result.current.graphLinks).toHaveLength(1)
  })

  it('memoizes result when inputs do not change', () => {
    const nodes = [createArtist('Artist A'), createArtist('Artist B')]
    const edges = [createEdge('Artist A', 'Artist B', 0.9)]
    const props = {
      nodes,
      edges,
      centerArtist: 'Artist A',
      threshold: 0,
    }

    const { result, rerender } = renderHook(() => useGraphData(props))

    const firstResult = result.current
    rerender()
    const secondResult = result.current

    expect(firstResult).toBe(secondResult)
  })

  it('handles large datasets efficiently', () => {
    const nodes = Array.from({ length: 100 }, (_, i) => createArtist(`Artist ${i}`))
    const edges = Array.from({ length: 200 }, (_, i) =>
      createEdge(`Artist ${i % 100}`, `Artist ${(i + 1) % 100}`, 0.5 + (i % 50) / 100),
    )

    const { result } = renderHook(() =>
      useGraphData({
        nodes,
        edges,
        centerArtist: 'Artist 0',
        threshold: 0,
      }),
    )

    // Should process without errors
    expect(result.current.filteredNodes.length).toBeGreaterThan(0)
    expect(result.current.graphLinks.length).toBeGreaterThan(0)
  })
})
