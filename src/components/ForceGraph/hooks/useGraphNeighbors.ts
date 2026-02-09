import { useMemo } from 'react'
import type { GraphLink, GraphNode } from '../types'

function getNodeName(node: string | GraphNode): string {
  if (typeof node === 'string') return node
  return node.name
}

export function buildAdjacencyList(links: GraphLink[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()

  for (const link of links) {
    const sourceName = getNodeName(link.source)
    const targetName = getNodeName(link.target)

    const sourceKey = sourceName.toLowerCase()
    const targetKey = targetName.toLowerCase()

    if (!map.has(sourceKey)) map.set(sourceKey, new Set())
    map.get(sourceKey)!.add(targetKey)

    if (!map.has(targetKey)) map.set(targetKey, new Set())
    map.get(targetKey)!.add(sourceKey)
  }

  return map
}

/**
 * Hook to efficiently lookup neighbors of a node in the graph.
 * Pre-calculates an adjacency list for O(1) lookups.
 *
 * @param links List of graph links
 * @returns Function to get neighbors (Set of strings) for a given node name
 */
export function useGraphNeighbors(links: GraphLink[]) {
  const adjacencyList = useMemo(() => buildAdjacencyList(links), [links])

  return (nodeName: string) => {
    return adjacencyList.get(nodeName.toLowerCase()) || new Set<string>()
  }
}
