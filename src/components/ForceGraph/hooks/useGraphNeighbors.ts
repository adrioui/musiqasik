import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from '../types'

/**
 * Hook to efficiently retrieve neighbors of a node.
 * Uses an adjacency list for O(1) lookups instead of iterating over links O(E).
 */
export function useGraphNeighbors(graphLinks: GraphLink[]) {
  // Pre-calculate adjacency list
  const adjacencyList = useMemo(() => {
    const adjList = new Map<string, Set<string>>()

    for (const link of graphLinks) {
      // Handle both string IDs and object references (D3 mutation)
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as GraphNode).name

      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as GraphNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!adjList.has(sourceKey)) adjList.set(sourceKey, new Set())
      if (!adjList.has(targetKey)) adjList.set(targetKey, new Set())

      adjList.get(sourceKey)?.add(targetKey)
      adjList.get(targetKey)?.add(sourceKey)
    }

    return adjList
  }, [graphLinks])

  // Return memoized lookup function
  const getNeighbors = useCallback(
    (nodeName: string) => {
      const key = nodeName.toLowerCase()
      return adjacencyList.get(key) || new Set<string>()
    },
    [adjacencyList],
  )

  return { getNeighbors }
}
