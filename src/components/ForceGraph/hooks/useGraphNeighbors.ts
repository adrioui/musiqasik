import { useCallback, useMemo } from 'react'
import type { GraphLink, SimulationNode } from '../types'

export function useGraphNeighbors(graphLinks: GraphLink[]) {
  // Pre-calculate adjacency list for O(1) neighbor lookup
  const neighborsMap = useMemo(() => {
    const map = new Map<string, Set<string>>()

    for (const link of graphLinks) {
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
  }, [graphLinks])

  const getNeighbors = useCallback(
    (nodeName: string) => {
      return neighborsMap.get(nodeName.toLowerCase()) || new Set<string>()
    },
    [neighborsMap],
  )

  return { getNeighbors }
}
