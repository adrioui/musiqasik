import { useCallback, useMemo } from 'react'
import type { GraphLink } from './useGraphData'

// Helper to get string ID from a node that might be a string or object
const getNodeId = (node: string | { name: string }): string => {
  return typeof node === 'string' ? node : node.name
}

export function useGraphNeighbors(links: GraphLink[]) {
  // Pre-calculate adjacency list for O(1) lookups
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, Set<string>>()

    for (const link of links) {
      const sourceId = getNodeId(link.source).toLowerCase()
      const targetId = getNodeId(link.target).toLowerCase()

      if (!adj.has(sourceId)) adj.set(sourceId, new Set())
      if (!adj.has(targetId)) adj.set(targetId, new Set())

      adj.get(sourceId)?.add(targetId)
      adj.get(targetId)?.add(sourceId)
    }

    return adj
  }, [links])

  const getNeighbors = useCallback(
    (nodeId: string) => {
      return adjacencyList.get(nodeId.toLowerCase()) ?? new Set()
    },
    [adjacencyList],
  )

  return { getNeighbors }
}
