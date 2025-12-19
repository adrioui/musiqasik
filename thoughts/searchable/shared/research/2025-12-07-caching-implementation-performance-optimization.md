---
date: 2025-12-07T17:01:15+07:00
researcher: opencode
git_commit: 184988fb8459772d4e38765a6eb392cea0a3f364
branch: main
repository: musiqasik
topic: 'Caching Implementation and Performance Optimization Opportunities'
tags: [research, codebase, caching, performance, supabase, edge-functions]
status: complete
last_updated: 2025-12-07
last_updated_by: opencode
---

# Research: Caching Implementation and Performance Optimization Opportunities

**Date**: 2025-12-07T17:01:15+07:00
**Researcher**: opencode
**Git Commit**: 184988fb8459772d4e38765a6eb392cea0a3f364
**Branch**: main
**Repository**: musiqasik

## Research Question

How is caching implemented in the MusiqasiQ codebase, and what are the key performance bottlenecks and optimization opportunities?

## Summary

The MusiqasiQ application implements a sophisticated two-level caching system using Supabase PostgreSQL as the primary cache and Last.fm API as the fallback. The caching strategy employs a breadth-first search (BFS) algorithm to build artist similarity graphs with configurable depth limits. While the architecture is well-designed with read-through caching patterns and graceful degradation, several critical performance bottlenecks exist, including N+1 query problems, sequential API calls, inefficient database operations, and lack of request-level caching. These issues become exponentially worse with increased graph depth and artist popularity.

## Detailed Findings

### Database Schema and Caching Structure

The caching system is built on two primary tables in Supabase PostgreSQL:

**Artists Table** (`supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:5-17`)

- Stores artist metadata with unique name constraint for implicit indexing
- Columns: `id`, `name`, `lastfm_mbid`, `image_url`, `listeners`, `playcount`, `tags`, `lastfm_url`, `created_at`, `updated_at`
- Unique constraint on `name` ensures case-sensitive uniqueness and provides indexing

**Similarity Edges Table** (`migration.sql:20-28`)

- Stores artist relationships with match scores and depth tracking
- Columns: `id`, `source_artist_id`, `target_artist_id`, `match_score`, `depth`, `created_at`
- Foreign key constraints with cascade delete to maintain referential integrity
- Unique constraint on `(source_artist_id, target_artist_id)` prevents duplicates

**Database Indexes** (`migration.sql:46-49`)

- `idx_artists_name`: `lower(name)` for case-insensitive searches
- `idx_artists_name_trgm`: `gin_trgm_ops` for fuzzy matching
- `idx_similarity_source`: `source_artist_id` for edge lookups
- `idx_similarity_target`: `target_artist_id` for reverse queries

### Edge Function Caching Implementation

**Two-Level Cache Architecture** (`supabase/functions/lastfm/index.ts:136-235`)
The Edge Function implements a read-through caching pattern with graceful degradation:

1. **Artist-Level Caching** (`index.ts:136-168`)
   - `getOrCreateArtist()` function checks database first using `ilike('name', artistName)`
   - Cache miss triggers Last.fm API call via `getArtistInfo()` (`index.ts:83-116`)
   - Deezer API fallback for placeholder images (`index.ts:99-105`)
   - Upserts artist data with `onConflict: 'name'` for idempotency
   - Returns API data even if cache insertion fails (graceful degradation)

2. **Edge-Level Caching** (`index.ts:193-210`, `index.ts:222-227`)
   - BFS traversal queries cached edges first: `supabase.from('similarity_edges').select(...).eq('source_artist_id', sourceArtist.id)`
   - Cache miss fetches from Last.fm API via `getSimilarArtists()` (`index.ts:118-134`)
   - Each edge upserted individually with `onConflict: 'source_artist_id,target_artist_id'`
   - Depth tracking prevents infinite recursion

**BFS Graph Traversal Algorithm** (`index.ts:170-235`)

- Queue-based breadth-first exploration with configurable depth limit (max 3)
- `Map<string, ArtistData>` for O(1) node lookups by lowercase name
- `Set<string>` for processed node tracking to prevent cycles
- Depth-limited to prevent runaway graph generation

### Frontend Caching Patterns

**React Hook Implementation** (`src/hooks/useLastFm.ts:7-92`)

- Custom hook with `useCallback` for function memoization
- Loading and error state management
- No client-side caching beyond React's built-in memoization
- Direct API calls to Edge Function without additional caching layer
- Three main operations: `searchArtists()`, `getGraph()`, `getArtist()`

**State Management**

- React Query not currently used for server state (despite being in tech stack)
- No cache invalidation or stale-while-revalidate patterns
- Each component mount triggers fresh data fetches

### Critical Performance Bottlenecks

#### 1. N+1 Query Problem in BFS Traversal

**Location**: `supabase/functions/lastfm/index.ts:193-231`
**Impact**: O(n²) database queries where n = number of artists
**Details**:

- Each artist in BFS queue triggers separate database query for edges
- With depth=3 and 10 similar artists per node: 1 + 10 + 100 = 111 queries
- Sequential `await` operations multiply latency

#### 2. Sequential API Calls

**Location**: `index.ts:211-230`
**Impact**: Linear time growth with graph size
**Details**:

- `getSimilarArtists()` API call followed by sequential `getOrCreateArtist()` calls
- Each artist lookup waits for previous to complete
- No parallelization with `Promise.all()`

#### 3. Individual Database Inserts

**Location**: `index.ts:222-227`
**Impact**: Multiple round trips instead of batch operations
**Details**:

- Each similarity edge upserted individually inside loop
- Could batch 10 edges per artist into single operation
- Network latency multiplied by number of edges

#### 4. Inefficient Queue Operations

**Location**: `index.ts:179`, `index.ts:184`
**Impact**: O(n) array shifts in BFS
**Details**:

- Uses `queue.shift()` which is O(n) for JavaScript arrays
- With large graphs, queue operations become significant bottleneck
- Should use linked list or pointer-based queue

#### 5. No Request-Level Caching

**Location**: Throughout `getSimilarityGraph()`
**Impact**: Redundant lookups for same artist in single request
**Details**:

- Artist looked up multiple times if appears in multiple paths
- No in-memory cache for duration of request
- Same database query executed repeatedly

#### 6. Missing Composite Indexes

**Location**: Database schema
**Impact**: Queries filtering by multiple columns are inefficient
**Details**:

- No index on `(source_artist_id, depth)` for BFS queries
- Queries could benefit from covering indexes
- Current indexes don't support all query patterns

#### 7. No Timeout or Retry Logic

**Location**: `index.ts:61-63`, `index.ts:86-88`, `index.ts:121-123`
**Impact**: Hanging requests block entire operation
**Details**:

- `fetch()` calls to Last.fm and Deezer have no timeout
- No exponential backoff for failed requests
- No circuit breaker pattern for failing APIs

#### 8. Case-Insensitive Search Inefficiency

**Location**: `index.ts:137-141`
**Impact**: May not use indexes optimally
**Details**:

- Uses `ilike('name', artistName)` without pre-normalization
- Could normalize to lowercase before query for better index usage
- Trigram index helps but case-sensitive with normalization would be faster

### Performance Characteristics

**Time Complexity**:

- Best case (fully cached): O(V + E) where V = vertices, E = edges
- Worst case (no cache): O(V × (API call + DB queries))
- Database queries: 1 per artist for edges + 1 per artist for data
- API calls: Only for uncached artists and edges

**Cache Effectiveness**:

- Improves with user exploration patterns
- Shared cache benefits all users
- Progressive caching builds graph incrementally
- First request is slow, subsequent requests are fast

**Measured Performance**:

- Graph load time: ~3-5 seconds for depth=2 (cache-dependent)
- Directly depends on cache hit rate
- Popular artists with many connections are slower

## Code References

### Core Caching Implementation

- `supabase/functions/lastfm/index.ts:136-168` - `getOrCreateArtist()` - Artist-level caching with read-through pattern
- `supabase/functions/lastfm/index.ts:170-235` - `getSimilarityGraph()` - BFS traversal with two-level caching
- `supabase/functions/lastfm/index.ts:193-210` - Edge cache hit path
- `supabase/functions/lastfm/index.ts:211-231` - Edge cache miss path with sequential API calls
- `supabase/functions/lastfm/index.ts:222-227` - Individual edge upserts

### Database Schema

- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:5-17` - Artists table definition
- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:20-28` - Similarity edges table definition
- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:46-49` - Database indexes

### Frontend Integration

- `src/hooks/useLastFm.ts:7-92` - React hook for API interaction
- `src/hooks/useLastFm.ts:35-59` - `getGraph()` function for fetching similarity graphs

### API Endpoints

- `supabase/functions/lastfm/index.ts:250-254` - Graph action handler
- `supabase/functions/lastfm/index.ts:237-269` - Main Edge Function router

## Architecture Insights

### Design Patterns

**Two-Level Cache Pattern**

- Level 1: Database cache (persistent, shared across users)
- Level 2: External API (Last.fm, Deezer - rate-limited)
- Strategy: Database-first with API fallback

**Read-Through Caching**

- Application code never directly accesses external APIs
- Cache abstraction layer handles miss logic
- Graceful degradation when cache writes fail

**BFS with Depth Limiting**

- Prevents runaway graph generation
- Configurable depth parameter (max 3)
- Cycle prevention via processed Set

**Idempotent Upserts**

- `onConflict` handling ensures safe retries
- No duplicate data even with race conditions
- Foreign key constraints maintain integrity

### Strengths

1. **Progressive Caching**: Graph builds organically as users explore
2. **Shared Cache**: All users benefit from cached data
3. **Graceful Degradation**: API data returned even if caching fails
4. **Data Consistency**: Foreign keys and unique constraints prevent corruption
5. **Depth Limiting**: Prevents excessive API usage and graph size

### Weaknesses

1. **N+1 Query Problem**: Exponential database queries with graph depth
2. **Sequential Processing**: No parallelization of independent operations
3. **No Request-Level Cache**: Redundant lookups within single request
4. **Individual Inserts**: Inefficient edge caching without batching
5. **No Timeouts**: Hanging API calls can block entire operation
6. **Missing Composite Indexes**: Queries not fully optimized
7. **No Rate Limiting**: Could hit API limits with popular artists

### Architectural Trade-offs

**Cache Freshness vs. API Rate Limits**

- Database cache serves stale data but reduces API calls
- No TTL or cache invalidation (simple update-on-fetch)
- Acceptable for artist similarity data (doesn't change frequently)

**Immediate Consistency vs. Performance**

- Synchronous cache writes ensure consistency
- But block response until complete
- Could use write-behind for better performance

**Simplicity vs. Optimization**

- Current implementation is straightforward and maintainable
- But lacks advanced optimizations (batching, parallelization)
- Good for MVP, needs optimization for scale

## Historical Context (from thoughts/)

### Documented Architecture Decisions

**`thoughts/shared/research/2025-12-07-artist-image-url-implementation.md`**

- Documents two-level caching system (artist-level + edge-level)
- BFS traversal limited to 3 hops maximum for performance
- Read-through cache pattern with graceful degradation
- Database design decisions for `image_url` as nullable string

**`thoughts/shared/research/2025-12-06-AGENTS-md-implementation-analysis.md`**

- Two-level caching (memory + database) for performance
- Serverless backend with Supabase Edge Functions
- Performance optimization: debounced search, graph filtering, D3.js cleanup

**`thoughts/shared/plans/2025-12-07-musiqasik-tanstack-start-migration.md`**

- Decision to keep Supabase Edge Function as write/cache layer during migration
- React Query planned for more extensive client-side caching
- Architecture choice: TanStack server functions call Edge Function directly
- Cloudflare deployment and performance optimization as phase 6

**`thoughts/shared/plans/2025-12-07-artist-image-musicbrainz-integration.md`**

- No schema changes to existing `image_url` column
- Simple update-on-fetch cache invalidation strategy
- Performance considerations: 1 req/sec rate limit for MusicBrainz
- Graph load performance: ~3-5 seconds for depth=2 (cache-dependent)
- Backfill strategy with database-friendly batching

**`thoughts/shared/plans/2025-12-06-AGENTS-md-optimization.md`**

- Two-level cache design with match scores as DECIMAL(5,4)
- Performance optimization: clean up D3.js simulations, limit graph depth
- Database schema in Supabase directory

### Key Historical Decisions

1. **Caching Architecture**: Two-level system chosen for simplicity and effectiveness
2. **Database Design**: PostgreSQL with Supabase for serverless compatibility
3. **Depth Limiting**: 3 hops maximum to balance exploration and performance
4. **No Complex Invalidation**: Simple update-on-fetch for cache freshness
5. **Migration Strategy**: Preserve caching layer during framework migrations
6. **Performance Targets**: ~3-5 second graph load time for depth=2

## Related Research

- `thoughts/shared/research/2025-12-07-artist-image-url-implementation.md` - Caching architecture and data flow
- `thoughts/shared/research/2025-12-06-AGENTS-md-implementation-analysis.md` - Architecture patterns and performance
- `thoughts/shared/plans/2025-12-07-musiqasik-tanstack-start-migration.md` - Migration strategy preserving caching layer
- `thoughts/shared/plans/2025-12-07-artist-image-musicbrainz-integration.md` - Performance considerations for integrations
- `thoughts/shared/plans/2025-12-06-AGENTS-md-optimization.md` - Optimization strategies

## Open Questions

1. **Cache Invalidation Strategy**: How to handle stale artist data? Should we implement TTL or versioning?

2. **Rate Limiting**: Should we implement API rate limiting at the Edge Function level to prevent abuse?

3. **Cache Warming**: Would pre-populating cache for popular artists improve user experience?

4. **Graph Depth Optimization**: Is depth=3 optimal? Should it be dynamic based on artist popularity?

5. **Batching Strategy**: What batch size is optimal for edge inserts? 10? 50? 100?

6. **Request-Level Cache**: Should we implement in-memory cache for duration of single request?

7. **React Query Integration**: How can we leverage React Query for client-side caching effectively?

8. **Performance Monitoring**: What metrics should we track to measure cache effectiveness?

9. **Database Connection Pooling**: Should we optimize Supabase client configuration for Edge Functions?

10. **API Timeouts**: What are appropriate timeout values for Last.fm and Deezer APIs?

## Performance Optimization Recommendations

### High Priority

1. **Batch Database Operations**: Use `upsert()` with arrays instead of individual calls
2. **Parallel API Calls**: Use `Promise.all()` for independent artist lookups
3. **Request-Level Cache**: Implement in-memory Map for duration of single request
4. **Add Timeouts**: Implement fetch timeouts with exponential backoff
5. **Optimize Queue**: Use linked list or pointer-based queue instead of array shift

### Medium Priority

1. **Composite Indexes**: Add index on `(source_artist_id, depth)` for BFS queries
2. **Case Normalization**: Pre-normalize names to lowercase before database queries
3. **React Query Integration**: Implement client-side caching with stale-while-revalidate
4. **Rate Limiting**: Add API rate limiting to prevent abuse
5. **Circuit Breaker**: Implement circuit breaker pattern for failing APIs

### Low Priority

1. **Cache Warming**: Pre-populate cache for popular artists
2. **Dynamic Depth**: Adjust depth based on artist popularity
3. **Write-Behind Caching**: Asynchronous cache writes for better response times
4. **Performance Monitoring**: Add metrics for cache hit rates and query times
5. **Connection Pooling**: Optimize Supabase client for Edge Function environment
