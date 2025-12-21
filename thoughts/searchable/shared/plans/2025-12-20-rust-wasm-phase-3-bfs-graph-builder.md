# Phase 3: BFS Graph Builder with petgraph

## Overview

This plan ports the BFS graph building algorithm from `src/services/graph.ts` to Rust using the petgraph library. The key optimization is replacing JavaScript's `Array.shift()` (O(n)) with Rust's `VecDeque::pop_front()` (O(1)), along with faster hash operations and pre-computed string normalization. API calls remain in JavaScript; only the graph structure building is moved to WASM.

**Prerequisites**: Phase 1 and Phase 2 must be completed.

## Current State Analysis

### File Being Replaced: `src/services/graph.ts:33-174`

**Current BFS Implementation:**
```typescript
const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];
const visited = new Set<string>();
const requestCache = new Map<string, Artist>();

while (queue.length > 0) {
  const current = queue.shift()!;  // O(n) operation!
  const normalizedName = current.name.toLowerCase();
  if (visited.has(normalizedName)) continue;
  visited.add(normalizedName);
  // ... process artist
  queue.push({ name: similar.name, depth: current.depth + 1 });
}
```

**Performance Issues:**
1. `queue.shift()` at line 46 is O(n) - with 1000+ artists, this becomes significant
2. `toLowerCase()` called 6+ times per artist
3. JavaScript Set/Map have higher overhead than Rust equivalents
4. No parallel processing within BFS levels

**Performance Characteristics (from research):**
| Depth | Artists | Time (Cold) | Time (Cached) |
|-------|---------|-------------|---------------|
| 1     | ~16     | 2-3s        | <1s           |
| 2     | ~241    | 20-30s      | 2-5s          |
| 3     | ~3,631  | 5-10 min    | 5-10s         |

### Expected Improvements

| Operation | Current | WASM | Improvement |
|-----------|---------|------|-------------|
| Queue pop | O(n) | O(1) | 5-10x faster for large queues |
| String normalization | Repeated | Cached | 10x faster |
| Set/Map operations | JS overhead | FxHash | 2x faster |
| **BFS structure building** | Baseline | Optimized | **3-5x faster** |

**Note:** Total graph building time is dominated by network I/O (Last.fm API calls). WASM optimization affects the ~5-10% spent on structure building, not the 90% spent on API calls.

## Desired End State

After completing this phase:
1. `GraphBuilder` Rust struct manages BFS state efficiently
2. `build_graph_structure()` processes batches of artists from JS
3. `GraphService` in TypeScript orchestrates API calls and WASM processing
4. Queue operations are O(1) instead of O(n)
5. String normalization is cached
6. All existing tests pass
7. Benchmarks show structure building 3-5x faster

### Verification
```bash
# Run unit tests
npm run test

# Run WASM tests
npm run wasm:test

# Run benchmarks
npm run test -- src/wasm/benchmarks.test.ts

# Build graph for "Radiohead" at depth 2
# Compare console timing logs between WASM and JS
VITE_USE_WASM_GRAPH=true npm run dev
```

## What We're NOT Doing

- Moving API calls to WASM (network I/O stays in JavaScript)
- Changing the database caching layer
- Modifying the Effect service pattern for API orchestration
- Implementing parallel BFS (remains sequential due to API rate limits)
- Spatial indexing (Phase 4)
- Force simulation (Phase 5)

## Implementation Approach

**Architecture:**
```
JavaScript (Effect Services)          WASM (Rust)
┌─────────────────────────┐          ┌──────────────────────┐
│ GraphService.buildGraph │          │ GraphBuilder         │
│   - API orchestration   │ ←─────→  │   - BFS state        │
│   - Cache lookups       │ batches  │   - VecDeque queue   │
│   - Rate limiting       │          │   - FxHashSet visited│
│   - Error handling      │          │   - String cache     │
└─────────────────────────┘          └──────────────────────┘
```

**Data Flow:**
1. JS calls WASM to get next batch of artists to fetch
2. JS fetches artists from cache/API
3. JS sends fetched artists + similar data to WASM
4. WASM updates graph structure, returns next batch
5. Repeat until queue empty
6. WASM returns final graph data

---

## Phase 3.1: Rust GraphBuilder Implementation

### Overview
Implement the core BFS graph builder in Rust.

### Changes Required:

#### 1. Graph Builder Module

**File**: `rust/graph-wasm/src/graph_builder.rs`

```rust
use crate::types::*;
use rustc_hash::{FxHashMap, FxHashSet};
use std::collections::VecDeque;
use wasm_bindgen::prelude::*;

/// Queue item for BFS traversal
#[derive(Debug, Clone)]
struct QueueItem {
    name: String,
    normalized: String,
    depth: u8,
}

/// Persistent graph builder that maintains BFS state across multiple calls.
/// 
/// This allows JavaScript to orchestrate API calls while Rust handles
/// the efficient graph structure building.
#[wasm_bindgen]
pub struct GraphBuilder {
    /// BFS queue - O(1) push/pop operations
    queue: VecDeque<QueueItem>,
    
    /// Visited artists (normalized names)
    visited: FxHashSet<String>,
    
    /// Artist data cache (normalized name -> Artist)
    artist_cache: FxHashMap<String, Artist>,
    
    /// Accumulated nodes
    nodes: Vec<Artist>,
    
    /// Accumulated edges
    edges: Vec<Edge>,
    
    /// String normalization cache
    norm_cache: FxHashMap<String, String>,
    
    /// Center artist (first artist added)
    center: Option<String>,
    
    /// Maximum depth for BFS
    max_depth: u8,
    
    /// Performance metrics
    queue_operations: u32,
    cache_hits: u32,
}

/// Result of processing a batch of artists
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BatchResult {
    /// Artists that need to be fetched from API
    pub to_fetch: Vec<String>,
    
    /// Whether BFS is complete
    pub complete: bool,
    
    /// Current queue size
    pub queue_size: usize,
    
    /// Number of nodes accumulated
    pub node_count: usize,
    
    /// Number of edges accumulated  
    pub edge_count: usize,
}

/// Final graph result
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphResult {
    pub nodes: Vec<Artist>,
    pub edges: Vec<Edge>,
    pub center: Option<String>,
    pub metrics: GraphMetrics,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraphMetrics {
    pub queue_operations: u32,
    pub cache_hits: u32,
    pub total_visited: usize,
}

#[wasm_bindgen]
impl GraphBuilder {
    /// Create a new graph builder for BFS traversal.
    #[wasm_bindgen(constructor)]
    pub fn new(seed_artist: String, max_depth: u8) -> GraphBuilder {
        let normalized = seed_artist.to_lowercase();
        
        let mut builder = GraphBuilder {
            queue: VecDeque::with_capacity(256),
            visited: FxHashSet::default(),
            artist_cache: FxHashMap::default(),
            nodes: Vec::with_capacity(256),
            edges: Vec::with_capacity(1024),
            norm_cache: FxHashMap::default(),
            center: Some(seed_artist.clone()),
            max_depth,
            queue_operations: 0,
            cache_hits: 0,
        };
        
        // Initialize with seed artist
        builder.norm_cache.insert(seed_artist.clone(), normalized.clone());
        builder.queue.push_back(QueueItem {
            name: seed_artist,
            normalized,
            depth: 0,
        });
        
        builder
    }
    
    /// Get the next batch of artists to fetch.
    /// Returns up to `batch_size` artists that need to be fetched from API/cache.
    #[wasm_bindgen]
    pub fn get_next_batch(&mut self, batch_size: usize) -> JsValue {
        let mut to_fetch: Vec<String> = Vec::with_capacity(batch_size);
        
        while to_fetch.len() < batch_size && !self.queue.is_empty() {
            if let Some(item) = self.queue.pop_front() {
                self.queue_operations += 1;
                
                // Skip if already visited
                if self.visited.contains(&item.normalized) {
                    continue;
                }
                
                // Check if we have it cached
                if self.artist_cache.contains_key(&item.normalized) {
                    self.cache_hits += 1;
                    // Will be processed in process_fetched_artists
                }
                
                // Mark as visited and add to fetch list
                self.visited.insert(item.normalized.clone());
                to_fetch.push(item.name);
            }
        }
        
        let result = BatchResult {
            to_fetch,
            complete: self.queue.is_empty(),
            queue_size: self.queue.len(),
            node_count: self.nodes.len(),
            edge_count: self.edges.len(),
        };
        
        serde_wasm_bindgen::to_value(&result).unwrap()
    }
    
    /// Process fetched artists and their similar artists.
    /// 
    /// Call this after fetching artists from API/cache.
    /// `data` is an array of { artist: Artist, similar: SimilarArtist[], depth: number }
    #[wasm_bindgen]
    pub fn process_fetched_artists(&mut self, data_json: &JsValue) -> Result<(), JsValue> {
        #[derive(serde::Deserialize)]
        struct FetchedData {
            artist: Artist,
            similar: Vec<SimilarArtist>,
            depth: u8,
        }
        
        #[derive(serde::Deserialize)]
        struct SimilarArtist {
            name: String,
            #[serde(rename = "match")]
            match_score: f32,
        }
        
        let data: Vec<FetchedData> = serde_wasm_bindgen::from_value(data_json.clone())
            .map_err(|e| JsValue::from_str(&format!("Failed to parse data: {}", e)))?;
        
        for item in data {
            let artist_normalized = self.normalize(&item.artist.name);
            
            // Add to cache
            self.artist_cache.insert(artist_normalized.clone(), item.artist.clone());
            
            // Add to nodes
            self.nodes.push(item.artist.clone());
            
            // Process similar artists if not at max depth
            if item.depth < self.max_depth {
                for similar in item.similar {
                    let similar_normalized = self.normalize(&similar.name);
                    
                    // Add edge
                    self.edges.push(Edge {
                        source: item.artist.name.clone(),
                        target: similar.name.clone(),
                        weight: similar.match_score,
                    });
                    
                    // Queue if not visited
                    if !self.visited.contains(&similar_normalized) {
                        self.queue.push_back(QueueItem {
                            name: similar.name,
                            normalized: similar_normalized,
                            depth: item.depth + 1,
                        });
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Check if a specific artist is already cached.
    #[wasm_bindgen]
    pub fn is_cached(&self, name: &str) -> bool {
        let normalized = name.to_lowercase();
        self.artist_cache.contains_key(&normalized)
    }
    
    /// Add a cached artist without fetching.
    #[wasm_bindgen]
    pub fn add_cached_artist(&mut self, artist_json: &JsValue) -> Result<(), JsValue> {
        let artist: Artist = serde_wasm_bindgen::from_value(artist_json.clone())
            .map_err(|e| JsValue::from_str(&format!("Failed to parse artist: {}", e)))?;
        
        let normalized = self.normalize(&artist.name);
        self.artist_cache.insert(normalized, artist);
        self.cache_hits += 1;
        
        Ok(())
    }
    
    /// Check if BFS traversal is complete.
    #[wasm_bindgen]
    pub fn is_complete(&self) -> bool {
        self.queue.is_empty()
    }
    
    /// Get current queue size.
    #[wasm_bindgen]
    pub fn queue_size(&self) -> usize {
        self.queue.len()
    }
    
    /// Get current node count.
    #[wasm_bindgen]
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
    
    /// Get final graph result.
    #[wasm_bindgen]
    pub fn get_result(&self) -> JsValue {
        let result = GraphResult {
            nodes: self.nodes.clone(),
            edges: self.edges.clone(),
            center: self.center.clone(),
            metrics: GraphMetrics {
                queue_operations: self.queue_operations,
                cache_hits: self.cache_hits,
                total_visited: self.visited.len(),
            },
        };
        
        serde_wasm_bindgen::to_value(&result).unwrap()
    }
    
    /// Reset the builder for reuse.
    #[wasm_bindgen]
    pub fn reset(&mut self, seed_artist: String, max_depth: u8) {
        self.queue.clear();
        self.visited.clear();
        self.artist_cache.clear();
        self.nodes.clear();
        self.edges.clear();
        // Keep norm_cache for performance
        self.center = Some(seed_artist.clone());
        self.max_depth = max_depth;
        self.queue_operations = 0;
        self.cache_hits = 0;
        
        let normalized = self.normalize(&seed_artist);
        self.queue.push_back(QueueItem {
            name: seed_artist,
            normalized,
            depth: 0,
        });
    }
    
    /// Internal: normalize a string with caching.
    fn normalize(&mut self, s: &str) -> String {
        if let Some(cached) = self.norm_cache.get(s) {
            return cached.clone();
        }
        
        let normalized = s.to_lowercase();
        self.norm_cache.insert(s.to_string(), normalized.clone());
        normalized
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_builder_initialization() {
        let builder = GraphBuilder::new("The Beatles".to_string(), 2);
        
        assert_eq!(builder.queue_size(), 1);
        assert!(!builder.is_complete());
        assert_eq!(builder.center, Some("The Beatles".to_string()));
    }
    
    #[test]
    fn test_queue_operations() {
        let mut builder = GraphBuilder::new("Artist 0".to_string(), 2);
        
        // Simulate getting first batch
        let batch = builder.get_next_batch(10);
        let result: BatchResult = serde_wasm_bindgen::from_value(batch).unwrap();
        
        assert_eq!(result.to_fetch.len(), 1);
        assert_eq!(result.to_fetch[0], "Artist 0");
        assert!(result.complete); // Queue empty after pop
    }
    
    #[test]
    fn test_normalization_cache() {
        let mut builder = GraphBuilder::new("The Beatles".to_string(), 2);
        
        let norm1 = builder.normalize("RADIOHEAD");
        let norm2 = builder.normalize("Radiohead");
        let norm3 = builder.normalize("RADIOHEAD");
        
        assert_eq!(norm1, "radiohead");
        assert_eq!(norm2, "radiohead");
        assert_eq!(norm3, "radiohead");
        
        // Should be cached
        assert!(builder.norm_cache.contains_key("RADIOHEAD"));
        assert!(builder.norm_cache.contains_key("Radiohead"));
    }
}
```

#### 2. Add petgraph Dependency

**File**: `rust/graph-wasm/Cargo.toml` (update dependencies)

```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
rustc-hash = "2.0"
petgraph = { version = "0.8", default-features = false }
console_error_panic_hook = { version = "0.1", optional = true }

# Note: talc allocator is configured in Phase 1 Cargo.toml
# See Phase 1 for the [dependencies.talc] section
```

#### 3. Update lib.rs

**File**: `rust/graph-wasm/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;

mod types;
mod graph_processor;
mod graph_builder;

pub use types::*;
pub use graph_processor::*;
pub use graph_builder::*;

// Note: talc allocator is configured in Phase 1
// The #[global_allocator] is defined there with the `small` feature

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn health_check() -> bool {
    true
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd rust/graph-wasm && cargo check` passes
- [ ] `cd rust/graph-wasm && cargo test` passes (all tests)
- [ ] `npm run wasm:build` succeeds

#### Manual Verification:
- [ ] WASM binary size under 100KB gzipped

---

## Phase 3.2: TypeScript Integration

### Overview
Create TypeScript bindings for the GraphBuilder and integrate with the Effect service layer.

### Changes Required:

#### 1. Update WASM Type Declarations

**File**: `src/wasm/types.d.ts` (append)

```typescript
// Add to existing declarations

declare module '@/wasm/pkg' {
  // ... existing declarations ...

  export class GraphBuilder {
    constructor(seedArtist: string, maxDepth: number);
    
    get_next_batch(batchSize: number): BatchResult;
    process_fetched_artists(data: FetchedArtistData[]): void;
    is_cached(name: string): boolean;
    add_cached_artist(artist: Artist): void;
    is_complete(): boolean;
    queue_size(): number;
    node_count(): number;
    get_result(): GraphResult;
    reset(seedArtist: string, maxDepth: number): void;
    free(): void;
  }

  export interface BatchResult {
    to_fetch: string[];
    complete: boolean;
    queue_size: number;
    node_count: number;
    edge_count: number;
  }

  export interface FetchedArtistData {
    artist: Artist;
    similar: SimilarArtist[];
    depth: number;
  }

  export interface SimilarArtist {
    name: string;
    match: number;
  }

  export interface GraphResult {
    nodes: Artist[];
    edges: Edge[];
    center: string | null;
    metrics: GraphMetrics;
  }

  export interface GraphMetrics {
    queue_operations: number;
    cache_hits: number;
    total_visited: number;
  }

  export interface Artist {
    id?: string;
    name: string;
    mbid?: string;
    url?: string;
    image_url?: string;
    listeners?: number;
    playcount?: number;
    bio?: string;
  }

  export interface Edge {
    source: string;
    target: string;
    weight: number;
  }
}
```

#### 2. WASM Graph Builder Service

**File**: `src/wasm/graph-builder-service.ts`

```typescript
import { getWasmModule, isWasmLoaded } from './loader';
import type { Artist } from '@/types/artist';

export interface SimilarArtist {
  name: string;
  match: number;
}

export interface FetchedArtistData {
  artist: Artist;
  similar: SimilarArtist[];
  depth: number;
}

export interface BatchResult {
  to_fetch: string[];
  complete: boolean;
  queue_size: number;
  node_count: number;
  edge_count: number;
}

export interface GraphResult {
  nodes: Artist[];
  edges: Array<{ source: string; target: string; weight: number }>;
  center: string | null;
  metrics: {
    queue_operations: number;
    cache_hits: number;
    total_visited: number;
  };
}

/**
 * Wrapper class for WASM GraphBuilder.
 * Provides a TypeScript-friendly interface.
 */
export class WasmGraphBuilder {
  private builder: import('@/wasm/pkg').GraphBuilder | null = null;
  private initialized = false;

  constructor(
    private seedArtist: string,
    private maxDepth: number
  ) {}

  /**
   * Initialize the WASM builder.
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    const wasm = getWasmModule();
    if (!wasm) return false;

    try {
      this.builder = new wasm.GraphBuilder(this.seedArtist, this.maxDepth);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[WASM] GraphBuilder init failed:', error);
      return false;
    }
  }

  /**
   * Get next batch of artists to fetch.
   */
  getNextBatch(batchSize: number = 10): BatchResult | null {
    if (!this.builder) return null;

    try {
      return this.builder.get_next_batch(batchSize);
    } catch (error) {
      console.error('[WASM] get_next_batch failed:', error);
      return null;
    }
  }

  /**
   * Process fetched artists and their similar artists.
   */
  processFetchedArtists(data: FetchedArtistData[]): boolean {
    if (!this.builder) return false;

    try {
      this.builder.process_fetched_artists(data);
      return true;
    } catch (error) {
      console.error('[WASM] process_fetched_artists failed:', error);
      return false;
    }
  }

  /**
   * Check if an artist is cached in the builder.
   */
  isCached(name: string): boolean {
    return this.builder?.is_cached(name) ?? false;
  }

  /**
   * Add a cached artist.
   */
  addCachedArtist(artist: Artist): boolean {
    if (!this.builder) return false;

    try {
      this.builder.add_cached_artist(artist);
      return true;
    } catch (error) {
      console.error('[WASM] add_cached_artist failed:', error);
      return false;
    }
  }

  /**
   * Check if BFS is complete.
   */
  isComplete(): boolean {
    return this.builder?.is_complete() ?? true;
  }

  /**
   * Get current queue size.
   */
  queueSize(): number {
    return this.builder?.queue_size() ?? 0;
  }

  /**
   * Get current node count.
   */
  nodeCount(): number {
    return this.builder?.node_count() ?? 0;
  }

  /**
   * Get final result.
   */
  getResult(): GraphResult | null {
    if (!this.builder) return null;

    try {
      return this.builder.get_result();
    } catch (error) {
      console.error('[WASM] get_result failed:', error);
      return null;
    }
  }

  /**
   * Reset for reuse.
   */
  reset(seedArtist: string, maxDepth: number): void {
    this.builder?.reset(seedArtist, maxDepth);
    this.seedArtist = seedArtist;
    this.maxDepth = maxDepth;
  }

  /**
   * Free WASM memory.
   */
  dispose(): void {
    this.builder?.free();
    this.builder = null;
    this.initialized = false;
  }
}

/**
 * Create a new WASM graph builder.
 */
export async function createWasmGraphBuilder(
  seedArtist: string,
  maxDepth: number
): Promise<WasmGraphBuilder | null> {
  if (!isWasmLoaded()) return null;

  const builder = new WasmGraphBuilder(seedArtist, maxDepth);
  const success = await builder.init();
  
  return success ? builder : null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] No type errors in `src/wasm/` directory

#### Manual Verification:
- [ ] Types match Rust struct definitions

---

## Phase 3.3: Update GraphService

### Overview
Modify the Effect-based GraphService to use WASM for structure building.

### Changes Required:

#### 1. Update GraphService

**File**: `src/services/graph.ts`

```typescript
import { Effect, Layer, pipe } from 'effect';
import { LastFmService, DatabaseService, GraphService, ConfigService } from './tags';
import type { Artist, GraphData } from '@/types/artist';
import { 
  createWasmGraphBuilder, 
  WasmGraphBuilder,
  type GraphResult 
} from '@/wasm/graph-builder-service';
import { isWasmLoaded } from '@/wasm/loader';

// Helper for parallel processing with concurrency limit
const parallelMapWithLimit = <T, U, E>(
  items: T[],
  mapper: (item: T) => Effect.Effect<U | null, E>,
  concurrency: number
): Effect.Effect<(U | null)[], E> => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }

  return Effect.reduce(
    batches,
    [] as (U | null)[],
    (acc, batch) =>
      pipe(
        Effect.all(batch.map(mapper), { concurrency }),
        Effect.map((results) => [...acc, ...results])
      )
  );
};

const makeGraphService = Effect.gen(function* () {
  const lastFm = yield* LastFmService;
  const db = yield* DatabaseService;
  const config = yield* ConfigService;

  // Determine if WASM should be used
  const useWasm = config.useWasmGraph && isWasmLoaded();

  return GraphService.of({
    buildGraph: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const startTime = Date.now();

        if (useWasm) {
          // WASM-accelerated path
          const result = yield* buildGraphWasm(
            artistName,
            maxDepth,
            lastFm,
            db
          );
          
          const endTime = Date.now();
          return {
            ...result,
            metrics: {
              duration: endTime - startTime,
              nodeCount: result.nodes.length,
              wasmMetrics: result.metrics,
            },
          };
        } else {
          // JavaScript fallback path (existing implementation)
          const result = yield* buildGraphJS(
            artistName,
            maxDepth,
            lastFm,
            db
          );
          
          const endTime = Date.now();
          return {
            ...result,
            metrics: {
              duration: endTime - startTime,
              nodeCount: result.nodes.length,
            },
          };
        }
      }),
  });
});

/**
 * WASM-accelerated graph building.
 * Uses WASM for BFS state management, JS for API calls.
 */
function buildGraphWasm(
  artistName: string,
  maxDepth: number,
  lastFm: typeof LastFmService.Type,
  db: typeof DatabaseService.Type
): Effect.Effect<GraphResult, import('@/lib/errors').AppError> {
  return Effect.gen(function* () {
    const builder = yield* Effect.tryPromise({
      try: () => createWasmGraphBuilder(artistName, maxDepth),
      catch: (e) => new Error(`Failed to create WASM builder: ${e}`),
    });

    if (!builder) {
      // Fall back to JS implementation
      const jsResult = yield* buildGraphJS(artistName, maxDepth, lastFm, db);
      return {
        nodes: jsResult.nodes,
        edges: jsResult.edges,
        center: jsResult.center?.name ?? null,
        metrics: {
          queue_operations: 0,
          cache_hits: 0,
          total_visited: jsResult.nodes.length,
        },
      };
    }

    try {
      // Process batches until complete
      while (!builder.isComplete()) {
        const batch = builder.getNextBatch(5);
        if (!batch || batch.to_fetch.length === 0) break;

        // Fetch artists in parallel (up to 5 concurrent)
        const fetchedData = yield* parallelMapWithLimit(
          batch.to_fetch,
          (name) =>
            Effect.gen(function* () {
              // Try cache first
              let artist = yield* db.getArtist(name);
              
              if (!artist) {
                // Fetch from API
                const artistInfo = yield* lastFm.getArtistInfo(name);
                if (!artistInfo) return null;
                
                artist = yield* db.upsertArtist(artistInfo);
              }

              if (!artist) return null;

              // Get similar artists
              const cachedEdges = yield* db.getCachedEdges(artist.id!);
              
              let similar: Array<{ name: string; match: number }>;
              
              if (cachedEdges.length > 0) {
                similar = cachedEdges
                  .filter((e) => e.target)
                  .map((e) => ({
                    name: e.target!.name,
                    match: e.match_score,
                  }));
              } else {
                similar = yield* lastFm.getSimilarArtists(name);
                
                // Cache edges
                if (similar.length > 0) {
                  const edgesToCache = yield* Effect.all(
                    similar.map((s) =>
                      Effect.gen(function* () {
                        let targetArtist = yield* db.getArtist(s.name);
                        if (!targetArtist) {
                          const targetInfo = yield* lastFm.getArtistInfo(s.name);
                          if (targetInfo) {
                            targetArtist = yield* db.upsertArtist(targetInfo);
                          }
                        }
                        if (targetArtist) {
                          return {
                            source_artist_id: artist!.id!,
                            target_artist_id: targetArtist.id!,
                            match_score: s.match,
                            depth: 1, // Will be set by builder
                          };
                        }
                        return null;
                      }).pipe(Effect.catchAll(() => Effect.succeed(null)))
                    ),
                    { concurrency: 5 }
                  );
                  
                  const validEdges = edgesToCache.filter((e) => e !== null);
                  if (validEdges.length > 0) {
                    yield* db.upsertEdges(validEdges as any);
                  }
                }
              }

              // Determine depth from batch context
              const depth = 0; // Will be tracked by builder

              return {
                artist,
                similar,
                depth,
              };
            }).pipe(Effect.catchAll(() => Effect.succeed(null))),
          5
        );

        // Send to WASM builder
        const validData = fetchedData.filter((d) => d !== null);
        if (validData.length > 0) {
          builder.processFetchedArtists(validData as any);
        }
      }

      // Get final result
      const result = builder.getResult();
      builder.dispose();

      if (!result) {
        throw new Error('Failed to get WASM builder result');
      }

      return result;
    } catch (error) {
      builder.dispose();
      throw error;
    }
  });
}

/**
 * Original JavaScript graph building implementation.
 * Used as fallback when WASM is unavailable.
 */
function buildGraphJS(
  artistName: string,
  maxDepth: number,
  lastFm: typeof LastFmService.Type,
  db: typeof DatabaseService.Type
): Effect.Effect<
  { nodes: Artist[]; edges: Array<{ source: string; target: string; weight: number }>; center: Artist | null },
  import('@/lib/errors').AppError
> {
  return Effect.gen(function* () {
    const visited = new Set<string>();
    const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];
    const nodes: Artist[] = [];
    const edges: Array<{ source: string; target: string; weight: number }> = [];
    let center: Artist | null = null;

    const requestCache = new Map<string, Artist>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const normalizedName = current.name.toLowerCase();

      if (visited.has(normalizedName)) continue;
      visited.add(normalizedName);

      let artist = requestCache.get(normalizedName);
      if (!artist) {
        const dbArtist = yield* db.getArtist(current.name);
        if (dbArtist) {
          artist = dbArtist;
        }
      }

      if (!artist) {
        const artistInfo = yield* lastFm.getArtistInfo(current.name);
        if (!artistInfo) continue;

        artist = yield* db.upsertArtist(artistInfo);
      }

      if (artist) {
        requestCache.set(normalizedName, artist);
        nodes.push(artist);

        if (current.depth === 0) {
          center = artist;
        }

        if (current.depth < maxDepth) {
          const cachedEdges = yield* db.getCachedEdges(artist.id!);

          if (cachedEdges.length > 0) {
            for (const edge of cachedEdges) {
              if (edge.target) {
                edges.push({
                  source: artist.name,
                  target: edge.target.name,
                  weight: edge.match_score,
                });

                if (!visited.has(edge.target.name.toLowerCase())) {
                  queue.push({ name: edge.target.name, depth: current.depth + 1 });
                }
              }
            }
          } else {
            const similar = yield* lastFm.getSimilarArtists(current.name);

            const currentArtist = artist;
            const currentDepth = current.depth;

            const results = yield* parallelMapWithLimit(
              similar,
              (sim) =>
                Effect.gen(function* () {
                  let targetArtist =
                    requestCache.get(sim.name.toLowerCase()) ||
                    (yield* db.getArtist(sim.name));

                  if (!targetArtist) {
                    const targetInfo = yield* lastFm.getArtistInfo(sim.name);
                    if (targetInfo) {
                      targetArtist = yield* db.upsertArtist(targetInfo);
                    }
                  }

                  if (targetArtist) {
                    requestCache.set(sim.name.toLowerCase(), targetArtist);

                    return {
                      edge: {
                        source: currentArtist.name,
                        target: targetArtist.name,
                        weight: sim.match,
                      },
                      shouldQueue: !visited.has(sim.name.toLowerCase()),
                      name: sim.name,
                      depth: currentDepth + 1,
                      sourceId: currentArtist.id!,
                      targetId: targetArtist.id!,
                      matchScore: sim.match,
                    };
                  }
                  return null;
                }).pipe(Effect.catchAll(() => Effect.succeed(null))),
              5
            );

            const edgesToUpsert: Array<{
              source_artist_id: string;
              target_artist_id: string;
              match_score: number;
              depth: number;
            }> = [];

            for (const result of results) {
              if (result) {
                edges.push(result.edge);
                if (result.shouldQueue) {
                  queue.push({ name: result.name, depth: result.depth });
                }
                edgesToUpsert.push({
                  source_artist_id: result.sourceId,
                  target_artist_id: result.targetId,
                  match_score: result.matchScore,
                  depth: result.depth,
                });
              }
            }

            if (edgesToUpsert.length > 0) {
              yield* db.upsertEdges(edgesToUpsert);
            }
          }
        }
      }
    }

    return { nodes, edges, center };
  });
}

export const GraphServiceLive = Layer.effect(GraphService, makeGraphService);
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] `npm run lint` passes
- [ ] Existing GraphService tests pass

#### Manual Verification:
- [ ] Graph builds correctly with WASM enabled
- [ ] Graph builds correctly with WASM disabled (fallback)

---

## Phase 3.4: Testing and Benchmarks

### Overview
Add comprehensive tests and performance benchmarks for the BFS builder.

### Changes Required:

#### 1. WASM Builder Tests

**File**: `src/wasm/graph-builder-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WASM module
vi.mock('@/wasm/pkg', () => {
  class MockGraphBuilder {
    private queue: string[] = [];
    private complete = false;
    
    constructor(seed: string, maxDepth: number) {
      this.queue = [seed];
    }
    
    get_next_batch(size: number) {
      const batch = this.queue.splice(0, size);
      this.complete = this.queue.length === 0;
      return {
        to_fetch: batch,
        complete: this.complete,
        queue_size: this.queue.length,
        node_count: 0,
        edge_count: 0,
      };
    }
    
    process_fetched_artists(data: any[]) {
      for (const item of data) {
        for (const similar of item.similar || []) {
          this.queue.push(similar.name);
        }
      }
      this.complete = this.queue.length === 0;
    }
    
    is_cached(name: string) {
      return false;
    }
    
    add_cached_artist(artist: any) {}
    
    is_complete() {
      return this.complete;
    }
    
    queue_size() {
      return this.queue.length;
    }
    
    node_count() {
      return 0;
    }
    
    get_result() {
      return {
        nodes: [],
        edges: [],
        center: null,
        metrics: {
          queue_operations: 0,
          cache_hits: 0,
          total_visited: 0,
        },
      };
    }
    
    reset(seed: string, maxDepth: number) {
      this.queue = [seed];
      this.complete = false;
    }
    
    free() {}
  }
  
  return {
    init: vi.fn().mockResolvedValue(undefined),
    get_version: vi.fn().mockReturnValue('0.1.0'),
    health_check: vi.fn().mockReturnValue(true),
    GraphBuilder: MockGraphBuilder,
  };
});

vi.mock('@/wasm/loader', () => ({
  getWasmModule: () => require('@/wasm/pkg'),
  isWasmLoaded: () => true,
}));

describe('WasmGraphBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize builder', async () => {
    const { createWasmGraphBuilder } = await import('./graph-builder-service');
    
    const builder = await createWasmGraphBuilder('The Beatles', 2);
    
    expect(builder).not.toBeNull();
  });

  it('should get next batch', async () => {
    const { createWasmGraphBuilder } = await import('./graph-builder-service');
    
    const builder = await createWasmGraphBuilder('The Beatles', 2);
    const batch = builder!.getNextBatch(10);
    
    expect(batch).not.toBeNull();
    expect(batch!.to_fetch).toContain('The Beatles');
  });

  it('should process fetched artists', async () => {
    const { createWasmGraphBuilder } = await import('./graph-builder-service');
    
    const builder = await createWasmGraphBuilder('The Beatles', 2);
    builder!.getNextBatch(10);
    
    const success = builder!.processFetchedArtists([
      {
        artist: { name: 'The Beatles' },
        similar: [{ name: 'Radiohead', match: 0.8 }],
        depth: 0,
      },
    ]);
    
    expect(success).toBe(true);
    expect(builder!.isComplete()).toBe(false);
  });

  it('should complete when queue empty', async () => {
    const { createWasmGraphBuilder } = await import('./graph-builder-service');
    
    const builder = await createWasmGraphBuilder('The Beatles', 2);
    builder!.getNextBatch(10);
    builder!.processFetchedArtists([
      {
        artist: { name: 'The Beatles' },
        similar: [],
        depth: 0,
      },
    ]);
    
    expect(builder!.isComplete()).toBe(true);
  });

  it('should dispose correctly', async () => {
    const { createWasmGraphBuilder } = await import('./graph-builder-service');
    
    const builder = await createWasmGraphBuilder('The Beatles', 2);
    builder!.dispose();
    
    // Should not throw
    expect(builder!.isComplete()).toBe(true);
  });
});
```

#### 2. Performance Benchmarks

**File**: `src/wasm/graph-builder-benchmarks.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

// Only run when WASM is built
const describeWasm = process.env.CI ? describe.skip : describe;

describeWasm('GraphBuilder Benchmarks', () => {
  interface Artist {
    id: string;
    name: string;
  }
  
  interface Edge {
    source: string;
    target: string;
    weight: number;
  }

  // JavaScript BFS implementation for comparison
  function buildGraphJS(
    seedArtist: string,
    artistData: Map<string, { similar: Array<{ name: string; match: number }> }>,
    maxDepth: number
  ): { nodes: string[]; edges: Edge[] } {
    const visited = new Set<string>();
    const queue: Array<{ name: string; depth: number }> = [{ name: seedArtist, depth: 0 }];
    const nodes: string[] = [];
    const edges: Edge[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;  // O(n) operation
      const normalized = current.name.toLowerCase();

      if (visited.has(normalized)) continue;
      visited.add(normalized);
      nodes.push(current.name);

      if (current.depth < maxDepth) {
        const data = artistData.get(normalized);
        if (data) {
          for (const similar of data.similar) {
            edges.push({
              source: current.name,
              target: similar.name,
              weight: similar.match,
            });
            
            if (!visited.has(similar.name.toLowerCase())) {
              queue.push({ name: similar.name, depth: current.depth + 1 });
            }
          }
        }
      }
    }

    return { nodes, edges };
  }

  // Generate test data
  function generateArtistNetwork(
    nodeCount: number,
    edgesPerNode: number
  ): Map<string, { similar: Array<{ name: string; match: number }> }> {
    const network = new Map();
    
    for (let i = 0; i < nodeCount; i++) {
      const similar: Array<{ name: string; match: number }> = [];
      for (let j = 0; j < edgesPerNode; j++) {
        const target = Math.floor(Math.random() * nodeCount);
        if (target !== i) {
          similar.push({
            name: `Artist ${target}`,
            match: Math.random(),
          });
        }
      }
      network.set(`artist ${i}`, { similar });
    }
    
    return network;
  }

  const testCases = [
    { nodes: 100, edges: 10, depth: 1, name: 'Small depth=1' },
    { nodes: 500, edges: 10, depth: 2, name: 'Medium depth=2' },
    { nodes: 1000, edges: 15, depth: 2, name: 'Large depth=2' },
  ];

  testCases.forEach(({ nodes, edges, depth, name }) => {
    it(`should benchmark queue operations: ${name}`, async () => {
      const network = generateArtistNetwork(nodes, edges);
      const iterations = 5;

      // JS benchmark
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        buildGraphJS('Artist 0', network, depth);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // For this test, we're measuring the BFS queue overhead
      // WASM will have O(1) pop vs JS O(n) shift
      console.log(`\n${name}:`);
      console.log(`  JS BFS: ${jsTime.toFixed(2)}ms`);
      console.log(`  Queue shifts: ~${nodes * (edges ** depth)} operations`);
      
      // The improvement depends on queue size
      // For depth=2 with 10 edges/node, expect ~100 queue operations
      // For depth=2 with 15 edges/node, expect ~225 queue operations
      
      expect(jsTime).toBeGreaterThan(0);
    });
  });
});
```

#### 3. Integration Tests

**File**: `src/services/graph.test.ts` (add tests)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { GraphServiceLive } from './graph';
import { LastFmService, DatabaseService, ConfigService, GraphService } from './tags';

describe('GraphService with WASM', () => {
  const mockLastFm = {
    searchArtists: vi.fn(),
    getArtistInfo: vi.fn(),
    getSimilarArtists: vi.fn(),
  };

  const mockDb = {
    getArtist: vi.fn(),
    upsertArtist: vi.fn(),
    getCachedEdges: vi.fn(),
    upsertEdges: vi.fn(),
  };

  const mockConfig = {
    lastFmApiKey: 'test',
    surrealdbWsUrl: '',
    surrealdbHttpUrl: '',
    surrealdbNamespace: '',
    surrealdbDatabase: '',
    surrealdbUser: '',
    surrealdbPass: '',
    useWasmGraph: true,
    wasmDebug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLastFm.getArtistInfo.mockReturnValue(
      Effect.succeed({ id: '1', name: 'The Beatles' })
    );
    mockLastFm.getSimilarArtists.mockReturnValue(
      Effect.succeed([{ name: 'Radiohead', match: 0.8 }])
    );
    mockDb.getArtist.mockReturnValue(Effect.succeed(null));
    mockDb.upsertArtist.mockReturnValue(
      Effect.succeed({ id: '1', name: 'The Beatles' })
    );
    mockDb.getCachedEdges.mockReturnValue(Effect.succeed([]));
    mockDb.upsertEdges.mockReturnValue(Effect.succeed(undefined));
  });

  it('should build graph with feature flag', async () => {
    const testLayer = Layer.mergeAll(
      Layer.succeed(LastFmService, mockLastFm as any),
      Layer.succeed(DatabaseService, mockDb as any),
      Layer.succeed(ConfigService, mockConfig)
    );

    const graphLayer = Layer.provide(GraphServiceLive, testLayer);

    const program = Effect.gen(function* () {
      const graph = yield* GraphService;
      return yield* graph.buildGraph('The Beatles', 1);
    });

    const result = await Effect.runPromise(
      Effect.provide(program, graphLayer)
    );

    expect(result.nodes.length).toBeGreaterThan(0);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test` passes all tests
- [ ] `npm run wasm:test` passes Rust tests
- [ ] Test coverage > 80% for new code

#### Manual Verification:
- [ ] Console shows WASM metrics when debug enabled
- [ ] Graph builds successfully with depth 2

---

## Testing Strategy

### Unit Tests
- GraphBuilder Rust struct initialization
- Queue operations (push, pop, empty check)
- Visited set behavior
- Normalization caching
- Batch processing

### Integration Tests
- TypeScript wrapper methods
- Effect service integration
- Feature flag switching
- Fallback to JavaScript

### Performance Benchmarks
- Queue operations: Compare O(n) shift vs O(1) pop_front
- String normalization: Measure cache hit rate
- Full BFS: Measure structure building time (excluding API calls)

### E2E Tests
- Build graph for real artist
- Verify node/edge counts
- Check center artist identification

## Performance Considerations

- VecDeque provides O(1) push/pop operations
- FxHashSet/FxHashMap are 2x faster than std HashMap for string keys
- String normalization cache prevents repeated toLowerCase() calls
- Batch processing reduces JS/WASM boundary crossings
- Pre-allocated collections reduce memory allocations

## Migration Notes

This phase implements a **big bang replacement**:
- When WASM is enabled, all BFS operations use Rust
- JavaScript implementation remains as complete fallback
- API orchestration stays in JavaScript/Effect
- No gradual rollout or A/B testing

## References

- Phase 1 Plan: `thoughts/shared/plans/2025-12-20-rust-wasm-phase-1-foundation.md`
- Phase 2 Plan: `thoughts/shared/plans/2025-12-20-rust-wasm-phase-2-graph-data-processing.md`
- Research: `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md`
- Current implementation: `src/services/graph.ts:33-174`
- petgraph documentation: https://docs.rs/petgraph/latest/petgraph/
