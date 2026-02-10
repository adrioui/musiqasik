import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from '../types'

export function useGraphNeighbors(graphLinks: GraphLink[]) {
  // Pre-calculate adjacency list for O(1) lookups
  // This transforms the neighbor lookup from O(E) to O(1) per interaction
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Set<string>>()

    for (const link of graphLinks) {
      // D3 mutates links to use objects, but initially they might be strings
      // We handle both cases to be safe
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as GraphNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as GraphNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!adj.has(sourceKey)) adj.set(sourceKey, new Set())
      if (!adj.has(targetKey)) adj.set(targetKey, new Set())

      adj.get(sourceKey)!.add(targetKey)
      adj.get(targetKey)!.add(sourceKey)
    }

    return adj
  }, [graphLinks])

  const getNeighbors = useCallback(
    (nodeName: string) => {
      return adjacencyList.get(nodeName.toLowerCase()) || new Set<string>()
    },
    [adjacencyList],
  )

  return { getNeighbors }
}
