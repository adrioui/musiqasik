import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from './index';
import type { Env } from './index';

// Mock the database and lastfm services
vi.mock('../../src/services/database', () => ({
  getArtistFromDb: vi.fn(),
  upsertArtist: vi.fn(),
  upsertEdge: vi.fn(),
}));

vi.mock('../../src/services/lastfm', () => ({
  getSimilarArtists: vi.fn(),
  getArtistInfo: vi.fn(),
}));

// Import after mocks to get mocked versions
import * as db from '../../src/services/database';
import * as lastfm from '../../src/services/lastfm';

describe('Worker API', () => {
  const mockEnv: Env = {
    SURREALDB_URL: 'http://localhost:8000',
    SURREALDB_NAMESPACE: 'test',
    SURREALDB_DATABASE: 'test',
    SURREALDB_USER: 'test',
    SURREALDB_PASS: 'test',
    LASTFM_API_KEY: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Reset mock implementations
    vi.mocked(db.getArtistFromDb).mockReset();
    vi.mocked(db.upsertArtist).mockReset();
    vi.mocked(db.upsertEdge).mockReset();
    vi.mocked(lastfm.getSimilarArtists).mockReset();
    vi.mocked(lastfm.getArtistInfo).mockReset();
  });

  describe('searchArtists', () => {
    it('should search for artists via API', async () => {
      const mockArtists = [
        { name: 'Radiohead', listeners: 1000000 },
        { name: 'Thom Yorke', listeners: 500000 },
      ];

      // Mock lastfm service
      vi.mocked(lastfm.getSimilarArtists).mockResolvedValue(mockArtists);

      const request = new Request('http://worker.test/?action=search&q=radiohead');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockArtists);
    });

    it('should handle missing query parameter', async () => {
      const request = new Request('http://worker.test/?action=search');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Query required');
    });
  });

  describe('buildGraph', () => {
    it('should build artist graph with BFS traversal', async () => {
      // Mock artist data
      const mockArtist = { id: '1', name: 'Radiohead' };
      const mockSimilar = [{ name: 'Thom Yorke', match: 0.95 }];

      // Mock database and API responses
      vi.mocked(db.getArtistFromDb).mockResolvedValue(mockArtist);
      vi.mocked(lastfm.getSimilarArtists).mockResolvedValue(mockSimilar);
      vi.mocked(db.upsertArtist).mockResolvedValue({ ...mockArtist, name: 'Thom Yorke' });

      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=1');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('center');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should respect depth limit', async () => {
      // Mock minimal data
      vi.mocked(db.getArtistFromDb).mockResolvedValue({ id: '1', name: 'Radiohead' });
      vi.mocked(lastfm.getSimilarArtists).mockResolvedValue([]);

      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=2');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });

    it('should cap depth at maximum value', async () => {
      // Mock minimal data
      vi.mocked(db.getArtistFromDb).mockResolvedValue({ id: '1', name: 'Radiohead' });
      vi.mocked(lastfm.getSimilarArtists).mockResolvedValue([]);

      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=10');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests', async () => {
      const request = new Request('http://worker.test/?action=search&q=test', {
        method: 'OPTIONS',
      });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
