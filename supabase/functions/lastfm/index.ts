import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

// Check if image URL is the Last.fm placeholder (white star)
function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  // Last.fm placeholder images contain these patterns
  return url.includes('2a96cbd8b46e442fc41c2b86b821562f') || 
         url.includes('star') ||
         url === '' ||
         url.endsWith('/noimage/');
}

// Fetch artist image from MusicBrainz using MBID
async function fetchMusicBrainzImage(mbid: string): Promise<string | undefined> {
  if (!mbid) return undefined;
  
  try {
    console.log(`Fetching MusicBrainz image for MBID: ${mbid}`);
    
    // First, get the artist relations from MusicBrainz
    const mbResponse = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
      {
        headers: {
          'User-Agent': 'MusiqasiQ/1.0 (https://lovable.dev)',
        },
      }
    );
    
    if (!mbResponse.ok) {
      console.log(`MusicBrainz API error: ${mbResponse.status}`);
      return undefined;
    }
    
    const mbData = await mbResponse.json();
    const relations = mbData.relations || [];
    
    // Look for image URL in relations (Wikimedia Commons, etc.)
    for (const rel of relations) {
      if (rel.type === 'image' && rel.url?.resource) {
        const imageUrl = rel.url.resource;
        // Convert Wikimedia Commons URL to actual image URL
        if (imageUrl.includes('commons.wikimedia.org')) {
          const filename = imageUrl.split('/').pop();
          if (filename) {
            const md5 = await getMD5Hash(decodeURIComponent(filename));
            return `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5[0]}${md5[1]}/${filename}/500px-${filename}`;
          }
        }
        return imageUrl;
      }
    }
    
    // Fallback: Try Cover Art Archive (for band logos/photos)
    // This is less reliable for artists but worth trying
    return undefined;
  } catch (error) {
    console.error('Error fetching MusicBrainz image:', error);
    return undefined;
  }
}

// Simple MD5 hash for Wikimedia URL construction
async function getMD5Hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);
  
  if (!hashBuffer) {
    // Fallback: simple hash if MD5 not available
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(2, '0');
  }
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function searchArtists(query: string): Promise<ArtistData[]> {
  console.log(`Searching for artists with query: ${query}`);
  
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data = await response.json();
  const artists = data.results?.artistmatches?.artist || [];
  
  return artists.map((artist: any) => {
    const lastfmImage = artist.image?.find((img: any) => img.size === 'large')?.['#text'];
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
  
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data = await response.json();
  if (data.error || !data.artist) return null;
  
  const artist = data.artist;
  const lastfmImage = artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'];
  const mbid = artist.mbid || undefined;
  
  // Try to get image from MusicBrainz if Last.fm returns placeholder
  let imageUrl: string | undefined;
  if (isPlaceholderImage(lastfmImage) && mbid) {
    imageUrl = await fetchMusicBrainzImage(mbid);
  } else if (!isPlaceholderImage(lastfmImage)) {
    imageUrl = lastfmImage;
  }
  
  return {
    name: artist.name,
    lastfm_mbid: mbid,
    image_url: imageUrl,
    listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners) : undefined,
    playcount: artist.stats?.playcount ? parseInt(artist.stats.playcount) : undefined,
    tags: artist.tags?.tag?.map((t: any) => t.name) || [],
    lastfm_url: artist.url || undefined,
  };
}

async function getSimilarArtists(artistName: string): Promise<{ name: string; match: number }[]> {
  console.log(`Getting similar artists for: ${artistName}`);
  
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&limit=15`
  );
  
  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);
  
  const data = await response.json();
  const similar = data.similarartists?.artist || [];
  
  return similar.map((artist: any) => ({
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

async function getSimilarityGraph(artistName: string, depth: number = 1) {
  console.log(`Building similarity graph for ${artistName} with depth ${depth}`);
  
  const centerArtist = await getOrCreateArtist(artistName);
  if (!centerArtist) return { nodes: [], edges: [], center: null };
  
  const nodes: Map<string, ArtistData> = new Map();
  const edges: { source: string; target: string; weight: number }[] = [];
  const processed: Set<string> = new Set();
  const queue: { name: string; currentDepth: number }[] = [{ name: centerArtist.name, currentDepth: 0 }];
  
  nodes.set(centerArtist.name.toLowerCase(), centerArtist);
  
  while (queue.length > 0) {
    const { name, currentDepth } = queue.shift()!;
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
            if (currentDepth + 1 < depth) queue.push({ name: target.name, currentDepth: currentDepth + 1 });
          }
          edges.push({ source: sourceArtist.name, target: target.name, weight: edge.match_score });
        }
      }
    } else {
      const similarArtists = await getSimilarArtists(name);
      for (const similar of similarArtists.slice(0, 10)) {
        const targetArtist = await getOrCreateArtist(similar.name);
        if (!targetArtist?.id) continue;
        
        const targetNameLower = targetArtist.name.toLowerCase();
        if (!nodes.has(targetNameLower)) {
          nodes.set(targetNameLower, targetArtist);
          if (currentDepth + 1 < depth) queue.push({ name: targetArtist.name, currentDepth: currentDepth + 1 });
        }
        
        await supabase.from('similarity_edges').upsert({
          source_artist_id: sourceArtist.id,
          target_artist_id: targetArtist.id,
          match_score: similar.match,
          depth: currentDepth + 1,
        }, { onConflict: 'source_artist_id,target_artist_id' });
        
        edges.push({ source: sourceArtist.name, target: targetArtist.name, weight: similar.match });
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