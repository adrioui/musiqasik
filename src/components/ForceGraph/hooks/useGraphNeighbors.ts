import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from './useGraphData'

/**
 * Hook to efficiently calculate neighbor relationships in the graph.
 * Uses an adjacency list for O(1) lookup performance.
 */
export function useGraphNeighbors(links: GraphLink[]) {
  // Build adjacency list for O(1) neighbor lookup
  const adjacencyList = useMemo(() => {
    const adjList = new Map<string, Set<string>>()

    for (const link of links) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as GraphNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as GraphNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!adjList.has(sourceKey)) {
        adjList.set(sourceKey, new Set())
      }
      if (!adjList.has(targetKey)) {
        adjList.set(targetKey, new Set())
      }

      adjList.get(sourceKey)?.add(targetKey)
      adjList.get(targetKey)?.add(sourceKey)
    }

    return adjList
  }, [links])

  /**
   * Returns a Set of neighbor IDs (lowercase names) for a given node.
   * This is now an O(1) operation instead of O(E).
   */
  const getNeighbors = useCallback(
    (nodeName: string) => {
      return adjacencyList.get(nodeName.toLowerCase()) ?? new Set<string>()
    },
    [adjacencyList],
  )

  return { getNeighbors }
}
