import { useCallback, useMemo } from 'react'
import type { GraphLink, GraphNode } from './useGraphData'

export function useGraphNeighbors(graphLinks: GraphLink[]) {
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Set<string>>()
    for (const link of graphLinks) {
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
