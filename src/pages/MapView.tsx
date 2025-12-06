import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForceGraph } from '@/components/ForceGraph';
import { ArtistPanel } from '@/components/ArtistPanel';
import { GraphControls } from '@/components/GraphControls';
import { ArtistSearch } from '@/components/ArtistSearch';
import { useLastFm } from '@/hooks/useLastFm';
import { Artist, GraphData, SimilarityEdge } from '@/types/artist';
import { useToast } from '@/hooks/use-toast';

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [depth, setDepth] = useState(1);
  const [threshold, setThreshold] = useState(0);
  const [showLabels, setShowLabels] = useState(true);

  // Load graph data
  const loadGraph = useCallback(async (name: string, graphDepth: number) => {
    const data = await getGraph(name, graphDepth);
    if (data) {
      setGraphData(data);
      setSelectedArtist(data.center);
    }
  }, [getGraph]);

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

  const handleNodeClick = (artist: Artist) => {
    setSelectedArtist(artist);
  };

  const handleRecenter = (name: string) => {
    navigate(`/artist/${encodeURIComponent(name)}`);
  };

  const handleSearchSelect = (artist: Artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  // Get similar artists for the selected node
  const getSimilarArtists = (): { name: string; weight: number }[] => {
    if (!selectedArtist || !graphData) return [];
    
    return graphData.edges
      .filter((e) => 
        e.source.toLowerCase() === selectedArtist.name.toLowerCase() ||
        e.target.toLowerCase() === selectedArtist.name.toLowerCase()
      )
      .map((e) => ({
        name: e.source.toLowerCase() === selectedArtist.name.toLowerCase() ? e.target : e.source,
        weight: e.weight,
      }))
      .filter((item, index, self) => 
        index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
      )
      .sort((a, b) => b.weight - a.weight);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-4 bg-gradient-to-b from-background via-background/80 to-transparent">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Music2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">MusicGraph</h1>
              <p className="text-xs text-muted-foreground">Artist Similarity Map</p>
            </div>
          </div>
          <div className="flex-1 max-w-md ml-auto">
            <ArtistSearch onSelect={handleSearchSelect} placeholder="Search another artist..." />
          </div>
        </header>

        {/* Graph */}
        <div className="flex-1 pt-20">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading similarity graph...</p>
              </div>
            </div>
          ) : (
            <ForceGraph
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
        <div className="absolute left-4 bottom-4 w-64">
          <GraphControls
            depth={depth}
            onDepthChange={handleDepthChange}
            threshold={threshold}
            onThresholdChange={setThreshold}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            onZoomIn={() => (window as any).__graphZoomIn?.()}
            onZoomOut={() => (window as any).__graphZoomOut?.()}
            onReset={() => (window as any).__graphReset?.()}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Side Panel */}
      <aside className="w-80 border-l border-border bg-card flex flex-col">
        <ArtistPanel
          artist={selectedArtist}
          similarArtists={getSimilarArtists()}
          onArtistClick={handleRecenter}
        />
      </aside>
    </div>
  );
}