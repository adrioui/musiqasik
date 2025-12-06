import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Artist, GraphData } from '@/types/artist';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lastfm`;

export function useLastFm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArtists = useCallback(async (query: string): Promise<Artist[]> => {
    if (!query.trim()) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${FUNCTION_URL}?action=search&q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGraph = useCallback(async (artistName: string, depth: number = 1): Promise<GraphData | null> => {
    if (!artistName.trim()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${FUNCTION_URL}?action=graph&artist=${encodeURIComponent(artistName)}&depth=${depth}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch graph');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch graph';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getArtist = useCallback(async (name: string): Promise<Artist | null> => {
    if (!name.trim()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${FUNCTION_URL}?action=artist&name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artist');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artist';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchArtists,
    getGraph,
    getArtist,
    isLoading,
    error,
  };
}