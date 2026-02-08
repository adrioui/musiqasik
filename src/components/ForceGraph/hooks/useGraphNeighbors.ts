import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from './useGraphData'

/**
 * Hook to optimized neighbor lookups for the force graph.
 * Pre-calculates an adjacency list to allow O(1) lookups instead of O(E).
 *
 * Performance Impact:
 * - Reduces hover interaction cost from O(E) to O(1)
 * - E = number of edges, which can be large in dense graphs
 * - Essential for 60fps responsiveness during rapid mouse movements
 */
export function useGraphNeighbors(links: GraphLink[]) {
  // Build adjacency list for O(1) lookups
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Set<string>>()

    for (const link of links) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as GraphNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as GraphNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!adj.has(sourceKey)) {
        adj.set(sourceKey, new Set())
      }
      if (!adj.has(targetKey)) {
        adj.set(targetKey, new Set())
      }

      adj.get(sourceKey)!.add(targetKey)
      adj.get(targetKey)!.add(sourceKey)
    }

    return adj
  }, [links])

  // Return function to get neighbors for a node
  const getNeighbors = useCallback(
    (nodeName: string) => {
      return adjacencyList.get(nodeName.toLowerCase()) || new Set<string>()
    },
    [adjacencyList],
  )

  return getNeighbors
}
