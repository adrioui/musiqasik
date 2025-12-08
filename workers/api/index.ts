import { Effect, Layer, pipe } from "effect";
import { Surreal } from "surrealdb";
import { LastFmApiError, NetworkError, DatabaseError } from "../../src/lib/errors";
import type { Artist, GraphData } from "../../src/integrations/surrealdb/types";

interface Env {
  SURREALDB_URL: string;
  SURREALDB_NAMESPACE: string;
  SURREALDB_DATABASE: string;
  SURREALDB_USER: string;
  SURREALDB_PASS: string;
  LASTFM_API_KEY: string;
}

// Per-request cache
const requestCache = new Map<string, Artist>();

// Helper functions
const isPlaceholderImage = (url?: string): boolean => {
  if (!url) return true;
  return url.includes("2a96cbd8b46e442fc41c2b86b821562f") || 
         url.includes("star") || 
         url === "" || 
         url.endsWith("/noimage/");
};

const fetchDeezerImage = async (artistName: string): Promise<string | undefined> => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
    );
    const data = await response.json() as { data?: Array<{ picture_xl?: string }> };
    return data.data?.[0]?.picture_xl;
  } catch {
    return undefined;
  }
};

// Last.fm API functions
async function searchArtists(query: string, apiKey: string): Promise<Artist[]> {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=10`
  );

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json() as {
    results?: {
      artistmatches?: {
        artist?: Array<{
          name: string;
          mbid?: string;
          image?: Array<{ size: string; "#text": string }>;
          listeners?: string;
          url?: string;
        }>;
      };
    };
  };

  const artists = data.results?.artistmatches?.artist || [];
  return artists.map((artist) => {
    const lastfmImage = artist.image?.find((img) => img.size === "large")?.["#text"];
    return {
      name: artist.name,
      lastfm_mbid: artist.mbid || undefined,
      image_url: isPlaceholderImage(lastfmImage) ? undefined : lastfmImage,
      listeners: artist.listeners ? parseInt(artist.listeners) : undefined,
      lastfm_url: artist.url || undefined,
    };
  });
}

async function getArtistInfo(artistName: string, apiKey: string): Promise<Artist | null> {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`
  );

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json() as {
    error?: number;
    artist?: {
      name: string;
      mbid?: string;
      image?: Array<{ size: string; "#text": string }>;
      stats?: { listeners?: string; playcount?: string };
      tags?: { tag?: Array<{ name: string }> };
      url?: string;
    };
  };

  if (data.error || !data.artist) {
    return null;
  }

  const artist = data.artist;
  const lastfmImage = artist.image?.find((img) => img.size === "extralarge")?.["#text"];

  let imageUrl: string | undefined;
  if (isPlaceholderImage(lastfmImage)) {
    imageUrl = await fetchDeezerImage(artist.name);
  } else {
    imageUrl = lastfmImage;
  }

  return {
    name: artist.name,
    lastfm_mbid: artist.mbid || undefined,
    image_url: imageUrl,
    listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners) : undefined,
    playcount: artist.stats?.playcount ? parseInt(artist.stats.playcount) : undefined,
    tags: artist.tags?.tag?.map((t) => t.name) || [],
    lastfm_url: artist.url || undefined,
  };
}

async function getSimilarArtists(artistName: string, apiKey: string): Promise<Array<{ name: string; match: number }>> {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&limit=15`
  );

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json() as {
    similarartists?: {
      artist?: Array<{ name: string; match: string }>;
    };
  };

  const similar = data.similarartists?.artist || [];
  return similar.map((artist) => ({
    name: artist.name,
    match: parseFloat(artist.match),
  }));
}

// Database functions
async function connectDb(env: Env): Promise<Surreal> {
  const db = new Surreal();
  await db.connect(env.SURREALDB_URL, {
    namespace: env.SURREALDB_NAMESPACE,
    database: env.SURREALDB_DATABASE,
    auth: {
      username: env.SURREALDB_USER,
      password: env.SURREALDB_PASS,
    },
  });
  return db;
}

async function getArtistFromDb(db: Surreal, artistName: string): Promise<Artist | null> {
  const result = await db.query<[Artist[]]>(
    `SELECT * FROM artists WHERE name_lower = string::lowercase($name) LIMIT 1`,
    { name: artistName }
  );
  return result[0]?.[0] || null;
}

async function upsertArtist(db: Surreal, artist: Omit<Artist, "id">): Promise<Artist> {
  const result = await db.query<[Artist[]]>(
    `INSERT INTO artists {
       name: $name,
       name_lower: string::lowercase($name),
       lastfm_mbid: IF $mbid THEN $mbid ELSE NONE END,
       image_url: IF $image_url THEN $image_url ELSE NONE END,
       listeners: IF $listeners THEN $listeners ELSE NONE END,
       playcount: IF $playcount THEN $playcount ELSE NONE END,
       tags: $tags,
       lastfm_url: IF $lastfm_url THEN $lastfm_url ELSE NONE END
     } ON DUPLICATE KEY UPDATE
       lastfm_mbid = IF $mbid THEN $mbid ELSE NONE END,
       image_url = IF $image_url THEN $image_url ELSE NONE END,
       listeners = IF $listeners THEN $listeners ELSE NONE END,
       playcount = IF $playcount THEN $playcount ELSE NONE END,
       tags = $tags,
       lastfm_url = IF $lastfm_url THEN $lastfm_url ELSE NONE END,
       updated_at = time::now()`,
    {
      name: artist.name,
      mbid: artist.lastfm_mbid,
      image_url: artist.image_url,
      listeners: artist.listeners,
      playcount: artist.playcount,
      tags: artist.tags || [],
      lastfm_url: artist.lastfm_url,
    }
  );
  return result[0]?.[0] as Artist;
}

async function upsertEdge(
  db: Surreal, 
  sourceId: string, 
  targetId: string, 
  matchScore: number, 
  depth: number
): Promise<void> {
  await db.query(
    `RELATE $source->similarity_edges->$target SET match_score = $score, depth = $depth`,
    { source: sourceId, target: targetId, score: matchScore, depth }
  );
}

// BFS Graph Building (ported from Supabase Edge Function)
async function buildGraph(
  db: Surreal,
  artistName: string,
  maxDepth: number,
  apiKey: string
): Promise<GraphData> {
  const visited = new Set<string>();
  const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];
  const nodes: Artist[] = [];
  const edges: Array<{ source: string; target: string; weight: number }> = [];
  let center: Artist | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const normalizedName = current.name.toLowerCase();

    if (visited.has(normalizedName)) continue;
    visited.add(normalizedName);

    // Check cache first
    let artist = requestCache.get(normalizedName) || await getArtistFromDb(db, current.name);

    if (!artist) {
      // Fetch from Last.fm
      const artistInfo = await getArtistInfo(current.name, apiKey);
      if (!artistInfo) continue;

      artist = await upsertArtist(db, artistInfo);
    }

    if (artist) {
      requestCache.set(normalizedName, artist);
      nodes.push(artist);

      if (current.depth === 0) {
        center = artist;
      }

      // Get similar artists if not at max depth
      if (current.depth < maxDepth) {
        // Check for cached edges first
        const cachedEdges = await db.query<[Array<{ out: Artist; match_score: number }>]>(
          `SELECT out.*, match_score FROM similarity_edges WHERE in = $artistId`,
          { artistId: artist.id }
        );

        const cached = cachedEdges[0] || [];

        if (cached.length > 0) {
          // Use cached edges
          for (const edge of cached) {
            if (edge.out) {
              edges.push({
                source: artist.name,
                target: edge.out.name,
                weight: edge.match_score,
              });
              
              if (!visited.has(edge.out.name.toLowerCase())) {
                queue.push({ name: edge.out.name, depth: current.depth + 1 });
              }
            }
          }
        } else {
          // Fetch from Last.fm
          const similar = await getSimilarArtists(current.name, apiKey);

          for (const sim of similar) {
            // Get or create target artist
            let targetArtist = requestCache.get(sim.name.toLowerCase()) || 
                              await getArtistFromDb(db, sim.name);

            if (!targetArtist) {
              const targetInfo = await getArtistInfo(sim.name, apiKey);
              if (targetInfo) {
                targetArtist = await upsertArtist(db, targetInfo);
              }
            }

            if (targetArtist) {
              requestCache.set(sim.name.toLowerCase(), targetArtist);

              // Create edge
              await upsertEdge(db, artist.id!, targetArtist.id!, sim.match, current.depth + 1);

              edges.push({
                source: artist.name,
                target: targetArtist.name,
                weight: sim.match,
              });

              if (!visited.has(sim.name.toLowerCase())) {
                queue.push({ name: sim.name, depth: current.depth + 1 });
              }
            }
          }
        }
      }
    }
  }

  return { nodes, edges, center };
}

// Request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let result: unknown;

      if (action === "search") {
        const query = url.searchParams.get("q");
        if (!query) {
          return new Response(JSON.stringify({ error: "Query required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await searchArtists(query, env.LASTFM_API_KEY);
      } else if (action === "artist") {
        const name = url.searchParams.get("name");
        if (!name) {
          return new Response(JSON.stringify({ error: "Artist name required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const db = await connectDb(env);
        try {
          let artist = await getArtistFromDb(db, name);
          if (!artist) {
            const artistInfo = await getArtistInfo(name, env.LASTFM_API_KEY);
            if (artistInfo) {
              artist = await upsertArtist(db, artistInfo);
            }
          }
          result = artist;
        } finally {
          await db.close();
        }
      } else if (action === "graph") {
        const artistName = url.searchParams.get("artist");
        const depth = Math.min(parseInt(url.searchParams.get("depth") || "1"), 3);

        if (!artistName) {
          return new Response(JSON.stringify({ error: "Artist name required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const db = await connectDb(env);
        try {
          // Clear per-request cache
          requestCache.clear();
          result = await buildGraph(db, artistName, depth, env.LASTFM_API_KEY);
        } finally {
          await db.close();
        }
      } else {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
