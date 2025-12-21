import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { ArtistPanel } from '@/components/ArtistPanel';
import { GraphControls } from '@/components/GraphControls';
import { ArtistSearch } from '@/components/ArtistSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SkeletonGraph } from '@/components/SkeletonGraph';
import { useLastFm } from '@/hooks/useLastFm';
import { useSimilarArtists } from '@/hooks/useSimilarArtists';
import { Artist, GraphData } from '@/types/artist';
import { useToast } from '@/hooks/use-toast';

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();
  const graphRef = useRef<ForceGraphHandle>(null);

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [depth, setDepth] = useState(1);
  const [threshold, setThreshold] = useState(0);
  const [showLabels, setShowLabels] = useState(true);

  // Use memoized hook for similar artists
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
    [getGraph]
  );

  // Load initial data
  useEffect(() => {
    if (artistName) {
      loadGraph(decodeURIComponent(artistName), depth);
    }
  }, [artistName, depth, loadGraph]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleNodeClick = useCallback((artist: Artist) => {
    setSelectedArtist(artist);
  }, []);

  const handleRecenter = (name: string) => {
    navigate(`/artist/${encodeURIComponent(name)}`);
  };

  const handleSearchSelect = (artist: Artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Graph Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center gap-4 bg-gradient-to-b from-background via-background/80 to-transparent p-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Music2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">MusiqasiQ</h1>
              <p className="text-xs text-muted-foreground">Artist Similarity Map</p>
            </div>
          </div>
          <div className="ml-auto max-w-md flex-1">
            <ArtistSearch onSelect={handleSearchSelect} placeholder="Search another artist..." />
          </div>
          <ThemeToggle />
        </header>

        {/* Graph */}
        <div className="flex-1 pt-20">
          {isLoading ? (
            <div className="relative h-full">
              <SkeletonGraph />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="rounded-lg bg-background/80 px-4 py-2 text-muted-foreground backdrop-blur-sm">
                  Loading similarity graph...
                </p>
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
            />
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-4 w-64">
          <GraphControls
            depth={depth}
            onDepthChange={handleDepthChange}
            threshold={threshold}
            onThresholdChange={setThreshold}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onReset={() => graphRef.current?.reset()}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Side Panel */}
      <aside className="flex w-80 flex-col border-l border-border bg-card">
        <ArtistPanel
          artist={selectedArtist}
          similarArtists={similarArtists}
          onArtistClick={handleRecenter}
        />
      </aside>
    </div>
  );
}
