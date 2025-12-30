import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Artist, GraphData } from "@/types/artist";
import { useSimilarArtists } from "./useSimilarArtists";

describe("useSimilarArtists", () => {
  const createArtist = (name: string): Artist => ({
    name,
    listeners: 1000,
  });

  const createGraphData = (
    edges: Array<{ source: string; target: string; weight: number }>,
  ): GraphData => ({
    nodes: [],
    edges,
    center: null,
  });

  it("returns empty array when selectedArtist is null", () => {
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.9 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(null, graphData));

    expect(result.current).toEqual([]);
  });

  it("returns empty array when graphData is null", () => {
    const artist = createArtist("Artist A");

    const { result } = renderHook(() => useSimilarArtists(artist, null));

    expect(result.current).toEqual([]);
  });

  it("returns empty array when both params are null", () => {
    const { result } = renderHook(() => useSimilarArtists(null, null));

    expect(result.current).toEqual([]);
  });

  it("returns empty array when no edges match selected artist", () => {
    const artist = createArtist("Artist C");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.9 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toEqual([]);
  });

  it("finds similar artists when selected artist is source", () => {
    const artist = createArtist("Artist A");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.9 },
      { source: "Artist A", target: "Artist C", weight: 0.7 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toEqual({ name: "Artist B", weight: 0.9 });
    expect(result.current[1]).toEqual({ name: "Artist C", weight: 0.7 });
  });

  it("finds similar artists when selected artist is target", () => {
    const artist = createArtist("Artist B");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.9 },
      { source: "Artist C", target: "Artist B", weight: 0.8 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toEqual({ name: "Artist A", weight: 0.9 });
    expect(result.current[1]).toEqual({ name: "Artist C", weight: 0.8 });
  });

  it("handles case insensitivity for artist name matching", () => {
    const artist = createArtist("ARTIST A");
    const graphData = createGraphData([
      { source: "artist a", target: "Artist B", weight: 0.9 },
      { source: "Artist A", target: "Artist C", weight: 0.7 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toEqual({ name: "Artist B", weight: 0.9 });
    expect(result.current[1]).toEqual({ name: "Artist C", weight: 0.7 });
  });

  it("keeps higher weight when duplicate similar artists exist", () => {
    const artist = createArtist("Artist A");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.5 },
      { source: "Artist B", target: "Artist A", weight: 0.9 }, // Same pair, higher weight
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({ name: "Artist B", weight: 0.9 });
  });

  it("sorts results by weight in descending order", () => {
    const artist = createArtist("Artist A");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.3 },
      { source: "Artist A", target: "Artist C", weight: 0.9 },
      { source: "Artist A", target: "Artist D", weight: 0.6 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(3);
    expect(result.current[0].weight).toBe(0.9);
    expect(result.current[1].weight).toBe(0.6);
    expect(result.current[2].weight).toBe(0.3);
  });

  it("handles empty edges array", () => {
    const artist = createArtist("Artist A");
    const graphData = createGraphData([]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toEqual([]);
  });

  it("finds artists where selected is both source and target in different edges", () => {
    const artist = createArtist("Artist A");
    const graphData = createGraphData([
      { source: "Artist A", target: "Artist B", weight: 0.9 },
      { source: "Artist C", target: "Artist A", weight: 0.7 },
    ]);

    const { result } = renderHook(() => useSimilarArtists(artist, graphData));

    expect(result.current).toHaveLength(2);
    expect(result.current.map((a) => a.name)).toContain("Artist B");
    expect(result.current.map((a) => a.name)).toContain("Artist C");
  });
});
