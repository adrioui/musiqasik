import { useMemo } from 'react'
import type { GraphLink, GraphNode } from './useGraphData'

/**
 * Hook to pre-calculate adjacency list for O(1) neighbor lookups.
 * Handles both string IDs and object references (post-D3-mutation).
 */
export function useGraphNeighbors(links: GraphLink[]) {
  return useMemo(() => {
    const adjacencyList = new Map<string, Set<string>>()

    for (const link of links) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as GraphNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as GraphNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!adjacencyList.has(sourceKey)) adjacencyList.set(sourceKey, new Set())
      if (!adjacencyList.has(targetKey)) adjacencyList.set(targetKey, new Set())

      adjacencyList.get(sourceKey)?.add(targetKey)
      adjacencyList.get(targetKey)?.add(sourceKey)
    }

    return adjacencyList
  }, [links])
}
