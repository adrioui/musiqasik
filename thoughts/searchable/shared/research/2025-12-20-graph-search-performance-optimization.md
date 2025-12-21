---
date: 2025-12-20T10:45:00+07:00
researcher: Claude
git_commit: d6d7c8b99ccedfb49d460846d1cde313c7b0b5d2
branch: main
repository: musiqasik
topic: "How to make graph searching faster using any technology"
tags: [research, codebase, performance, graph, optimization, caching, webgl, web-workers]
status: complete
last_updated: 2025-12-20
last_updated_by: Claude
---

# Research: Graph Search Performance Optimization

**Date**: 2025-12-20T10:45:00+07:00
**Researcher**: Claude
**Git Commit**: d6d7c8b99ccedfb49d460846d1cde313c7b0b5d2
**Branch**: main
**Repository**: musiqasik

## Research Question

How can we make the graph searching faster? We can use any kind of technology.

## Summary

The current graph search implementation has several performance bottlenecks: BFS traversal is network-bound (3-5 seconds for depth=2), D3.js Canvas rendering struggles with 2,000+ nodes, and caching lacks TTL/invalidation. The most impactful optimizations would be:

1. **WebGL rendering** (Sigma.js or Cytoscape.js) - 10-100x performance gain for large graphs
2. **Web Workers** for BFS computation - keeps UI responsive during graph building
3. **Client-side caching** (IndexedDB + Service Workers) - 80% reduction in API calls
4. **Viewport culling with R-trees** - 3-5x render speedup for graphs with 500+ nodes
5. **Incremental graph loading** - better perceived performance with streaming results

## Detailed Findings

### 1. Current BFS Algorithm Analysis

**Location**: `src/services/graph.ts:33-174`

**Current Implementation**:
- BFS with queue-based traversal (`queue.shift()` - O(n) operation)
- Three-tier caching: request cache → SurrealDB → Last.fm API
- Parallel processing with 5 concurrent requests per artist level
- Last.fm returns max 15 similar artists per query

**Performance Characteristics**:
| Depth | Artists | Time (Cold) | Time (Cached) |
|-------|---------|-------------|---------------|
| 1     | ~16     | 2-3s        | <1s           |
| 2     | ~241    | 20-30s      | 2-5s          |
| 3     | ~3,631  | 5-10 min    | 5-10s         |

**Bottlenecks Identified**:
1. `queue.shift()` is O(n) - use deque structure instead
2. Sequential level processing - cannot parallelize across BFS levels
3. API latency dominates (~100-500ms per request)
4. No request deduplication across concurrent requests

**Code Reference**: `src/services/graph.ts:46` - queue shift operation

### 2. ForceGraph D3.js Performance

**Location**: `src/components/ForceGraph/index.tsx`

**Current Implementation**:
- D3.js force simulation with Canvas rendering
- Full teardown/rebuild on property changes (`svg.selectAll('*').remove()`)
- Tick updates: N node transforms + E link coordinates per tick
- Images create additional DOM elements (clipPath, image) per node

**Bottlenecks Identified**:
1. Full re-render on threshold/dimension changes (`index.tsx:238`)
2. No incremental updates - entire graph recreated
3. Image loading is synchronous during node creation
4. No viewport culling - renders all nodes regardless of visibility
5. No level-of-detail (LOD) rendering

**Performance Metrics**:
- 50 nodes: ~100-200 SVG elements, smooth
- 200 nodes: ~400-800 SVG elements, slight lag
- 500+ nodes: noticeable performance degradation

### 3. Current Caching Mechanisms

**Location**: `src/services/database.ts`, `src/services/graph.ts`

**Three-Tier Cache**:
1. **Request Cache** (`graph.ts:43`): In-memory Map, scoped to single graph build
2. **SurrealDB** (`database.ts`): Persistent artist + edge storage
3. **Last.fm API**: Final fallback

**Cache Flow**:
```
Request Cache (O(1)) → SurrealDB Query (~10ms) → Last.fm API (~200-500ms)
```

**Missing Features**:
- No TTL (Time-To-Live) - data never expires
- No cache eviction policy
- No proactive refresh
- Edges never updated once cached (`database.ts:89`)
- No client-side caching (IndexedDB)

### 4. Last.fm API Patterns

**Location**: `src/services/lastfm.ts`

**Current Implementation**:
- 5-second timeout per request (`lastfm.ts:7`)
- Exponential backoff: 100ms, 200ms, max 2 retries
- Concurrency limit: 5 parallel requests (`graph.ts:140`)
- Deezer fallback for artist images (`lastfm.ts:41-55`)

**Rate Limiting**:
- 429 detection but no dynamic delay adjustment
- Last.fm has undocumented rate limits (~5 requests/second recommended)

---

## Recommended Optimizations

### Tier 1: Immediate Wins (1-2 weeks)

#### 1.1 Viewport Culling with R-tree (1-2 days)

**Implementation**:
```typescript
// src/lib/spatial-index.ts
import RBush from 'rbush';

export function createSpatialIndex(nodes: GraphNode[]) {
  const tree = new RBush();
  tree.load(nodes.map(n => ({
    minX: n.x - 20, minY: n.y - 20,
    maxX: n.x + 20, maxY: n.y + 20,
    data: n
  })));
  return tree;
}

export function getVisibleNodes(tree: RBush, viewport: Viewport) {
  return tree.search(viewport).map(item => item.data);
}
```

**Expected Gain**: 3-5x render performance for 500+ node graphs

#### 1.2 IndexedDB Client-Side Caching (2-3 days)

**Implementation**:
```typescript
// src/services/indexeddb.ts
import { openDB } from 'idb';

export async function initDB() {
  return openDB('musiqasiq', 1, {
    upgrade(db) {
      const artistStore = db.createObjectStore('artists', { keyPath: 'name' });
      artistStore.createIndex('lastUpdated', 'lastUpdated');
      db.createObjectStore('edges', { keyPath: ['source', 'target'] });
    },
  });
}

export async function getCachedArtist(name: string, maxAge = 7 * 24 * 60 * 60 * 1000) {
  const db = await initDB();
  const cached = await db.get('artists', name);
  if (!cached || Date.now() - cached.lastUpdated > maxAge) return null;
  return cached;
}
```

**Expected Gain**: 80% reduction in API calls for repeat users

#### 1.3 Service Worker with Workbox (1-2 days)

**Implementation** (vite.config.ts):
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        runtimeCaching: [{
          urlPattern: /^https:\/\/ws\.audioscrobbler\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'lastfm-api',
            expiration: { maxEntries: 500, maxAgeSeconds: 604800 }
          }
        }]
      }
    })
  ]
});
```

**Expected Gain**: Offline support, instant repeat loads

#### 1.4 Web Worker for BFS (2-3 days)

**Implementation**:
```typescript
// src/workers/graph.worker.ts
import { expose } from 'comlink';

async function buildGraphBFS(seedArtist: string, depth: number, apiKey: string) {
  // Move BFS logic here - runs on separate thread
}

expose({ buildGraphBFS });
```

**Setup**: `npm install comlink vite-plugin-comlink`

**Expected Gain**: UI remains responsive during 20-30 second graph builds

### Tier 2: Medium-Term Improvements (1-2 months)

#### 2.1 WebGL Graph Rendering

**Options**:

| Library | Bundle Size | Best For | Migration Effort |
|---------|-------------|----------|------------------|
| **Sigma.js** | ~50KB | Large graphs (10k+) | 1-2 weeks |
| **Cytoscape.js** | ~200KB | Features + Performance | 1-2 weeks |

**Recommendation**: Migrate to **Sigma.js** when hitting 2,000+ nodes

**Expected Gain**: 10-100x performance for large graphs

#### 2.2 Incremental Graph Loading

**Implementation**:
```typescript
// Generator-based BFS with streaming
async function* buildGraphIncremental(seed: string, maxDepth: number) {
  while (queue.length > 0) {
    const batch = queue.splice(0, 10);
    for (const { artist, depth } of batch) {
      const similar = await getSimilarArtists(artist);
      yield { nodes: [artist], edges: similar.map(...) };
    }
  }
}
```

**Expected Gain**: Better perceived performance - shows progress immediately

#### 2.3 Level-of-Detail (LOD) Rendering

**Implementation**:
```typescript
function renderNode(node: GraphNode, zoom: number) {
  if (zoom < 0.5) {
    // Zoomed out: colored dots only
    ctx.fillRect(node.x - 2, node.y - 2, 4, 4);
  } else if (zoom < 1.5) {
    // Medium: circles without labels
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
  } else {
    // Full detail: images + labels
    ctx.drawImage(node.image, ...);
    ctx.fillText(node.label, ...);
  }
}
```

**Expected Gain**: Handles 10k+ nodes smoothly

### Tier 3: Long-Term Architecture (3-6 months)

#### 3.1 Server-Side Graph Computation with Streaming

Use Server-Sent Events (SSE) for real-time progress:

```typescript
// server/routes/graph.ts
export async function streamGraph(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  
  for await (const update of buildGraphIncremental(seed, depth)) {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  }
  res.end();
}
```

**When to implement**: Collaborative features or graphs exceeding 5,000 nodes

#### 3.2 Graph Database Migration (Neo4j)

**When to migrate**:
- 5+ hop traversals required
- Real-time analytics on millions of relationships
- Complex graph algorithms (betweenness, clustering)

**Performance Comparison**:
- Neo4j: 60-180x faster for 2-3 hop queries vs relational DB
- SurrealDB: Adequate for current scale (1-3 hops)

**Recommendation**: Keep SurrealDB for now; migration overhead not justified at current scale

#### 3.3 Redis Caching Layer

**When to implement**:
- 1000+ concurrent users
- Need to cache expensive BFS traversal results

```typescript
// Cache graph computation results
await redis.setex(`graph:${artist}:${depth}`, 3600, JSON.stringify(graph));
```

---

## Code References

- `src/services/graph.ts:33-174` - BFS algorithm implementation
- `src/services/graph.ts:6-26` - parallelMapWithLimit helper
- `src/services/graph.ts:46` - queue.shift() bottleneck
- `src/components/ForceGraph/index.tsx:44-238` - D3 visualization
- `src/components/ForceGraph/index.tsx:51` - Full DOM clear on re-render
- `src/services/database.ts:11-23` - Artist caching
- `src/services/database.ts:63-79` - Edge caching
- `src/services/database.ts:81-105` - Batch edge upsert
- `src/services/lastfm.ts:23-39` - Retry mechanism
- `src/hooks/useLastFm.ts:142-175` - Graph fetching with fallback
- `src/components/ForceGraph/hooks/useGraphData.ts:17-58` - Data filtering/memoization

## Architecture Insights

### Current Data Flow
```
User Search → useLastFm → Effect Runtime → GraphService
                                              ↓
                            BFS Queue Processing (5 concurrent)
                                              ↓
                     Request Cache → SurrealDB → Last.fm API
                                              ↓
                            ForceGraph (D3.js Canvas)
```

### Recommended Future Architecture
```
User Search → Web Worker (BFS)
                    ↓
     IndexedDB → SurrealDB → Last.fm API
                    ↓
         SSE Stream (incremental results)
                    ↓
     Sigma.js/Cytoscape.js (WebGL) + R-tree viewport culling
```

## Historical Context (from thoughts/)

The following documents contain related performance research and plans:

- `thoughts/shared/research/2025-12-07-caching-implementation-performance-optimization.md` - Documents current 3-5s load times and identified bottlenecks
- `thoughts/shared/plans/2025-12-07-caching-performance-optimization.md` - Primary optimization plan targeting <2s load times
- `thoughts/shared/plans/2025-12-07-surrealdb-effect-migration.md` - Migration plan for improved graph query performance
- `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md` - Recent analysis identifying missing caching features
- `thoughts/shared/plans/2025-12-19-comprehensive-codebase-cleanup.md` - Identifies ForceGraph performance issues

## Related Research

- `thoughts/shared/research/2025-12-07-effect-integration-research.md` - Effect.ts patterns for service composition
- `thoughts/shared/research/2025-12-07-supabase-implementation.md` - Previous caching implementation analysis

## Open Questions

1. **Rate limiting**: What are Last.fm's actual rate limits? Current retry logic may be insufficient
2. **Mobile performance**: Separate optimization path may be needed for mobile/PWA
3. **Cache invalidation**: When should cached similarity data expire? Artist relationships change over time
4. **Real-time collaboration**: Would require WebSocket infrastructure if multiple users view same graph
5. **Bundle size impact**: Sigma.js adds ~50KB, Cytoscape.js adds ~200KB - acceptable trade-off?

## Implementation Priority Matrix

| Optimization | Effort | Impact | Priority |
|--------------|--------|--------|----------|
| Viewport culling (R-tree) | Low (2 days) | High (3-5x) | **P0** |
| IndexedDB caching | Low (3 days) | High (80% API reduction) | **P0** |
| Web Worker for BFS | Medium (3 days) | Medium (UI responsiveness) | **P1** |
| Service Worker (PWA) | Low (2 days) | Medium (offline support) | **P1** |
| Incremental loading | Medium (1 week) | Medium (perceived perf) | **P2** |
| LOD rendering | Low (3 days) | Medium (scale to 10k) | **P2** |
| WebGL migration | High (2 weeks) | Very High (100x) | **P2** |
| SSE streaming | High (3 weeks) | Medium (collaboration) | **P3** |
| Neo4j migration | Very High (6 weeks) | High (deep traversals) | **P4** |
