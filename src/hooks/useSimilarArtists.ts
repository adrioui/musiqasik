import { useMemo } from 'react';
import type { Artist, GraphData } from '@/types/artist';

interface SimilarArtist {
  name: string;
  weight: number;
}

export function useSimilarArtists(
  selectedArtist: Artist | null,
  graphData: GraphData | null
): SimilarArtist[] {
  return useMemo(() => {
    if (!selectedArtist || !graphData) return [];

    const selectedName = selectedArtist.name.toLowerCase();
    const similarMap = new Map<string, { name: string; weight: number }>();

    for (const edge of graphData.edges) {
      const isSource = edge.source.toLowerCase() === selectedName;
      const isTarget = edge.target.toLowerCase() === selectedName;

      if (isSource || isTarget) {
        const otherName = isSource ? edge.target : edge.source;
        const normalized = otherName.toLowerCase();
        const existing = similarMap.get(normalized);

        if (!existing || edge.weight > existing.weight) {
          similarMap.set(normalized, { name: otherName, weight: edge.weight });
        }
      }
    }

    return Array.from(similarMap.values()).sort((a, b) => b.weight - a.weight);
  }, [selectedArtist, graphData]);
}
