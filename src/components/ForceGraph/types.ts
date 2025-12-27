import type { Artist, SimilarityEdge } from '@/types/artist';
import type { GraphNode, GraphLink } from '@/wasm/graph-service';

export type { GraphNode, GraphLink };

export interface EdgeClickInfo {
  source: string;
  target: string;
  weight: number;
  position: { x: number; y: number };
  sharedTags?: string[];
}

export interface ForceGraphProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold?: number;
  showLabels?: boolean;
  onNodeClick: (artist: Artist) => void;
  onEdgeClick?: (info: EdgeClickInfo) => void;
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
