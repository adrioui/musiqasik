// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode } from '../types'
import { buildAdjacencyList } from './useGraphNeighbors'

const createLink = (source: string, target: string): GraphLink => ({
  source,
  target,
  weight: 1,
})

const createNodeLink = (source: string, target: string): GraphLink => ({
  source: { name: source } as GraphNode,
  target: { name: target } as GraphNode,
  weight: 1,
})

describe('buildAdjacencyList', () => {
  it('returns undefined for isolated node', () => {
    const links = [createLink('A', 'B')]
    const adjacencyList = buildAdjacencyList(links)

    expect(adjacencyList.get('c')).toBeUndefined()
  })

  it('identifies neighbors correctly for string links', () => {
    const links = [createLink('A', 'B'), createLink('A', 'C'), createLink('B', 'D')]
    const adjacencyList = buildAdjacencyList(links)

    const neighborsA = adjacencyList.get('a')!
    expect(neighborsA.has('b')).toBe(true)
    expect(neighborsA.has('c')).toBe(true)
    expect(neighborsA.size).toBe(2)

    const neighborsB = adjacencyList.get('b')!
    expect(neighborsB.has('a')).toBe(true)
    expect(neighborsB.has('d')).toBe(true)
    expect(neighborsB.size).toBe(2)
  })

  it('handles case insensitivity', () => {
    const links = [createLink('Artist A', 'Artist B')]
    const adjacencyList = buildAdjacencyList(links)

    expect(adjacencyList.get('artist a')!.has('artist b')).toBe(true)
    expect(adjacencyList.get('artist b')!.has('artist a')).toBe(true)
  })

  it('handles object references in links', () => {
    const links = [createNodeLink('A', 'B')]
    const adjacencyList = buildAdjacencyList(links)

    expect(adjacencyList.get('a')!.has('b')).toBe(true)
    expect(adjacencyList.get('b')!.has('a')).toBe(true)
  })

  it('handles mixed string and object references', () => {
    const links: GraphLink[] = [{ source: 'A', target: { name: 'B' } as GraphNode, weight: 1 }]
    const adjacencyList = buildAdjacencyList(links)

    expect(adjacencyList.get('a')!.has('b')).toBe(true)
    expect(adjacencyList.get('b')!.has('a')).toBe(true)
  })
})
