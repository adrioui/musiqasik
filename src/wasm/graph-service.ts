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

export interface ResolvedLink {
  source: number;
  target: number;
  weight: number;
}

export interface ProcessedGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ResolvedGraph {
  nodes: GraphNode[];
  links: ResolvedLink[];
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
 * Resolve string-based links to integer indices for D3.
 */
export function resolveLinks(
  nodes: GraphNode[],
  links: GraphLink[]
): ResolvedLink[] | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.resolve_links(nodes, links);
  } catch (error) {
    console.error('[WASM] resolve_links failed:', error);
    return null;
  }
}

/**
 * Combined processing and resolution in one WASM call.
 * Most efficient for visualization pipeline.
 */
export function processAndResolveGraph(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): ResolvedGraph | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.process_and_resolve_graph(nodes, edges, centerArtist, threshold);
  } catch (error) {
    console.error('[WASM] process_and_resolve_graph failed:', error);
    return null;
  }
}

/**
 * Check if WASM graph processing is available.
 */
export function isWasmGraphAvailable(): boolean {
  return isWasmLoaded();
}
