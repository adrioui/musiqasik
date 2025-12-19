import { useMemo } from 'react';
import type { Artist, SimilarityEdge, GraphNode, GraphLink } from '@/types/artist';

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

export function useGraphData({
  nodes,
  edges,
  centerArtist,
  threshold,
}: UseGraphDataProps): UseGraphDataResult {
  return useMemo(() => {
    const filteredEdges = edges.filter((e) => e.weight >= threshold);

    const connectedNodes = new Set<string>();
    filteredEdges.forEach((e) => {
      connectedNodes.add(e.source.toLowerCase());
      connectedNodes.add(e.target.toLowerCase());
    });

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

    const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

    const graphLinks: GraphLink[] = filteredEdges
      .map((edge) => {
        const source = nodeMap.get(edge.source.toLowerCase());
        const target = nodeMap.get(edge.target.toLowerCase());
        if (source && target) {
          return { source, target, weight: edge.weight } as GraphLink;
        }
        return null;
      })
      .filter((link): link is GraphLink => link !== null);

    return { filteredNodes, graphLinks, nodeMap };
  }, [nodes, edges, centerArtist, threshold]);
}
