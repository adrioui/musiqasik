import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArtistDetailSheet } from "@/components/ArtistDetailSheet";
import { ArtistSearch } from "@/components/ArtistSearch";
import { EdgeCard } from "@/components/EdgeCard";
import { FloatingNav } from "@/components/FloatingNav";
import { ForceGraph, type ForceGraphHandle } from "@/components/ForceGraph";
import type { EdgeClickInfo } from "@/components/ForceGraph/types";
import { LensesTray } from "@/components/LensesTray";
import { ShareModal } from "@/components/ShareModal";
import { SkeletonGraph } from "@/components/SkeletonGraph";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { GlassCard } from "@/components/ui/glass-card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useToast } from "@/hooks/use-toast";
import { useLastFm } from "@/hooks/useLastFm";
import { useSimilarArtists } from "@/hooks/useSimilarArtists";
import type { Artist, GraphData } from "@/types/artist";

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();
  const graphRef = useRef<ForceGraphHandle>(null);

  // State
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [depth, setDepth] = useState(() => {
    const d = searchParams.get("depth");
    return d ? parseInt(d, 10) : 1;
  });
  const [threshold, setThreshold] = useState(() => {
    const t = searchParams.get("threshold");
    return t ? parseFloat(t) : 0;
  });
  const [showLabels, setShowLabels] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [edgeInfo, setEdgeInfo] = useState<EdgeClickInfo | null>(null);

  const similarArtists = useSimilarArtists(selectedArtist, graphData);

  // Load graph data
  const loadGraph = useCallback(
    async (name: string, graphDepth: number) => {
      const data = await getGraph(name, graphDepth);
      if (data) {
        setGraphData(data);
        setSelectedArtist(data.center);
      }
    },
    [getGraph],
  );

  useEffect(() => {
    if (artistName) {
      loadGraph(decodeURIComponent(artistName), depth);
    }
  }, [artistName, depth, loadGraph]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("depth", depth.toString());
    params.set("threshold", threshold.toString());
    setSearchParams(params, { replace: true });
  }, [depth, threshold, setSearchParams]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Callbacks
  const handleNodeClick = useCallback((artist: Artist) => {
    setSelectedArtist(artist);
    setSheetOpen(true);
    setEdgeInfo(null);
  }, []);

  const handleEdgeClick = useCallback((info: EdgeClickInfo) => {
    setEdgeInfo(info);
    setSheetOpen(false);
  }, []);

  const handleRecenter = useCallback(
    (name: string) => {
      navigate(`/artist/${encodeURIComponent(name)}`);
      setSheetOpen(false);
      setEdgeInfo(null);
    },
    [navigate],
  );

  const handleSearchSelect = useCallback(
    (artist: Artist) => {
      navigate(`/artist/${encodeURIComponent(artist.name)}`);
      setSearchOpen(false);
    },
    [navigate],
  );

  // Close overlays when clicking graph background
  const handleBackgroundClick = useCallback(() => {
    setEdgeInfo(null);
    if (searchOpen) setSearchOpen(false);
  }, [searchOpen]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Full-screen Graph */}
      <div className="absolute inset-0" onClick={handleBackgroundClick}>
        {isLoading ? (
          <div className="relative h-full">
            <SkeletonGraph />
            <div className="absolute inset-0 flex items-center justify-center">
              <GlassCard className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <MaterialIcon
                    name="progress_activity"
                    size="sm"
                    className="animate-spin text-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Loading similarity graph...
                  </span>
                </div>
              </GlassCard>
            </div>
          </div>
        ) : (
          <ForceGraph
            ref={graphRef}
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            centerArtist={graphData?.center?.name || null}
            threshold={threshold}
            showLabels={showLabels}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Overlay Layer - pointer-events-none on container, pointer-events-auto on children */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top Left - Navigation */}
        <FloatingPanel position="top-left">
          <FloatingNav onSearchClick={() => setSearchOpen(true)} />
        </FloatingPanel>

        {/* Top Center - Search (conditional) */}
        {searchOpen && (
          <FloatingPanel position="top-center" className="w-full max-w-md">
            <GlassCard className="p-2">
              <ArtistSearch
                onSelect={handleSearchSelect}
                placeholder="Search artists..."
                autoFocus
              />
            </GlassCard>
          </FloatingPanel>
        )}

        {/* Top Right - Actions */}
        <FloatingPanel position="top-right" className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            className="bg-card/75 backdrop-blur-sm"
            onClick={() => setShareOpen(true)}
          >
            <MaterialIcon name="share" size="sm" />
            <span className="sr-only">Share</span>
          </Button>
        </FloatingPanel>

        {/* Bottom Left - Controls */}
        <FloatingPanel position="bottom-left">
          <LensesTray
            depth={depth}
            onDepthChange={setDepth}
            threshold={threshold}
            onThresholdChange={setThreshold}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onReset={() => graphRef.current?.reset()}
            isLoading={isLoading}
          />
        </FloatingPanel>

        {/* Bottom Center - Instructional Text */}
        <FloatingPanel position="bottom-center">
          <p className="pointer-events-auto rounded-full bg-card/60 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
            Artists closer together are more similar. Click anything to explore.
          </p>
        </FloatingPanel>

        {/* Edge Card (when edge is clicked) */}
        {edgeInfo && (
          <EdgeCard
            sourceArtist={edgeInfo.source}
            targetArtist={edgeInfo.target}
            weight={edgeInfo.weight}
            position={edgeInfo.position}
            sharedTags={edgeInfo.sharedTags}
            onClose={() => setEdgeInfo(null)}
            onArtistClick={handleRecenter}
          />
        )}
      </div>

      {/* Slide-in Artist Sheet */}
      <ArtistDetailSheet
        artist={selectedArtist}
        similarArtists={similarArtists}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onArtistClick={(name) => {
          const artist = graphData?.nodes.find((n) => n.name === name);
          if (artist) {
            setSelectedArtist(artist);
          }
        }}
        onExploreClick={handleRecenter}
      />

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        graphState={{
          artist: artistName ? decodeURIComponent(artistName) : "",
          depth,
          threshold,
        }}
        onExportImage={() =>
          graphRef.current?.exportImage() ?? Promise.resolve(null)
        }
      />
    </div>
  );
}
