import { getWasmModule, isWasmLoaded } from './loader';
import type { Artist } from '@/types/artist';

export interface Edge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphNode {
  id?: string;
  name: string;
  lastfm_mbid?: string;
  url?: string;
  image_url?: string;
  listeners?: number;
  playcount?: number;
  tags?: string[];
  lastfm_url?: string;
  isCenter: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface ProcessedGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Process graph data using WASM.
 * Filters edges by threshold and nodes by connectivity.
 */
export function processGraphData(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): ProcessedGraph | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.process_graph_data(nodes, edges, centerArtist, threshold);
  } catch (error) {
    console.error('[WASM] process_graph_data failed:', error);
    return null;
  }
}

/**
 * Check if WASM graph processing is available.
 */
export function isWasmGraphAvailable(): boolean {
  return isWasmLoaded();
}
