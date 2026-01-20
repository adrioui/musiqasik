import { useCallback, useMemo } from 'react'
import type { GraphLink, SimulationNode } from '../types'

/**
 * Hook to optimized neighbor lookup for graph nodes.
 * Pre-calculates an adjacency list to allow O(1) lookup during hover events.
 */
export function useGraphNeighbors(graphLinks: GraphLink[]) {
  // Pre-calculate adjacency list (neighbor map)
  // O(E) complexity, runs only when links change
  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>()

    for (const link of graphLinks) {
      // Handle both string IDs and object references (defensive)
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name

      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      // Add target to source's neighbors
      if (!map.has(sourceKey)) {
        map.set(sourceKey, new Set())
      }
      map.get(sourceKey)!.add(targetKey)

      // Add source to target's neighbors (undirected graph)
      if (!map.has(targetKey)) {
        map.set(targetKey, new Set())
      }
      map.get(targetKey)!.add(sourceKey)
    }

    return map
  }, [graphLinks])

  // O(1) lookup function
  const getNeighbors = useCallback(
    (nodeName: string) => {
      const key = nodeName.toLowerCase()
      return neighborMap.get(key) || new Set<string>()
    },
    [neighborMap],
  )

  return { getNeighbors }
}
