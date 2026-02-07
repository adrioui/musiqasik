import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from '../types'

/**
 * Hook to pre-calculate adjacency list for O(1) neighbor lookups.
 *
 * @param links List of graph links
 * @returns Object containing getNeighbors function
 */
export function useGraphNeighbors(links: GraphLink[]) {
  // Build adjacency list map: node -> Set of neighbor IDs
  // Memoized so it only rebuilds when links change
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Set<string>>()

    for (const link of links) {
      // Handle both string IDs and object references (d3 simulation)
      const sourceId =
        typeof link.source === 'object' ? (link.source as GraphNode).name : link.source
      const targetId =
        typeof link.target === 'object' ? (link.target as GraphNode).name : link.target

      if (!sourceId || !targetId) continue

      const sourceKey = String(sourceId).toLowerCase()
      const targetKey = String(targetId).toLowerCase()

      if (!adj.has(sourceKey)) adj.set(sourceKey, new Set())
      if (!adj.has(targetKey)) adj.set(targetKey, new Set())

      adj.get(sourceKey)!.add(targetKey)
      adj.get(targetKey)!.add(sourceKey)
    }

    return adj
  }, [links])

  const getNeighbors = useCallback(
    (nodeId: string) => {
      return adjacencyList.get(nodeId.toLowerCase()) || new Set<string>()
    },
    [adjacencyList],
  )

  return { getNeighbors }
}
