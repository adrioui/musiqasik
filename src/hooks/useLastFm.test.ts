import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLastFm } from './useLastFm';
import type { Artist, GraphData } from '@/types/artist';

describe('useLastFm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLastFm());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should search for artists', async () => {
    const mockArtists: Artist[] = [
      { name: 'Radiohead', listeners: 1000000 },
      { name: 'Thom Yorke', listeners: 500000 },
    ];

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArtists,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let searchResult: Artist[] = [];
    await act(async () => {
      searchResult = await result.current.searchArtists('radiohead');
    });

    await waitFor(() => {
      expect(searchResult).toEqual(mockArtists);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=search&q=radiohead')
    );
  });

  it('should handle search errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    await act(() => result.current.searchArtists('radiohead'));

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should fetch artist graph', async () => {
    const mockGraph: GraphData = {
      nodes: [{ name: 'Radiohead' }, { name: 'Thom Yorke' }],
      edges: [{ source: 'Radiohead', target: 'Thom Yorke', weight: 1.0 }],
      center: null,
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGraph,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let graphResult: GraphData | null = null;
    await act(async () => {
      graphResult = await result.current.getGraph('Radiohead', 1);
    });

    await waitFor(() => {
      expect(graphResult).toEqual(mockGraph);
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=graph&artist=Radiohead&depth=1')
    );
  });

  it('should fetch individual artist', async () => {
    const mockArtist: Artist = {
      name: 'Radiohead',
      listeners: 1000000,
      image_url: 'https://example.com/image.jpg',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArtist,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let artistResult: Artist | null = null;
    await act(async () => {
      artistResult = await result.current.getArtist('Radiohead');
    });

    await waitFor(() => {
      expect(artistResult).toEqual(mockArtist);
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=artist&name=Radiohead')
    );
  });

  it('should handle empty queries', async () => {
    const { result } = renderHook(() => useLastFm());

    let searchResult: Artist[] = [];
    await act(async () => {
      searchResult = await result.current.searchArtists('   ');
    });

    expect(searchResult).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
