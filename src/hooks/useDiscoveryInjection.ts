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

  useEffect(() => {
    // Reset if anchor changed
    if (anchorArtist?.name !== lastAnchorRef.current) {
      lastAnchorRef.current = anchorArtist?.name ?? null
      setDiscoveryArtists([])
    }

    if (!anchorArtist || !currentGraph || discoveryArtists.length > 0) return

    const timer = setTimeout(async () => {
      // Get 3 distant nodes from current graph
      const distantNodes = currentGraph.nodes.filter((n) => n.name !== anchorArtist.name).slice(-3)

      if (distantNodes.length === 0) return

      const discoveries: DiscoveryArtist[] = []

      for (const distant of distantNodes) {
        try {
          const graph = await getGraph(distant.name, 1)
          if (graph?.nodes[1]) {
            // Mark as discovery node
            discoveries.push({
              ...graph.nodes[1],
              orbit: 'discovery',
            })
          }
        } catch {
          // Ignore failed fetches
        }
      }

      if (discoveries.length > 0) {
        setDiscoveryArtists(discoveries.slice(0, 3))
      }
    }, DISCOVERY_DELAY_MS)

    return () => clearTimeout(timer)
  }, [anchorArtist, currentGraph, getGraph, discoveryArtists.length])

  return { discoveryArtists }
}
