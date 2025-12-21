import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Artist } from '@/types/artist';

// Mock the loader module
vi.mock('./loader', () => ({
  getWasmModule: vi.fn(),
  isWasmLoaded: vi.fn(),
}));

import { getWasmModule, isWasmLoaded } from './loader';
import { processGraphData, isWasmGraphAvailable, type Edge } from './graph-service';

describe('WASM Graph Service', () => {
  const mockArtists: Artist[] = [
    { id: '1', name: 'The Beatles', listeners: 1000000 },
    { id: '2', name: 'Radiohead', listeners: 500000 },
    { id: '3', name: 'Pink Floyd', listeners: 800000 },
  ];

  const mockEdges: Edge[] = [
    { source: 'The Beatles', target: 'Radiohead', weight: 0.8 },
    { source: 'The Beatles', target: 'Pink Floyd', weight: 0.3 },
    { source: 'Radiohead', target: 'Pink Floyd', weight: 0.6 },
  ];

  const mockWasmModule = {
    process_graph_data: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isWasmGraphAvailable', () => {
    it('should return true when WASM is loaded', () => {
      vi.mocked(isWasmLoaded).mockReturnValue(true);
      expect(isWasmGraphAvailable()).toBe(true);
    });

    it('should return false when WASM is not loaded', () => {
      vi.mocked(isWasmLoaded).mockReturnValue(false);
      expect(isWasmGraphAvailable()).toBe(false);
    });
  });

  describe('processGraphData', () => {
    it('should return null when WASM module is not available', () => {
      vi.mocked(getWasmModule).mockReturnValue(null);

      const result = processGraphData(mockArtists, mockEdges, 'The Beatles', 0.5);

      expect(result).toBeNull();
    });

    it('should call WASM process_graph_data with correct arguments', () => {
      const expectedResult = {
        nodes: [{ name: 'The Beatles', isCenter: true }],
        links: [{ source: 'The Beatles', target: 'Radiohead', weight: 0.8 }],
      };
      mockWasmModule.process_graph_data.mockReturnValue(expectedResult);
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData(mockArtists, mockEdges, 'The Beatles', 0.5);

      expect(mockWasmModule.process_graph_data).toHaveBeenCalledWith(
        mockArtists,
        mockEdges,
        'The Beatles',
        0.5
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle null center artist', () => {
      const expectedResult = {
        nodes: [{ name: 'The Beatles', isCenter: false }],
        links: [],
      };
      mockWasmModule.process_graph_data.mockReturnValue(expectedResult);
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData(mockArtists, mockEdges, null, 0.5);

      expect(mockWasmModule.process_graph_data).toHaveBeenCalledWith(
        mockArtists,
        mockEdges,
        null,
        0.5
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return null and log error when WASM throws', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWasmModule.process_graph_data.mockImplementation(() => {
        throw new Error('WASM error');
      });
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData(mockArtists, mockEdges, 'The Beatles', 0.5);

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        '[WASM] process_graph_data failed:',
        expect.any(Error)
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arrays', () => {
      const expectedResult = { nodes: [], links: [] };
      mockWasmModule.process_graph_data.mockReturnValue(expectedResult);
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData([], [], null, 0);

      expect(result).toEqual(expectedResult);
    });

    it('should handle zero threshold', () => {
      const expectedResult = {
        nodes: mockArtists.map((a) => ({ ...a, isCenter: false })),
        links: mockEdges,
      };
      mockWasmModule.process_graph_data.mockReturnValue(expectedResult);
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData(mockArtists, mockEdges, null, 0);

      expect(mockWasmModule.process_graph_data).toHaveBeenCalledWith(
        mockArtists,
        mockEdges,
        null,
        0
      );
    });

    it('should handle threshold of 1', () => {
      const expectedResult = { nodes: [], links: [] };
      mockWasmModule.process_graph_data.mockReturnValue(expectedResult);
      vi.mocked(getWasmModule).mockReturnValue(mockWasmModule as never);

      const result = processGraphData(mockArtists, mockEdges, null, 1);

      expect(mockWasmModule.process_graph_data).toHaveBeenCalledWith(
        mockArtists,
        mockEdges,
        null,
        1
      );
    });
  });
});
