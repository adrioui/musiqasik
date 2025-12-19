# Caching Performance Optimization Implementation Plan

## Overview

Implement performance optimizations for the MusiqasiQ caching system to reduce graph load times from 3-5 seconds to under 2 seconds for depth=2 queries. This plan addresses 8 critical bottlenecks identified in the research, focusing on batch operations, parallelization, and efficient data structures while maintaining the existing two-level cache architecture.

## Current State Analysis

**Performance Characteristics:**

- Graph load time: ~3-5 seconds for depth=2 (cache-dependent)
- N+1 query problem: O(n²) database queries where n = number of artists
- Sequential processing: No parallelization of independent operations
- Individual inserts: Each similarity edge upserted separately
- No request-level caching: Redundant lookups within single request
- Missing timeouts: Hanging API calls can block entire operation

**Key Bottlenecks:**

1. N+1 Query Problem in BFS Traversal (`supabase/functions/lastfm/index.ts:193-231`)
2. Sequential API Calls (`index.ts:211-230`)
3. Individual Database Inserts (`index.ts:222-227`)
4. Inefficient Queue Operations (`index.ts:179`, `index.ts:184`)
5. No Request-Level Caching (`index.ts:170-235`)
6. Missing Composite Indexes (Database schema)
7. No Timeout or Retry Logic (`index.ts:61-63`, `index.ts:86-88`, `index.ts:121-123`)
8. Case-Insensitive Search Inefficiency (`index.ts:137-141`)

## Desired End State

After implementation:

- Graph load time reduced to <2 seconds for depth=2 (50% improvement)
- Graph load time for depth=3 scales roughly linearly with depth=2 (target: at most ~1.5-2x the depth=2 time and under ~3-4 seconds for the same artist)
- Database queries reduced by 60-80% through batching and request-level caching
- API calls parallelized where possible
- All external API calls have timeouts and basic retry logic
- Queue operations optimized from O(n) to O(1)
- Database queries use optimal indexes
- No breaking changes to existing API or database schema

### Key Discoveries:

- BFS traversal in `getSimilarityGraph()` is the primary bottleneck (`index.ts:170-235`)
- Individual edge upserts in loop (`index.ts:222-227`) cause multiple round trips
- `queue.shift()` operations are O(n) for large graphs (`index.ts:184`)
- No in-memory cache for duration of single request causes redundant lookups
- Missing timeouts on `fetch()` calls can hang entire operation

## What We're NOT Doing

- **No breaking schema changes**: Only additive performance indexes and safe data migrations; `artists` and `similarity_edges` table structures remain the same
- **No API contract changes**: Frontend `useLastFm.ts` hook interface stays the same
- **No cache invalidation strategy**: Continue with simple update-on-fetch pattern
- **No React Query integration**: Keep existing `useCallback` pattern in frontend
- **No write-behind caching**: Synchronous cache writes remain for consistency
- **No cache warming**: Pre-population of popular artists is out of scope
- **No dynamic depth adjustment**: Fixed depth=3 limit remains

## Implementation Approach

Three-phase approach focusing on high-impact, low-risk optimizations first:

1. **Phase 1**: High-priority optimizations (batching, parallelization, per-request artist cache, timeouts, queue optimization)
2. **Phase 2**: Medium-priority optimizations (core composite index for BFS queries, optional case normalization and reliability hardening)
3. **Phase 3**: Low-priority optimizations and monitoring (performance metrics, connection pooling)

Each phase maintains backward compatibility and can be deployed independently. Manual verification required between phases to ensure no regressions.

---

## Phase 1: High-Priority Performance Optimizations

### Overview

Address the highest-impact bottlenecks: batch database operations, parallel API calls, per-request artist caching/deduplication, fetch timeouts, and queue optimization. Expected 40-60% performance improvement.

### Changes Required:

#### 1. Batch Database Operations for Edge Inserts

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 222-227 (inside `getSimilarityGraph()`)
**Changes**: Replace individual `upsert()` calls with batched array upsert

```typescript
// BEFORE (lines 222-227):
await supabase.from('similarity_edges').upsert(
  {
    source_artist_id: sourceArtist.id,
    target_artist_id: targetArtist.id,
    match_score: similar.match,
    depth: currentDepth + 1,
  },
  { onConflict: 'source_artist_id,target_artist_id' }
);

// AFTER:
// Collect all edges to insert, then batch upsert after loop
const edgesToInsert: any[] = [];
for (const similar of similarArtists.slice(0, 10)) {
  // ... existing logic ...
  edgesToInsert.push({
    source_artist_id: sourceArtist.id,
    target_artist_id: targetArtist.id,
    match_score: similar.match,
    depth: currentDepth + 1,
  });
}

// Batch upsert all edges at once
if (edgesToInsert.length > 0) {
  await supabase.from('similarity_edges').upsert(edgesToInsert, {
    onConflict: 'source_artist_id,target_artist_id',
  });
}
```

#### 2. Parallelize Artist Lookups

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 211-230 (inside `getSimilarityGraph()`)
**Changes**: Use `Promise.all()` to fetch similar artists in parallel

```typescript
// BEFORE (lines 211-230):
const similarArtists = await getSimilarArtists(name);
for (const similar of similarArtists.slice(0, 10)) {
  const targetArtist = await getOrCreateArtist(similar.name); // Sequential
  // ...
}

// AFTER:
const similarArtists = await getSimilarArtists(name);
const artistLookups = similarArtists.slice(0, 10).map((similar) =>
  getOrCreateArtist(similar.name).then((targetArtist) => ({
    targetArtist,
    match: similar.match,
  }))
);

const results = await Promise.all(artistLookups);
for (const { targetArtist, match } of results) {
  if (!targetArtist?.id) continue;
  // ... rest of logic ...
}
```

#### 3. Implement Per-Request Artist Cache in `getSimilarityGraph()`

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Inside `getSimilarityGraph()` (around lines 170-235)
**Changes**: Add a per-request `Map` and helper to avoid duplicate `getOrCreateArtist` calls during a single graph build, without introducing a global cache

```typescript
// Inside getSimilarityGraph(), before using the BFS queue:
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

// Use getOrCreateArtistCached instead of getOrCreateArtist inside the BFS loop
// (and for the initial center artist) to ensure each unique artist is only
// resolved once per request.
```

#### 4. Add Fetch Timeouts with Exponential Backoff

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 61-63, 86-88, 121-123 (all `fetch()` calls)
**Changes**: Create wrapper function with timeout and retry logic

```typescript
// Add helper function after imports:
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
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

// Replace all fetch() calls:
// Example for searchArtists (line 61):
const response = await fetchWithTimeout(
  `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`,
  {},
  5000
);

// Add retry logic for critical calls:
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options, 5000);
    } catch (error) {
      if (i === maxRetries) throw error;
      // Exponential backoff: 100ms, 200ms, 400ms...
      await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 5. Optimize Queue Operations

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 179, 184 (queue initialization and shift)
**Changes**: Replace array-based queue with pointer-based approach

```typescript
// BEFORE (lines 176-179):
const queue: { name: string; currentDepth: number }[] = [
  { name: centerArtist.name, currentDepth: 0 },
];

// AFTER:
interface QueueItem {
  name: string;
  currentDepth: number;
}
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

// Usage in getSimilarityGraph():
const queue = new Queue();
queue.enqueue({ name: centerArtist.name, currentDepth: 0 });

// Replace while loop condition and shift:
while (queue.length > 0) {
  const item = queue.dequeue();
  if (!item) break;
  const { name, currentDepth } = item;
  // ... rest of logic ...
}
```

#### Error Handling & Fallback Semantics (Phase 1)

- **Graph (`action=graph`)**:
  - If cached `similarity_edges` exist for a node, use them even if Last.fm fails and continue building a partial graph.
  - If Last.fm fails for a node with no cached edges, treat it as having no neighbors and continue; do not fail the entire graph.
  - If any Last.fm calls fail, return the best-effort graph with a flag (for example `partial: true` and an `errors` array) while keeping the top-level shape `{ nodes, edges, center }` stable.
- **Search (`action=search`)**:
  - On Last.fm timeout or 5xx, return a non-200 status (such as 502 or 503) with a JSON error object instead of hanging.
  - If a local database fallback search is implemented, continue to return 200 with DB results while preserving the existing array-of-artists response shape.
- **Artist (`action=artist`)**:
  - If the artist exists in the `artists` cache but Last.fm fails, return the cached artist (status 200) and optionally flag the response as `stale`.
  - If the artist is not cached and Last.fm fails, return a 503 response with a JSON error instead of hanging.

These semantics must be implemented so that the **frontend hook contract stays the same** (search returns an array of artists, graph returns `{ nodes, edges, center }`, artist returns a single artist or `null`), while failures are surfaced via HTTP status codes and optional metadata fields.

### Success Criteria:

#### Automated Verification:

- [x] Edge Function compiles without errors: `supabase functions compile --no-verify-jwt lastfm`
- [x] TypeScript type checking passes: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] No breaking changes to API responses (same JSON structure)

#### Manual Verification:

- [ ] Graph load time for depth=2 reduced to <2 seconds (50% improvement)
- [ ] Graph load time for depth=3 (cold cache) is at most ~1.5-2x the depth=2 time for the same artist and stays under ~3-4 seconds
- [ ] All three API endpoints work correctly (search, graph, artist) for normal, empty, and error scenarios
- [ ] Error handling works: on Last.fm timeout or failure, each endpoint follows the documented fallback semantics without hanging the client
- [ ] No duplicate artists or edges are created in the database after repeated requests (including case variations in artist name)
- [ ] Cache hit rate improves: warm depth=2 requests are measurably faster than cold ones, and repeated queries show a higher cache hit rate

**Implementation Note**: After completing Phase 1 and all automated verification passes, pause here for manual confirmation that graph load times have improved before proceeding to Phase 2.

---

## Phase 2: Medium-Priority Optimizations

### Overview

Make the BFS queries more efficient with a composite index on `similarity_edges` as the core change, and optionally add case normalization plus basic rate limiting and a circuit breaker pattern for improved reliability. Expected additional 10-20% performance improvement from the index, with optional reliability benefits from the other changes.

### Changes Required:

#### 1. Add Composite Index for BFS Queries

**File**: `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`
**Location**: After line 49
**Changes**: Add composite index on `(source_artist_id, depth)`

```sql
-- Add to migration file:
CREATE INDEX idx_similarity_source_depth ON public.similarity_edges (source_artist_id, depth);
```

**Deployment**: Run `supabase migration up` to apply new index

#### 2. (Optional) Optimize Case-Insensitive Search

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 137-141 (`getOrCreateArtist()`)
**Changes**: Pre-normalize to lowercase and use exact match

```typescript
// BEFORE (line 140):
.ilike('name', artistName)

// AFTER:
const normalizedName = artistName.toLowerCase();
const { data: cached } = await supabase
  .from('artists')
  .select('*')
  .eq('name', normalizedName)  // Use exact match instead of ilike
  .maybeSingle();

// Also update the upsert to store normalized name:
.upsert({
  name: artistInfo.name.toLowerCase(), // Store normalized
  // ... rest of fields
})
```

**Note**: Requires data migration to normalize existing artist names. This is an optimization and can be deferred if initial performance targets are met.

#### 3. (Optional) Implement Basic Rate Limiting

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Top of file, before `Deno.serve()`
**Changes**: Add in-memory rate limiter

```typescript
// Add rate limiter:
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Usage in request handler:
Deno.serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // ... rest of handler
});
```

#### 4. (Optional) Add Circuit Breaker Pattern

**File**: `supabase/functions/lastfm/index.ts`
**Location**: After imports, before functions
**Changes**: Track API failures and short-circuit after threshold

```typescript
// Add circuit breaker:
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = {
  lastfm: { failures: 0, lastFailureTime: 0, isOpen: false },
  deezer: { failures: 0, lastFailureTime: 0, isOpen: false },
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

function checkCircuitBreaker(service: 'lastfm' | 'deezer'): boolean {
  const state = circuitBreakers[service];

  if (state.isOpen) {
    const now = Date.now();
    if (now - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      // Half-open: allow one request
      state.isOpen = false;
      state.failures = 0;
      return true;
    }
    return false;
  }

  return true;
}

function recordFailure(service: 'lastfm' | 'deezer'): void {
  const state = circuitBreakers[service];
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    console.error(`Circuit breaker opened for ${service}`);
  }
}

function recordSuccess(service: 'lastfm' | 'deezer'): void {
  const state = circuitBreakers[service];
  state.failures = 0;
  state.isOpen = false;
}

// Usage in API calls:
async function getSimilarArtists(artistName: string): Promise<{ name: string; match: number }[]> {
  if (!checkCircuitBreaker('lastfm')) {
    throw new Error('Last.fm API temporarily unavailable');
  }

  try {
    const response = await fetchWithRetry(/* ... */);
    recordSuccess('lastfm');
    // ... process response
  } catch (error) {
    recordFailure('lastfm');
    throw error;
  }
}
```

### Success Criteria:

#### Automated Verification:

- [x] Database migration applies cleanly: `supabase migration up`
- [x] TypeScript compilation succeeds
- [ ] Linting passes with no new warnings
- [ ] Rate limiting tests pass (mock IP addresses)
- [ ] Circuit breaker tests pass (simulate API failures)

#### Manual Verification:

- [ ] Database queries use new composite index (check query plan)
- [ ] Case normalization works for new artist inserts
- [ ] Rate limiting returns 429 status after threshold exceeded
- [ ] Circuit breaker opens after 5 failures, closes after timeout
- [ ] Graph load times improved by additional 10-20%
- [ ] No regressions in Phase 1 improvements

**Implementation Note**: After Phase 2, verify that the composite index is being used by checking query performance in Supabase dashboard before proceeding to Phase 3.

---

## Phase 3: Performance Monitoring & Low-Priority Optimizations

### Overview

Add performance metrics, optimize Supabase client configuration, and implement optional enhancements. Focus on observability and maintainability.

### Changes Required:

#### 1. Add Performance Metrics Logging

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Throughout `getSimilarityGraph()` function
**Changes**: Add timing and cache hit rate metrics

```typescript
// Add metrics collector:
interface Metrics {
  startTime: number;
  dbQueries: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  artistsProcessed: number;
}

function createMetrics(): Metrics {
  return {
    startTime: Date.now(),
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    artistsProcessed: 0
  };
}

function logMetrics(metrics: Metrics): void {
  const duration = Date.now() - metrics.startTime;
  const totalCacheAttempts = metrics.cacheHits + metrics.cacheMisses;
  const hitRate = totalCacheAttempts > 0 ? (metrics.cacheHits / totalCacheAttempts * 100).toFixed(1) : '0';

  console.log(JSON.stringify({
    message: 'Graph generation completed',
    duration_ms: duration,
    db_queries: metrics.dbQueries,
    cache_hit_rate_percent: hitRate,
    api_calls: metrics.apiCalls,
    artists_processed: metrics.artistsProcessed,
    timestamp: new Date().toISOString()
  }));
}

// Usage in getSimilarityGraph():
async function getSimilarityGraph(artistName: string, depth: number = 1) {
  const metrics = createMetrics();

  try {
    // Increment metrics throughout function:
    metrics.dbQueries++;
    const { data: cachedEdges } = await supabase.from('similarity_edges')...;

    if (cachedEdges && cachedEdges.length > 0) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
      metrics.apiCalls++;
    }

    metrics.artistsProcessed++;

  } finally {
    logMetrics(metrics);
  }
}
```

#### 2. Optimize Supabase Client Configuration

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Lines 12-13 (client initialization)
**Changes**: Add connection pooling and timeout settings

```typescript
// Replace existing client initialization:
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'x-application-name': 'musiqasik-lastfm-function',
    },
  },
});
```

#### 3. Add Performance Monitoring Endpoint

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Add new action handler
**Changes**: Expose metrics for monitoring

```typescript
// Add to Deno.serve() handler:
if (action === 'metrics') {
  const metrics = {
    circuit_breakers,
    rate_limit_store_size: rateLimitStore.size,
    request_cache_size: requestCache.size,
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(metrics), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Success Criteria:

#### Automated Verification:

- [ ] Metrics logging outputs valid JSON
- [ ] New metrics endpoint returns 200 status
- [ ] All existing tests still pass
- [ ] No performance regression from metrics overhead

#### Manual Verification:

- [ ] Metrics appear in Supabase function logs
- [ ] Cache hit rate is measurable and >70% for repeated queries
- [ ] Average graph generation time is <2 seconds
- [ ] Circuit breaker state visible in metrics endpoint
- [ ] No memory leaks from requestCache or rateLimitStore

**Implementation Note**: Phase 3 is optional but recommended for production monitoring. Can be deployed independently after Phase 2 validation.

---

## Testing Strategy

### Unit Tests

- Mock Supabase client responses
- Test batch operations with various array sizes
- Verify request-level cache prevents duplicate calls
- Test timeout and retry logic with delayed responses
- Verify circuit breaker state transitions
- Test rate limiting with multiple IP addresses

### Integration Tests

- End-to-end graph generation with depth=1, 2, 3
- Cache hit/miss scenarios
- API failure scenarios (timeout, 500 errors)
- Concurrent request handling
- Database constraint violations (duplicate edges)

### Manual Testing Steps

#### Phase 1 Validation:

1. **Cold Cache Test**: Query new artist, measure time for depth=2
2. **Warm Cache Test**: Query same artist again, verify <2 seconds
3. **Depth=3 Test**: For the same artist, record depth=2 and depth=3 timings and verify depth=3 is at most ~1.5-2x depth=2 and stays under ~3-4 seconds
4. **Error Recovery**: Block Last.fm API temporarily and verify that:
   - Graph requests return a partial graph with the documented flags (for example `partial` and an `errors` array) instead of failing the entire request
   - Search and artist requests return clear error responses (or DB fallback data) without hanging the client
5. **Concurrent Requests**: Send 5 simultaneous requests, verify no conflicts

#### Phase 2 Validation:

1. **Index Usage**: Check Supabase query performance dashboard
2. **Rate Limiting**: Send 31 requests from same IP, verify 429 on 31st
3. **Circuit Breaker**: Simulate 5 API failures, verify circuit opens
4. **Case Normalization**: Search for "The Beatles" and "the beatles", verify same result

#### Phase 3 Validation:

1. **Metrics Logging**: Verify JSON logs appear in Supabase dashboard
2. **Cache Hit Rate**: Repeated queries show >70% hit rate in metrics
3. **Memory Usage**: Monitor function memory, verify no leaks over 100 requests

### Performance Benchmarks

**Before Optimization:**

- Depth=2 cold cache: 3-5 seconds
- Depth=2 warm cache: 1-2 seconds
- Database queries: 1 + 10 + 100 = 111 queries (worst case)

**After Phase 1:**

- Depth=2 cold cache: <2 seconds (target)
- Depth=2 warm cache: <1 second (target)
- Database queries: ~30-40 queries (estimated 65% reduction)

**After Phase 2:**

- Additional 10-20% improvement from indexes
- Improved reliability from circuit breaker

## Performance Considerations

### Memory Usage

- Request cache: O(n) where n = unique artists in request
- Rate limit store: O(m) where m = unique IPs in window
- Queue optimization: Reduces array copying overhead

### Database Load

- Batch inserts reduce connection overhead
- Composite index improves BFS query performance
- Request-level cache reduces redundant queries

### API Rate Limits

- Last.fm: Unknown limit, but caching reduces calls
- Deezer: No API key required, but add timeout protection
- Circuit breaker prevents cascade failures

## Migration Notes

### Database Migration

- Phase 2 requires running: `supabase migration up` to apply the new composite index on `similarity_edges`
- Phase 2 also requires a one-time data migration to normalize existing `artists.name` values to lowercase
- Both operations are backwards compatible and have minimal performance impact when run during a low-traffic window

### Deployment Order

1. Deploy Phase 1 changes (backward compatible)
2. Validate performance improvement
3. Deploy Phase 2 changes (requires migration)
4. Validate index usage and query performance
5. Deploy Phase 3 changes (monitoring only)

### Rollback Plan

- Each phase can be rolled back independently
- Database index can be dropped if needed: `DROP INDEX idx_similarity_source_depth;`
- No data loss risk in any phase

## References

- **Research Document**: `thoughts/shared/research/2025-12-07-caching-implementation-performance-optimization.md`
- **Edge Function**: `supabase/functions/lastfm/index.ts`
- **Database Schema**: `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`
- **Frontend Hook**: `src/hooks/useLastFm.ts`
- **Related Plans**:
  - `thoughts/shared/plans/2025-12-07-artist-image-musicbrainz-integration.md`
  - `thoughts/shared/plans/2025-12-07-musiqasik-tanstack-start-migration.md`
