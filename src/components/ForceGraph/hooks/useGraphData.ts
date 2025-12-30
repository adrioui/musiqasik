import { useMemo } from "react";
import type { Artist, SimilarityEdge } from "@/types/artist";

/**
 * Graph node with position and center flag for visualization.
 */
export interface GraphNode extends Artist {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  isCenter?: boolean;
}

/**
 * Graph link connecting two nodes.
 */
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

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
}

/**
 * JavaScript implementation of graph data processing.
 */
function processGraphData(
  nodes: Artist[],
  edges: SimilarityEdge[],
  centerArtist: string | null,
  threshold: number,
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
        n.name.toLowerCase() === centerArtist?.toLowerCase(),
    )
    .map((node) => ({
      ...node,
      isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
    }));

  // Build node map for link resolution
  const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

  // Create graph links
  const graphLinks: GraphLink[] = filteredEdges
    .filter((edge) => {
      const source = nodeMap.get(edge.source.toLowerCase());
      const target = nodeMap.get(edge.target.toLowerCase());
      return source && target;
    })
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }));

  return { nodes: filteredNodes, links: graphLinks };
}

/**
 * Hook that processes raw graph data for visualization.
 */
export function useGraphData({
  nodes,
  edges,
  centerArtist,
  threshold,
}: UseGraphDataProps): UseGraphDataResult {
  return useMemo(() => {
    const result = processGraphData(nodes, edges, centerArtist, threshold);
    const nodeMap = new Map(result.nodes.map((n) => [n.name.toLowerCase(), n]));

    return {
      filteredNodes: result.nodes,
      graphLinks: result.links,
      nodeMap,
    };
  }, [nodes, edges, centerArtist, threshold]);
}
