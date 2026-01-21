import { useCallback, useMemo } from 'react'
import type { GraphLink } from './useGraphData'
import type { SimulationNode } from '../types'

/**
 * Hook to efficiently retrieve neighbor nodes for a given node.
 * Uses an adjacency list pre-calculated with useMemo to ensure O(1) lookup complexity.
 */
export function useGraphNeighbors(links: GraphLink[]) {
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>()

    for (const link of links) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name

      const sourceKey = sourceName.toLowerCase()
      const targetKey = targetName.toLowerCase()

      if (!map.has(sourceKey)) map.set(sourceKey, new Set())
      if (!map.has(targetKey)) map.set(targetKey, new Set())

      map.get(sourceKey)!.add(targetKey)
      map.get(targetKey)!.add(sourceKey)
    }

    return map
  }, [links])

  return useCallback(
    (nodeName: string) => {
      const key = nodeName.toLowerCase()
      return adjacencyMap.get(key) || new Set<string>()
    },
    [adjacencyMap],
  )
}
