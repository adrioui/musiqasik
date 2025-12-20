import type { Artist, SimilarityEdge } from '@/types/artist';
import type { GraphNode, GraphLink, ResolvedLink } from '@/wasm/graph-service';

export type { GraphNode, GraphLink, ResolvedLink };

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

/**
 * Node type for D3 force simulation.
 * Extends GraphNode with required position fields.
 */
export interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

/**
 * Link type for D3 force simulation.
 * D3 can accept either node objects or indices for source/target.
 * After simulation starts, D3 resolves indices to node objects.
 */
export interface SimulationLink {
  source: SimulationNode | number;
  target: SimulationNode | number;
  weight: number;
}
