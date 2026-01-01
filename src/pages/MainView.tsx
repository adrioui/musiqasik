import { useCallback, useEffect, useRef, useState } from 'react'

import { AudioPlayer } from '@/components/AudioPlayer'
import { ForceGraph, type ForceGraphHandle } from '@/components/ForceGraph'
import { GalleryHeader } from '@/components/GalleryHeader'
import { useDiscoveryInjection } from '@/hooks/useDiscoveryInjection'
import { useLastFm } from '@/hooks/useLastFm'
import { useTasteTracking } from '@/hooks/useTasteTracking'
import { useTrackPreview } from '@/hooks/useTrackPreview'
import type { Artist, GraphData } from '@/types/artist'

const DEFAULT_ARTIST = 'Miles Davis'

export default function MainView() {
  const graphRef = useRef<ForceGraphHandle>(null)
  const { getGraph, isLoading } = useLastFm()
  const mergedDiscoveryRef = useRef(false)

  // Core state
  const [anchorArtist, setAnchorArtist] = useState<Artist | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)

  // Hooks
  const { track } = useTrackPreview(anchorArtist?.name ?? null)
  const { trackAnchorClick } = useTasteTracking()
  const { discoveryArtists } = useDiscoveryInjection(anchorArtist, graphData)

  // Load graph for an artist
  const loadGraph = useCallback(
    async (name: string) => {
      mergedDiscoveryRef.current = false // Reset merge flag on new load
      const data = await getGraph(name, 1) // Fixed depth of 1
      if (data) {
        setGraphData(data)
        setAnchorArtist(data.center)
      }
    },
    [getGraph],
  )

  // Load initial graph
  useEffect(() => {
    loadGraph(DEFAULT_ARTIST)
  }, [loadGraph])

  // Merge discovery artists into graph (only once per discovery batch)
  useEffect(() => {
    if (discoveryArtists.length > 0 && !mergedDiscoveryRef.current) {
      mergedDiscoveryRef.current = true
      setGraphData((prev) => {
        if (!prev || !prev.center) return prev
        // Check if discovery artists are already in the graph
        const existingNames = new Set(prev.nodes.map((n) => n.name.toLowerCase()))
        const newDiscoveries = discoveryArtists.filter(
          (d) => !existingNames.has(d.name.toLowerCase()),
        )
        if (newDiscoveries.length === 0) return prev
        return {
          ...prev,
          nodes: [...prev.nodes, ...newDiscoveries],
          edges: [
            ...prev.edges,
            ...newDiscoveries.map((d) => ({
              source: prev.center!.name,
              target: d.name,
              weight: 0.15,
            })),
          ],
        }
      })
    }
  }, [discoveryArtists])

  const handleNodeClick = useCallback(
    (artist: Artist) => {
      if (artist.name === anchorArtist?.name) return // Already anchor

      trackAnchorClick(artist.name)
      loadGraph(artist.name)
    },
    [anchorArtist, trackAnchorClick, loadGraph],
  )

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <GalleryHeader />

      {/* Graph Canvas */}
      <div className="absolute inset-0">
        <ForceGraph
          ref={graphRef}
          nodes={graphData?.nodes || []}
          edges={graphData?.edges || []}
          centerArtist={anchorArtist?.name || null}
          threshold={0}
          showLabels={true}
          onNodeClick={handleNodeClick}
          className="h-full w-full"
        />
      </div>

      {/* Anchor Label */}
      {anchorArtist && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
          <h1 className="font-display italic text-4xl md:text-5xl drop-shadow-lg">
            {anchorArtist.name}
          </h1>
        </div>
      )}

      {/* Audio Player */}
      <AudioPlayer track={track} />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-30">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
