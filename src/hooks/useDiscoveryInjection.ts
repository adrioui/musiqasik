import { useEffect, useRef, useState } from 'react'

import type { Artist, GraphData } from '@/types/artist'

import { useLastFm } from './useLastFm'

const DISCOVERY_DELAY_MS = 60000 // 1 minute

export interface DiscoveryArtist extends Artist {
  orbit?: 'discovery'
}

export function useDiscoveryInjection(anchorArtist: Artist | null, currentGraph: GraphData | null) {
  const [discoveryArtists, setDiscoveryArtists] = useState<DiscoveryArtist[]>([])
  const { getGraph } = useLastFm()
  const lastAnchorRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasDiscoveredRef = useRef(false)
  // Store currentGraph in ref to avoid effect dependency on object reference
  const currentGraphRef = useRef<GraphData | null>(null)
  currentGraphRef.current = currentGraph

  useEffect(() => {
    // Reset if anchor changed
    if (anchorArtist?.name !== lastAnchorRef.current) {
      lastAnchorRef.current = anchorArtist?.name ?? null
      setDiscoveryArtists([])
      hasDiscoveredRef.current = false

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    // Don't set up timer if already discovered or missing data
    if (!anchorArtist || hasDiscoveredRef.current) return

    // Wait for graph data before setting timer (check ref to avoid dependency)
    if (!currentGraphRef.current) return

    // Don't set up another timer if one is already running
    if (timerRef.current) return

    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      const graph = currentGraphRef.current
      if (!graph) return

      // Get 3 distant nodes from current graph
      const distantNodes = graph.nodes.filter((n) => n.name !== anchorArtist.name).slice(-3)

      if (distantNodes.length === 0) return

      const discoveries: DiscoveryArtist[] = []

      for (const distant of distantNodes) {
        try {
          const result = await getGraph(distant.name, 1)
          if (result?.nodes[1]) {
            // Mark as discovery node
            discoveries.push({
              ...result.nodes[1],
              orbit: 'discovery',
            })
          }
        } catch {
          // Ignore failed fetches
        }
      }

      if (discoveries.length > 0) {
        hasDiscoveredRef.current = true
        setDiscoveryArtists(discoveries.slice(0, 3))
      }
    }, DISCOVERY_DELAY_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [anchorArtist, getGraph])

  return { discoveryArtists }
}
