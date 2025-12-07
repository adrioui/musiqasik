import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function for fetch with retry logic
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options, 5000);
    } catch (error) {
      if (i === maxRetries) throw error;
      // Exponential backoff: 100ms, 200ms, 400ms...
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

interface ArtistData {
  id?: string;
  name: string;
  lastfm_mbid?: string;
  image_url?: string;
  listeners?: number;
  playcount?: number;
  tags?: string[];
  lastfm_url?: string;
}

interface EdgeInsertData {
  source_artist_id: string;
  target_artist_id: string;
  match_score: number;
  depth: number;
}

interface LastFmArtist {
  name: string;
  mbid?: string;
  image?: Array<{ size: string; '#text': string }>;
  listeners?: string;
  url?: string;
  stats?: {
    listeners?: string;
    playcount?: string;
  };
  tags?: {
    tag?: Array<{ name: string }>;
  };
}

interface LastFmSimilarArtist {
  name: string;
  match: string;
}

interface LastFmSearchResponse {
  results?: {
    artistmatches?: {
      artist?: LastFmArtist[];
    };
  };
}

interface LastFmArtistInfoResponse {
  error?: number;
  artist?: LastFmArtist;
}

interface LastFmSimilarResponse {
  similarartists?: {
    artist?: LastFmSimilarArtist[];
  };
}

interface DeezerArtistResponse {
  data?: Array<{
    picture_xl?: string;
  }>;
}

// Check if image URL is the Last.fm placeholder (white star)
function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  // Last.fm placeholder images contain these patterns
  return url.includes('2a96cbd8b46e442fc41c2b86b821562f') || 
         url.includes('star') ||
         url === '' ||
         url.endsWith('/noimage/');
}

// Fetch artist image from Deezer API (no API key required)
async function fetchDeezerImage(artistName: string): Promise<string | undefined> {
  try {
    console.log(`Fetching Deezer image for: ${artistName}`);
    const response = await fetchWithTimeout(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
    );

    if (!response.ok) return undefined;

    const data: DeezerArtistResponse = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Deezer returns picture, picture_small, picture_medium, picture_big, picture_xl
      return data.data[0].picture_xl;
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching Deezer image:', error);
    return undefined;
  }
}

async function searchArtists(query: string): Promise<ArtistData[]> {
  console.log(`Searching for artists with query: ${query}`);
  
  const response = await fetchWithRetry(
    `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data: LastFmSearchResponse = await response.json();
  const artists = data.results?.artistmatches?.artist || [];
  
  return artists.map((artist: LastFmArtist) => {
    const lastfmImage = artist.image?.find((img) => img.size === 'large')?.['#text'];
    return {
      name: artist.name,
      lastfm_mbid: artist.mbid || undefined,
      // Don't include placeholder images
      image_url: isPlaceholderImage(lastfmImage) ? undefined : lastfmImage,
      listeners: artist.listeners ? parseInt(artist.listeners) : undefined,
      lastfm_url: artist.url || undefined,
    };
  });
}

async function getArtistInfo(artistName: string): Promise<ArtistData | null> {
  console.log(`Getting info for artist: ${artistName}`);
  
  const response = await fetchWithRetry(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data: LastFmArtistInfoResponse = await response.json();
  if (data.error || !data.artist) return null;
  
  const artist = data.artist;
  const lastfmImage = artist.image?.find((img) => img.size === 'extralarge')?.['#text'];
  const mbid = artist.mbid || undefined;
  
  // Try to get image from Deezer if Last.fm returns placeholder
  let imageUrl: string | undefined;
  if (isPlaceholderImage(lastfmImage)) {
    imageUrl = await fetchDeezerImage(artist.name);
  } else {
    imageUrl = lastfmImage;
  }
  
  return {
    name: artist.name,
    lastfm_mbid: mbid,
    image_url: imageUrl,
    listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners) : undefined,
    playcount: artist.stats?.playcount ? parseInt(artist.stats.playcount) : undefined,
    tags: artist.tags?.tag?.map((t) => t.name) || [],
    lastfm_url: artist.url || undefined,
  };
}

async function getSimilarArtists(artistName: string): Promise<{ name: string; match: number }[]> {
  console.log(`Getting similar artists for: ${artistName}`);
  
  const response = await fetchWithRetry(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&limit=15`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data: LastFmSimilarResponse = await response.json();
  const similar = data.similarartists?.artist || [];
  
  return similar.map((artist: LastFmSimilarArtist) => ({
    name: artist.name,
    match: parseFloat(artist.match),
  }));
}

async function getOrCreateArtist(artistName: string): Promise<ArtistData | null> {
  const { data: cached } = await supabase
    .from('artists')
    .select('*')
    .ilike('name', artistName)
    .maybeSingle();
  
  if (cached) return cached;
  
  const artistInfo = await getArtistInfo(artistName);
  if (!artistInfo) return null;
  
  const { data: inserted, error } = await supabase
    .from('artists')
    .upsert({
      name: artistInfo.name,
      lastfm_mbid: artistInfo.lastfm_mbid,
      image_url: artistInfo.image_url,
      listeners: artistInfo.listeners,
      playcount: artistInfo.playcount,
      tags: artistInfo.tags,
      lastfm_url: artistInfo.lastfm_url,
    }, { onConflict: 'name' })
    .select()
    .single();
  
  if (error) {
    console.error('Error caching artist:', error);
    return artistInfo;
  }
  
  return inserted;
}

// Queue implementation for efficient BFS
interface QueueItem { name: string; currentDepth: number }
class Queue {
  private items: QueueItem[] = [];
  private head = 0;
  
  enqueue(item: QueueItem): void {
    this.items.push(item);
  }
  
  dequeue(): QueueItem | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head];
    this.head++;
    // Optional: clean up when head gets too large
    if (this.head > 1000) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }
  
  get length(): number {
    return this.items.length - this.head;
  }
}

async function getSimilarityGraph(artistName: string, depth: number = 1) {
  console.log(`Building similarity graph for ${artistName} with depth ${depth}`);
  
  // Per-request artist cache
  const artistCache = new Map<string, Promise<ArtistData | null>>();
  
  async function getOrCreateArtistCached(artistName: string): Promise<ArtistData | null> {
    const key = artistName.toLowerCase();
    if (artistCache.has(key)) {
      return artistCache.get(key)!;
    }

    const promise = getOrCreateArtist(artistName);
    artistCache.set(key, promise);
    return promise;
  }
  
  const centerArtist = await getOrCreateArtistCached(artistName);
  if (!centerArtist) return { nodes: [], edges: [], center: null };
  
  const nodes: Map<string, ArtistData> = new Map();
  const edges: { source: string; target: string; weight: number }[] = [];
  const processed: Set<string> = new Set();
  const queue = new Queue();
  queue.enqueue({ name: centerArtist.name, currentDepth: 0 });
  
  nodes.set(centerArtist.name.toLowerCase(), centerArtist);
  
  while (queue.length > 0) {
    const item = queue.dequeue();
    if (!item) break;
    const { name, currentDepth } = item;
    const nameLower = name.toLowerCase();
    
    if (processed.has(nameLower) || currentDepth >= depth) continue;
    processed.add(nameLower);
    
    const sourceArtist = nodes.get(nameLower);
    if (!sourceArtist?.id) continue;
    
    const { data: cachedEdges } = await supabase
      .from('similarity_edges')
      .select(`target_artist_id, match_score, target:artists!similarity_edges_target_artist_id_fkey(*)`)
      .eq('source_artist_id', sourceArtist.id);
    
    if (cachedEdges && cachedEdges.length > 0) {
      for (const edge of cachedEdges) {
        const target = edge.target as unknown as ArtistData;
        if (target) {
          const targetNameLower = target.name.toLowerCase();
          if (!nodes.has(targetNameLower)) {
            nodes.set(targetNameLower, target);
            if (currentDepth + 1 < depth) queue.enqueue({ name: target.name, currentDepth: currentDepth + 1 });
          }
          edges.push({ source: sourceArtist.name, target: target.name, weight: edge.match_score });
        }
      }
    } else {
      const similarArtists = await getSimilarArtists(name);
      
      // Parallelize artist lookups
      const artistLookups = similarArtists.slice(0, 10).map(similar =>
        getOrCreateArtistCached(similar.name).then(targetArtist => ({
          targetArtist,
          match: similar.match
        }))
      );
      
      const results = await Promise.all(artistLookups);
      const edgesToInsert: EdgeInsertData[] = [];
      
      for (const { targetArtist, match } of results) {
        if (!targetArtist?.id) continue;
        
        const targetNameLower = targetArtist.name.toLowerCase();
        if (!nodes.has(targetNameLower)) {
          nodes.set(targetNameLower, targetArtist);
          if (currentDepth + 1 < depth) queue.enqueue({ name: targetArtist.name, currentDepth: currentDepth + 1 });
        }
        
        edgesToInsert.push({
          source_artist_id: sourceArtist.id,
          target_artist_id: targetArtist.id,
          match_score: match,
          depth: currentDepth + 1,
        });
        
        edges.push({ source: sourceArtist.name, target: targetArtist.name, weight: match });
      }
      
      // Batch insert edges
      if (edgesToInsert.length > 0) {
        await supabase.from('similarity_edges').upsert(edgesToInsert, {
          onConflict: 'source_artist_id,target_artist_id',
        });
      }
    }
  }
  
  return { nodes: Array.from(nodes.values()), edges, center: centerArtist };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'search') {
      const query = url.searchParams.get('q');
      if (!query) return new Response(JSON.stringify({ error: 'Query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(await searchArtists(query)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (action === 'graph') {
      const artist = url.searchParams.get('artist');
      const depth = parseInt(url.searchParams.get('depth') || '1');
      if (!artist) return new Response(JSON.stringify({ error: 'Artist name required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(await getSimilarityGraph(artist, Math.min(depth, 3))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (action === 'artist') {
      const name = url.searchParams.get('name');
      if (!name) return new Response(JSON.stringify({ error: 'Artist name required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(await getOrCreateArtist(name)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});