import { useMemo } from 'react';
import type { Artist, SimilarityEdge } from '@/types/artist';
import {
  isWasmGraphAvailable,
  processGraphData as wasmProcessGraphData,
  type GraphNode,
  type GraphLink,
} from '@/wasm/graph-service';

interface UseGraphDataProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold: number;
}

interface UseGraphDataResult {
  filteredNodes: GraphNode[];
  graphLinks: GraphLink[];
  nodeMap: Map<string, GraphNode>;
  usedWasm: boolean;
}

/**
 * JavaScript fallback implementation of graph data processing.
 */
function processGraphDataJS(
  nodes: Artist[],
  edges: SimilarityEdge[],
  centerArtist: string | null,
  threshold: number
): { nodes: GraphNode[]; links: GraphLink[] } {
  // Filter edges by threshold
  const filteredEdges = edges.filter((e) => e.weight >= threshold);

  // Build connected nodes set
  const connectedNodes = new Set<string>();
  filteredEdges.forEach((e) => {
    connectedNodes.add(e.source.toLowerCase());
    connectedNodes.add(e.target.toLowerCase());
  });

  // Filter and transform nodes
  const filteredNodes: GraphNode[] = nodes
    .filter(
      (n) =>
        connectedNodes.has(n.name.toLowerCase()) ||
        n.name.toLowerCase() === centerArtist?.toLowerCase()
    )
    .map((node) => ({
      ...node,
      isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
    }));

  // Build node map for link resolution
  const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

  // Create graph links
  const graphLinks: GraphLink[] = filteredEdges
    .map((edge) => {
      const source = nodeMap.get(edge.source.toLowerCase());
      const target = nodeMap.get(edge.target.toLowerCase());
      if (source && target) {
        return { source: edge.source, target: edge.target, weight: edge.weight };
      }
      return null;
    })
    .filter((link): link is GraphLink => link !== null);

  return { nodes: filteredNodes, links: graphLinks };
}

/**
 * Hook that processes raw graph data for visualization.
 * Uses WASM when available for better performance.
 */
export function useGraphData({
  nodes,
  edges,
  centerArtist,
  threshold,
}: UseGraphDataProps): UseGraphDataResult {
  return useMemo(() => {
    // Try WASM first
    if (isWasmGraphAvailable()) {
      const result = wasmProcessGraphData(nodes, edges, centerArtist, threshold);
      if (result) {
        const nodeMap = new Map(
          result.nodes.map((n) => [n.name.toLowerCase(), n])
        );
        return {
          filteredNodes: result.nodes,
          graphLinks: result.links,
          nodeMap,
          usedWasm: true,
        };
      }
    }

    // JavaScript fallback
    const result = processGraphDataJS(nodes, edges, centerArtist, threshold);
    const nodeMap = new Map(result.nodes.map((n) => [n.name.toLowerCase(), n]));

    return {
      filteredNodes: result.nodes,
      graphLinks: result.links,
      nodeMap,
      usedWasm: false,
    };
  }, [nodes, edges, centerArtist, threshold]);
}
