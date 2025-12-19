import type { Artist, SimilarityEdge } from '@/types/artist';

export interface ForceGraphProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold: number;
  showLabels: boolean;
  onNodeClick: (artist: Artist) => void;
  className?: string;
}

export interface ForceGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}
