---
date: 2025-12-07T00:00:00Z
researcher: adrifadilah
git_commit: a42a214
branch: main
repository: musiqasik
topic: 'Supabase Implementation in MusiqasiQ'
tags: [research, codebase, supabase, edge-functions, database, caching, bfs]
status: complete
last_updated: 2025-12-07
last_updated_by: adrifadilah
---

# Research: Supabase Implementation in MusiqasiQ

**Date**: 2025-12-07T00:00:00Z
**Researcher**: adrifadilah
**Git Commit**: a42a214
**Branch**: main
**Repository**: musiqasik

## Research Question

Document the complete Supabase implementation in the MusiqasiQ codebase, including client configuration, Edge Functions, database schema, caching mechanisms, and data flow patterns.

## Summary

MusiqasiQ implements a sophisticated Supabase backend with a two-level caching system (database + in-memory) and BFS traversal for artist similarity graphs. The architecture consists of:

- Type-safe Supabase client with generated TypeScript types
- Edge Function (`lastfm`) that integrates with Last.fm API
- PostgreSQL database with optimized schema for graph data
- Custom React hooks for frontend integration
- Comprehensive error handling and performance optimizations

## Detailed Findings

### Supabase Client Configuration and Types

**Client Setup** (`src/integrations/supabase/client.ts:1-17`)

- Creates Supabase client using `createClient()` from `@supabase/supabase-js`
- Uses TypeScript generics with `Database` type for type safety
- Reads environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Configures authentication with localStorage persistence and auto-refresh
- Export pattern: single `supabase` constant with documented import example

**Database Type Definitions** (`src/integrations/supabase/types.ts:1-237`)

- Auto-generated TypeScript types from Supabase schema
- `Database` interface at line 9-113 containing public schema definitions
- **Artists table** (lines 17-55): UUID primary key, name (unique), lastfm_mbid, image_url, listeners, playcount, tags (text array), lastfm_url, timestamps
- **Similarity edges table** (lines 56-97): UUID primary key, source_artist_id (FK), target_artist_id (FK), match_score (DECIMAL 5,4), depth (INTEGER), timestamps
- Foreign key relationships defined at lines 81-96 with CASCADE delete
- Utility types: `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums<T>` for type-safe operations

**Application Types** (`src/types/artist.ts:1-38`)

- `Artist` interface (lines 1-12) mirrors database schema with optional fields
- `SimilarityEdge` interface (lines 14-18) simplified version for frontend
- `GraphData` interface (lines 20-24) structures nodes, edges, and center artist
- `GraphNode` and `GraphLink` interfaces (lines 26-38) extend for D3.js visualization

### Edge Functions Implementation

**Last.fm Edge Function** (`supabase/functions/lastfm/index.ts:1-416`)

- Deno-based serverless function with three endpoints
- Environment variables: `LASTFM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase client initialized with service role key at line 12
- CORS headers configured at lines 3-6 for cross-origin requests

**API Endpoints** (`index.ts:84-116`)

1. **Search Artists** (`action=search`): Accepts `q` parameter, returns array of artist matches
2. **Get Similarity Graph** (`action=graph`): Accepts `artist` and `depth` (max 3), returns graph data
3. **Get Artist Info** (`action=artist`): Accepts `name` parameter, returns single artist data

**Helper Functions** (`index.ts:110-252`)

- `isPlaceholderImage()` (lines 110-117): Detects Last.fm placeholder images
- `fetchDeezerImage()` (lines 120-140): Fallback to Deezer API for artist images
- `searchArtists()` (lines 142-165): Last.fm artist.search API integration
- `getArtistInfo()` (lines 167-200): Last.fm artist.getinfo API with image fallback
- `getSimilarArtists()` (lines 202-218): Last.fm artist.getsimilar API
- `getOrCreateArtist()` (lines 220-252): Database-first caching with upsert pattern

**BFS Traversal Algorithm** (`index.ts:254-382`)

- Level-based parallel BFS with depth limit (max 3 hops)
- Per-request in-memory cache using Map at line 258
- Database cache check first (lines 304-317), API fallback if miss (lines 319-351)
- Parallel processing with `Promise.all()` at line 297
- Batch edge insertion using `upsert()` at lines 348-351
- Result aggregation and next level preparation at lines 358-378

**Error Handling** (`index.ts:14-44, 411-415`)

- `fetchWithTimeout()`: 5-second timeout with abort controller
- `fetchWithRetry()`: Exponential backoff retry (100ms, 200ms, 400ms)
- Global try-catch wrapper returns 500 errors with messages
- Graceful degradation returns partial data on failures

### Database Schema and Migration Patterns

**Migration Files**

- `20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`: Initial schema with tables, indexes, RLS policies
- `20251207120000_add_composite_index_for_bfs.sql`: Composite index for BFS query optimization

**Artists Table** (`supabase/migrations/*.sql:5-17`)

```sql
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lastfm_mbid TEXT,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  listeners INTEGER,
  playcount INTEGER,
  tags TEXT[],
  lastfm_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Similarity Edges Table** (`supabase/migrations/*.sql:20-28`)

```sql
CREATE TABLE public.similarity_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  target_artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  match_score DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  depth INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_artist_id, target_artist_id)
);
```

**Indexes** (`supabase/migrations/*.sql:46-49`)

- `idx_artists_name`: B-tree on `lower(name)` for case-insensitive search
- `idx_artists_name_trgm`: GIN trigram on `name` for fuzzy search
- `idx_similarity_source`: On `source_artist_id` for edge lookups
- `idx_similarity_target`: On `target_artist_id` for reverse lookups
- `idx_similarity_source_depth`: Composite on `(source_artist_id, depth)` for BFS

**Row Level Security** (`supabase/migrations/*.sql:31-43`)

- RLS enabled on both tables
- Public read policies: `"Artists are publicly readable"`, `"Similarity edges are publicly readable"`
- No write policies (Edge Function uses service role key)

**Trigger Function** (`supabase/migrations/*.sql:52-64`)

- `update_updated_at_column()`: Automatically updates `updated_at` timestamp
- Trigger on artists table: `update_artists_updated_at` (BEFORE UPDATE)

### React Integration Patterns

**Custom Hook** (`src/hooks/useLastFm.ts:1-92`)

- `useLastFm()` hook centralizes all Supabase/API communication
- Three main operations: `searchArtists()`, `getGraph()`, `getArtist()`
- Loading state management with `isLoading` boolean
- Error state management with user-friendly messages
- Consistent fetch pattern with try-catch blocks

**Component Usage**

- **ArtistSearch** (`src/components/ArtistSearch.tsx:19`): Uses `searchArtists` and `isLoading`
- **MapView** (`src/pages/MapView.tsx:17`): Uses `getGraph`, `isLoading`, and `error`
- Debounced search (300ms) prevents excessive API calls
- Toast notifications for error feedback

**Data Flow**

1. User interaction → Component state update
2. Hook function call → Edge Function HTTP request
3. Edge Function → Database cache check → API fallback if needed
4. Response → JSON parsing → Component state update
5. UI re-render with new data

### Caching Mechanisms

**Two-Level Caching Strategy**

1. **Database Cache**: Persistent storage in PostgreSQL
   - Artists table caches artist metadata
   - Similarity edges table caches relationship data
   - Upsert pattern prevents duplicates

2. **In-Memory Cache**: Per-request Map at `index.ts:258`
   - Prevents duplicate artist lookups within same request
   - Key normalization: lowercase artist names
   - Promise caching for concurrent requests

**Cache Flow**

- First request: API call → Transform → Database insert → Response
- Subsequent requests: Database query → Response (no API call)
- Partial cache: Database (cached) + API (uncached) → Parallel processing

**Performance Optimizations**

- Composite index for BFS queries
- Batch edge insertion (single upsert per source artist)
- Parallel processing with `Promise.all()`
- Depth limiting (max 3 hops) prevents exponential growth
- Debounced frontend search (300ms)

### Data Transformation Pipeline

**Last.fm API → Database**

- Image processing: Filter placeholders, Deezer fallback
- Type conversion: String to number for listeners/playcount
- Tag extraction: Array of strings from Last.fm tags
- Timestamp handling: Automatic created_at/updated_at

**Database → Frontend**

- Type mapping: Database types → Application types
- Graph construction: Nodes, edges, center artist structure
- D3.js adaptation: Position properties for force simulation

**Response Formats**

- Search: `ArtistData[]` with name, mbid, image_url, listeners, lastfm_url
- Graph: `{ nodes: ArtistData[], edges: {source, target, weight}[], center: ArtistData }`
- Artist: `ArtistData` with optional id field

## Code References

### Supabase Configuration

- `src/integrations/supabase/client.ts:11` - Supabase client initialization
- `src/integrations/supabase/types.ts:9` - Database type definitions
- `src/types/artist.ts:1` - Application type definitions

### Edge Function Implementation

- `supabase/functions/lastfm/index.ts:12` - Supabase client with service role key
- `supabase/functions/lastfm/index.ts:254` - BFS traversal algorithm
- `supabase/functions/lastfm/index.ts:348` - Batch edge insertion
- `supabase/functions/lastfm/index.ts:220` - Artist caching logic

### Database Schema

- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:5` - Artists table creation
- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:20` - Similarity edges table creation
- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:46` - Performance indexes
- `supabase/migrations/20251207120000_add_composite_index_for_bfs.sql:5` - BFS composite index

### React Integration

- `src/hooks/useLastFm.ts:11` - searchArtists function
- `src/hooks/useLastFm.ts:35` - getGraph function
- `src/hooks/useLastFm.ts:61` - getArtist function
- `src/components/ArtistSearch.tsx:19` - Hook usage in search
- `src/pages/MapView.tsx:17` - Hook usage in graph view

### Caching and Performance

- `supabase/functions/lastfm/index.ts:258` - In-memory request cache
- `supabase/functions/lastfm/index.ts:304` - Database cache check
- `supabase/functions/lastfm/index.ts:33` - Retry logic with exponential backoff
- `src/components/ArtistSearch.tsx:23` - Debounced search (300ms)

## Architecture Documentation

### System Design

The Supabase implementation follows a serverless architecture with clear separation of concerns:

- **Frontend**: React components communicate via HTTP with Edge Functions
- **Edge Functions**: Serverless Deno functions handle business logic, caching, and API integration
- **Database**: PostgreSQL with optimized schema for graph data storage
- **External APIs**: Last.fm for music data, Deezer for image fallback

### Data Flow Architecture

```
React Component → useLastFm Hook → Edge Function HTTP → Database Cache Check →
[If Miss] Last.fm API → Transform → Database Insert → Response → Frontend State → UI
```

### Caching Strategy

Two-level caching provides both persistence and performance:

1. **Database Level**: Persistent storage with query optimization
2. **Request Level**: In-memory cache prevents duplicate lookups

### Performance Optimizations

- Database indexes for common query patterns
- Composite index for BFS traversal
- Batch database operations
- Parallel processing with Promise.all
- Debounced frontend input
- Depth limiting for graph traversal
- Retry logic with exponential backoff

### Security Model

- Row Level Security with public read policies
- Service role key for Edge Function writes
- Environment variable configuration
- CORS headers for cross-origin requests
- No direct database access from frontend

### Error Handling

- Multi-layer error handling (frontend, Edge Function, API)
- Graceful degradation with fallback mechanisms
- User-friendly error messages via toast notifications
- Timeout and retry logic for API calls
- Partial data returns on failures

## Related Research

No existing research documents found for Supabase implementation.

## Open Questions

1. **Scalability**: How does the system perform with large artist graphs (1000+ nodes)?
2. **Cache Invalidation**: What strategy should be used for updating stale artist data?
3. **Rate Limiting**: How are Last.fm API rate limits handled in production?
4. **Analytics**: Are there any metrics or monitoring for cache hit rates?
5. **Backup Strategy**: How is the database backed up and restored?
6. **Migration Strategy**: How are future schema changes managed with existing data?

## Follow-up Research Areas

- Performance benchmarking with large datasets
- Cache invalidation strategies and implementation
- API rate limiting and quota management
- Database backup and disaster recovery procedures
- Monitoring and observability setup
- Schema evolution patterns for future features
