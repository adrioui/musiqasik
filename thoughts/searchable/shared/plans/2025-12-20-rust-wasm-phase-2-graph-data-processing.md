# Phase 2: Core Graph Data Processing in WASM

## Overview

This plan ports the graph data filtering and link resolution logic from TypeScript to Rust WASM. We'll replace `useGraphData.ts` filtering and `ForceGraph/index.tsx` link resolution with WASM functions, achieving 2-4x performance improvement through single-pass algorithms and efficient hash maps.

**Prerequisites**: Phase 1 (Rust WASM Foundation) must be completed.

## Current State Analysis

### Files Being Replaced

#### 1. useGraphData.ts:23-56 (Data Filtering)
```typescript
// Current: Multi-pass filtering with repeated toLowerCase()
const filteredEdges = edges.filter((e) => e.weight >= threshold);
const connectedNodes = new Set<string>();
filteredEdges.forEach((e) => {
  connectedNodes.add(e.source.toLowerCase());
  connectedNodes.add(e.target.toLowerCase());
});
const filteredNodes = nodes.filter(...)
  .map((node) => ({ ...node, isCenter: ... }));
const nodeMap = new Map(...);
const graphLinks = filteredEdges.map(...).filter(...);
```

**Performance Issues:**
- 5 array iterations (filter → forEach → filter → map → map → filter)
- 6+ `.toLowerCase()` calls per node
- Multiple intermediate data structures
- JavaScript Set/Map overhead

#### 2. ForceGraph/index.tsx:42-59 (Link Resolution)
```typescript
// Current: Rebuilds nodeMap and re-resolves links
const nodes = filteredNodes.map((node) => ({ ...node }));
const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]));
const resolvedLinks: SimulationLink[] = [];
for (const link of graphLinks) {
  const sourceName = typeof link.source === 'string' ? link.source : link.source.name;
  // ...
}
```

**Performance Issues:**
- Redundant nodeMap creation (already done in useGraphData)
- Type checking in hot loop (`typeof link.source`)
- String-based lookups instead of integer indices

### Expected Improvements

| Operation | Current | WASM | Improvement |
|-----------|---------|------|-------------|
| Edge filtering | O(E) | O(E) | Same complexity, 1.5x faster |
| Set construction | O(E) | O(E) | FxHashSet 2x faster |
| Node filtering | O(N) | O(N) | Single-pass, 2x faster |
| Link resolution | O(E) | O(E) | Integer indices, 3x faster |
| String normalization | 6N calls | 1 call cached | 10x faster |
| **Overall** | Baseline | Optimized | **2-4x faster** |

## Desired End State

After completing this phase:
1. `process_graph_data()` WASM function handles all filtering
2. `resolve_links()` WASM function produces integer-indexed links for D3
3. `useGraphData.ts` calls WASM when feature flag enabled
4. `ForceGraph/index.tsx` uses pre-resolved links
5. All existing tests pass
6. New benchmarks show 2-4x improvement

### Verification
```bash
# Run unit tests
npm run test

# Run WASM-specific tests
npm run test -- --grep "WASM"

# Run benchmarks
npm run test -- src/wasm/benchmarks.test.ts

# Run E2E tests
npm run test:e2e
```

## What We're NOT Doing

- BFS algorithm changes (Phase 3)
- Spatial indexing (Phase 4)
- Force simulation changes (Phase 5)
- D3 rendering changes (beyond consuming resolved links)
- SurrealDB or Last.fm integration

## Implementation Approach

1. Add Rust types matching TypeScript interfaces
2. Implement single-pass filtering algorithm
3. Implement integer-based link resolution
4. Create TypeScript bindings
5. Update useGraphData hook with WASM path
6. Update ForceGraph to use resolved links
7. Add comprehensive tests and benchmarks

---

## Phase 2.1: Rust Type Definitions

### Overview
Define Rust structs matching TypeScript types for serialization.

### Changes Required:

#### 1. Types Module

**File**: `rust/graph-wasm/src/types.rs`

```rust
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Artist node data from Last.fm
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artist {
    pub id: Option<String>,
    pub name: String,
    pub mbid: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub listeners: Option<u32>,
    pub playcount: Option<u32>,
    pub bio: Option<String>,
}

/// Edge between two artists
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub source: String,
    pub target: String,
    pub weight: f32,
}

/// Processed graph node for visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: Option<String>,
    pub name: String,
    pub mbid: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub listeners: Option<u32>,
    pub playcount: Option<u32>,
    pub bio: Option<String>,
    #[serde(rename = "isCenter")]
    pub is_center: bool,
    // D3 will mutate these
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub fx: Option<f64>,
    pub fy: Option<f64>,
}

/// Processed graph link with node references
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    pub weight: f32,
}

/// Link resolved to integer indices for D3 simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedLink {
    pub source: u32,
    pub target: u32,
    pub weight: f32,
}

/// Complete processed graph data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

/// Graph data with resolved integer links
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<ResolvedLink>,
}

impl From<Artist> for GraphNode {
    fn from(artist: Artist) -> Self {
        GraphNode {
            id: artist.id,
            name: artist.name,
            mbid: artist.mbid,
            url: artist.url,
            image_url: artist.image_url,
            listeners: artist.listeners,
            playcount: artist.playcount,
            bio: artist.bio,
            is_center: false,
            x: None,
            y: None,
            fx: None,
            fy: None,
        }
    }
}
```

#### 2. Update lib.rs

**File**: `rust/graph-wasm/src/lib.rs` (add module)

```rust
mod types;

pub use types::*;
```

### Success Criteria:

#### Automated Verification:
- [x] `cd rust/graph-wasm && cargo check` passes
- [x] `cd rust/graph-wasm && cargo test` passes

#### Manual Verification:
- [ ] Types match TypeScript interfaces in `src/types/artist.ts`

---

## Phase 2.2: Graph Data Processor

### Overview
Implement single-pass graph filtering algorithm in Rust.

### Changes Required:

#### 1. Graph Processor Module

**File**: `rust/graph-wasm/src/graph_processor.rs`

```rust
use crate::types::*;
use rustc_hash::{FxHashMap, FxHashSet};
use wasm_bindgen::prelude::*;

/// Normalize string for case-insensitive comparison
#[inline]
fn normalize(s: &str) -> String {
    s.to_lowercase()
}

/// Process raw graph data into filtered, visualization-ready format.
/// 
/// This is a single-pass algorithm that:
/// 1. Filters edges by weight threshold
/// 2. Collects connected node names
/// 3. Filters and transforms nodes
/// 4. Creates graph links
/// 
/// Performance: O(N + E) with minimal allocations
#[wasm_bindgen]
pub fn process_graph_data(
    nodes_json: &JsValue,
    edges_json: &JsValue,
    center_artist: Option<String>,
    threshold: f32,
) -> Result<JsValue, JsValue> {
    // Deserialize inputs
    let nodes: Vec<Artist> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let edges: Vec<Edge> = serde_wasm_bindgen::from_value(edges_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse edges: {}", e)))?;

    let center_normalized = center_artist.as_ref().map(|s| normalize(s));

    // Pre-allocate with estimated capacity
    let mut connected_nodes: FxHashSet<String> = FxHashSet::default();
    connected_nodes.reserve(edges.len() * 2);
    
    let mut filtered_edges: Vec<Edge> = Vec::with_capacity(edges.len());

    // Single pass: filter edges AND collect connected nodes
    for edge in edges {
        if edge.weight >= threshold {
            connected_nodes.insert(normalize(&edge.source));
            connected_nodes.insert(normalize(&edge.target));
            filtered_edges.push(edge);
        }
    }

    // Build normalization cache for nodes
    let mut norm_cache: FxHashMap<String, String> = FxHashMap::default();
    norm_cache.reserve(nodes.len());
    
    for node in &nodes {
        norm_cache.insert(node.name.clone(), normalize(&node.name));
    }

    // Filter nodes and build node map in single pass
    let mut filtered_nodes: Vec<GraphNode> = Vec::with_capacity(connected_nodes.len() + 1);
    let mut node_map: FxHashMap<String, usize> = FxHashMap::default();
    
    for node in nodes {
        let normalized = norm_cache.get(&node.name).unwrap();
        let is_connected = connected_nodes.contains(normalized);
        let is_center = center_normalized.as_ref().map_or(false, |c| normalized == c);
        
        if is_connected || is_center {
            let idx = filtered_nodes.len();
            node_map.insert(normalized.clone(), idx);
            
            let mut graph_node: GraphNode = node.into();
            graph_node.is_center = is_center;
            filtered_nodes.push(graph_node);
        }
    }

    // Build graph links
    let mut graph_links: Vec<GraphLink> = Vec::with_capacity(filtered_edges.len());
    
    for edge in filtered_edges {
        let source_norm = normalize(&edge.source);
        let target_norm = normalize(&edge.target);
        
        // Only include links where both nodes exist
        if node_map.contains_key(&source_norm) && node_map.contains_key(&target_norm) {
            graph_links.push(GraphLink {
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
            });
        }
    }

    let result = ProcessedGraph {
        nodes: filtered_nodes,
        links: graph_links,
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Resolve string-based links to integer indices for D3 simulation.
/// 
/// D3 force simulation is faster with integer indices than string lookups.
/// This function takes pre-filtered nodes and links, and returns links
/// with source/target as node array indices.
/// 
/// Performance: O(N + E)
#[wasm_bindgen]
pub fn resolve_links(
    nodes_json: &JsValue,
    links_json: &JsValue,
) -> Result<JsValue, JsValue> {
    let nodes: Vec<GraphNode> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let links: Vec<GraphLink> = serde_wasm_bindgen::from_value(links_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse links: {}", e)))?;

    // Build node index map
    let mut node_indices: FxHashMap<String, u32> = FxHashMap::default();
    node_indices.reserve(nodes.len());
    
    for (idx, node) in nodes.iter().enumerate() {
        node_indices.insert(normalize(&node.name), idx as u32);
    }

    // Resolve links to indices
    let mut resolved: Vec<ResolvedLink> = Vec::with_capacity(links.len());
    
    for link in links {
        let source_norm = normalize(&link.source);
        let target_norm = normalize(&link.target);
        
        if let (Some(&src_idx), Some(&tgt_idx)) = 
            (node_indices.get(&source_norm), node_indices.get(&target_norm)) 
        {
            resolved.push(ResolvedLink {
                source: src_idx,
                target: tgt_idx,
                weight: link.weight,
            });
        }
    }

    serde_wasm_bindgen::to_value(&resolved)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Combined processing: filter graph AND resolve links in one call.
/// 
/// Most efficient for visualization pipeline - avoids JS/WASM boundary crossing.
/// 
/// Performance: O(N + E) single pass
#[wasm_bindgen]
pub fn process_and_resolve_graph(
    nodes_json: &JsValue,
    edges_json: &JsValue,
    center_artist: Option<String>,
    threshold: f32,
) -> Result<JsValue, JsValue> {
    let nodes: Vec<Artist> = serde_wasm_bindgen::from_value(nodes_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse nodes: {}", e)))?;
    let edges: Vec<Edge> = serde_wasm_bindgen::from_value(edges_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Failed to parse edges: {}", e)))?;

    let center_normalized = center_artist.as_ref().map(|s| normalize(s));

    // Phase 1: Filter edges and collect connected nodes
    let mut connected_nodes: FxHashSet<String> = FxHashSet::default();
    let mut filtered_edges: Vec<Edge> = Vec::with_capacity(edges.len());

    for edge in edges {
        if edge.weight >= threshold {
            connected_nodes.insert(normalize(&edge.source));
            connected_nodes.insert(normalize(&edge.target));
            filtered_edges.push(edge);
        }
    }

    // Phase 2: Filter nodes and build index map
    let mut filtered_nodes: Vec<GraphNode> = Vec::with_capacity(connected_nodes.len() + 1);
    let mut node_indices: FxHashMap<String, u32> = FxHashMap::default();
    
    for node in nodes {
        let normalized = normalize(&node.name);
        let is_connected = connected_nodes.contains(&normalized);
        let is_center = center_normalized.as_ref().map_or(false, |c| &normalized == c);
        
        if is_connected || is_center {
            let idx = filtered_nodes.len() as u32;
            node_indices.insert(normalized, idx);
            
            let mut graph_node: GraphNode = node.into();
            graph_node.is_center = is_center;
            filtered_nodes.push(graph_node);
        }
    }

    // Phase 3: Resolve links to integer indices
    let mut resolved_links: Vec<ResolvedLink> = Vec::with_capacity(filtered_edges.len());
    
    for edge in filtered_edges {
        let source_norm = normalize(&edge.source);
        let target_norm = normalize(&edge.target);
        
        if let (Some(&src_idx), Some(&tgt_idx)) = 
            (node_indices.get(&source_norm), node_indices.get(&target_norm)) 
        {
            resolved_links.push(ResolvedLink {
                source: src_idx,
                target: tgt_idx,
                weight: edge.weight,
            });
        }
    }

    let result = ResolvedGraph {
        nodes: filtered_nodes,
        links: resolved_links,
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_artists() -> Vec<Artist> {
        vec![
            Artist {
                id: Some("1".to_string()),
                name: "The Beatles".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(1000000),
                playcount: None,
                bio: None,
            },
            Artist {
                id: Some("2".to_string()),
                name: "Radiohead".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(500000),
                playcount: None,
                bio: None,
            },
            Artist {
                id: Some("3".to_string()),
                name: "Pink Floyd".to_string(),
                mbid: None,
                url: None,
                image_url: None,
                listeners: Some(800000),
                playcount: None,
                bio: None,
            },
        ]
    }

    fn create_test_edges() -> Vec<Edge> {
        vec![
            Edge {
                source: "The Beatles".to_string(),
                target: "Radiohead".to_string(),
                weight: 0.8,
            },
            Edge {
                source: "The Beatles".to_string(),
                target: "Pink Floyd".to_string(),
                weight: 0.3,
            },
            Edge {
                source: "Radiohead".to_string(),
                target: "Pink Floyd".to_string(),
                weight: 0.6,
            },
        ]
    }

    #[test]
    fn test_normalize() {
        assert_eq!(normalize("The Beatles"), "the beatles");
        assert_eq!(normalize("RADIOHEAD"), "radiohead");
    }

    #[test]
    fn test_filtering_threshold() {
        let artists = create_test_artists();
        let edges = create_test_edges();
        
        // Threshold 0.5 should filter out Beatles-Pink Floyd (0.3)
        let mut connected: FxHashSet<String> = FxHashSet::default();
        let mut filtered: Vec<Edge> = Vec::new();
        
        for edge in edges {
            if edge.weight >= 0.5 {
                connected.insert(normalize(&edge.source));
                connected.insert(normalize(&edge.target));
                filtered.push(edge);
            }
        }
        
        assert_eq!(filtered.len(), 2);
        assert!(connected.contains("the beatles"));
        assert!(connected.contains("radiohead"));
        assert!(connected.contains("pink floyd"));
    }

    #[test]
    fn test_center_always_included() {
        let artists = create_test_artists();
        let edges = vec![
            Edge {
                source: "Radiohead".to_string(),
                target: "Pink Floyd".to_string(),
                weight: 0.8,
            },
        ];
        
        // Beatles is center but not connected - should still be included
        let center = Some("The Beatles".to_string());
        let center_norm = center.as_ref().map(|s| normalize(s));
        
        let mut connected: FxHashSet<String> = FxHashSet::default();
        for edge in &edges {
            connected.insert(normalize(&edge.source));
            connected.insert(normalize(&edge.target));
        }
        
        let mut included = 0;
        for artist in &artists {
            let norm = normalize(&artist.name);
            if connected.contains(&norm) || center_norm.as_ref().map_or(false, |c| &norm == c) {
                included += 1;
            }
        }
        
        assert_eq!(included, 3); // Beatles (center) + Radiohead + Pink Floyd
    }
}
```

#### 2. Add Dependencies to Cargo.toml

**File**: `rust/graph-wasm/Cargo.toml` (update dependencies)

```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
rustc-hash = "2.0"
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

pub use types::*;
pub use graph_processor::*;

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
- [x] `cd rust/graph-wasm && cargo check` passes
- [x] `cd rust/graph-wasm && cargo test` passes (all 10 tests)
- [x] `npm run wasm:build` succeeds

#### Manual Verification:
- [ ] WASM binary size under 80KB gzipped

---

## Phase 2.3: TypeScript Bindings

### Overview
Create TypeScript wrapper functions and update type declarations.

### Changes Required:

#### 1. Update WASM Type Declarations

**File**: `src/wasm/types.d.ts`

```typescript
declare module '@/wasm/pkg' {
  export function init(): Promise<void>;
  export function get_version(): string;
  export function health_check(): boolean;

  // Graph processing functions
  export function process_graph_data(
    nodes: unknown,
    edges: unknown,
    centerArtist: string | null | undefined,
    threshold: number
  ): ProcessedGraph;

  export function resolve_links(
    nodes: unknown,
    links: unknown
  ): ResolvedLink[];

  export function process_and_resolve_graph(
    nodes: unknown,
    edges: unknown,
    centerArtist: string | null | undefined,
    threshold: number
  ): ResolvedGraph;

  export interface ProcessedGraph {
    nodes: GraphNode[];
    links: GraphLink[];
  }

  export interface ResolvedGraph {
    nodes: GraphNode[];
    links: ResolvedLink[];
  }

  export interface GraphNode {
    id?: string;
    name: string;
    mbid?: string;
    url?: string;
    image_url?: string;
    listeners?: number;
    playcount?: number;
    bio?: string;
    isCenter: boolean;
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
  }

  export interface GraphLink {
    source: string;
    target: string;
    weight: number;
  }

  export interface ResolvedLink {
    source: number;
    target: number;
    weight: number;
  }
}
```

#### 2. WASM Graph Service

**File**: `src/wasm/graph-service.ts`

```typescript
import { getWasmModule, isWasmLoaded } from './loader';
import type { Artist } from '@/types/artist';

export interface Edge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphNode {
  id?: string;
  name: string;
  mbid?: string;
  url?: string;
  image_url?: string;
  listeners?: number;
  playcount?: number;
  bio?: string;
  isCenter: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface ResolvedLink {
  source: number;
  target: number;
  weight: number;
}

export interface ProcessedGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ResolvedGraph {
  nodes: GraphNode[];
  links: ResolvedLink[];
}

/**
 * Process graph data using WASM.
 * Filters edges by threshold and nodes by connectivity.
 */
export function processGraphData(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): ProcessedGraph | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.process_graph_data(nodes, edges, centerArtist, threshold);
  } catch (error) {
    console.error('[WASM] process_graph_data failed:', error);
    return null;
  }
}

/**
 * Resolve string-based links to integer indices for D3.
 */
export function resolveLinks(
  nodes: GraphNode[],
  links: GraphLink[]
): ResolvedLink[] | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.resolve_links(nodes, links);
  } catch (error) {
    console.error('[WASM] resolve_links failed:', error);
    return null;
  }
}

/**
 * Combined processing and resolution in one WASM call.
 * Most efficient for visualization pipeline.
 */
export function processAndResolveGraph(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): ResolvedGraph | null {
  const wasm = getWasmModule();
  if (!wasm) return null;

  try {
    return wasm.process_and_resolve_graph(nodes, edges, centerArtist, threshold);
  } catch (error) {
    console.error('[WASM] process_and_resolve_graph failed:', error);
    return null;
  }
}

/**
 * Check if WASM graph processing is available.
 */
export function isWasmGraphAvailable(): boolean {
  return isWasmLoaded();
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] No type errors in `src/wasm/` directory

#### Manual Verification:
- [ ] Types match Rust struct definitions

---

## Phase 2.4: Update useGraphData Hook

### Overview
Modify the hook to use WASM when available, with JavaScript fallback.

### Changes Required:

#### 1. Update useGraphData Hook

**File**: `src/components/ForceGraph/hooks/useGraphData.ts`

```typescript
import { useMemo } from 'react';
import type { Artist } from '@/types/artist';
import {
  isWasmGraphAvailable,
  processGraphData as wasmProcessGraphData,
  type GraphNode,
  type GraphLink,
} from '@/wasm/graph-service';

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface UseGraphDataResult {
  filteredNodes: GraphNode[];
  graphLinks: GraphLink[];
  nodeMap: Map<string, GraphNode>;
  usedWasm: boolean;
}

/**
 * JavaScript fallback implementation of graph data processing.
 */
function processGraphDataJS(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): { nodes: GraphNode[]; links: GraphLink[] } {
  // Filter edges by threshold
  const filteredEdges = edges.filter((e) => e.weight >= threshold);

  // Build connected nodes set
  const connectedNodes = new Set<string>();
  filteredEdges.forEach((e) => {
    connectedNodes.add(e.source.toLowerCase());
    connectedNodes.add(e.target.toLowerCase());
  });

  // Filter and transform nodes
  const filteredNodes: GraphNode[] = nodes
    .filter(
      (n) =>
        connectedNodes.has(n.name.toLowerCase()) ||
        n.name.toLowerCase() === centerArtist?.toLowerCase()
    )
    .map((node) => ({
      ...node,
      isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
    }));

  // Build node map for link resolution
  const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

  // Create graph links
  const graphLinks: GraphLink[] = filteredEdges
    .map((edge) => {
      const source = nodeMap.get(edge.source.toLowerCase());
      const target = nodeMap.get(edge.target.toLowerCase());
      if (source && target) {
        return { source: edge.source, target: edge.target, weight: edge.weight };
      }
      return null;
    })
    .filter((link): link is GraphLink => link !== null);

  return { nodes: filteredNodes, links: graphLinks };
}

/**
 * Hook that processes raw graph data for visualization.
 * Uses WASM when available for better performance.
 */
export function useGraphData(
  nodes: Artist[],
  edges: Edge[],
  centerArtist: string | null,
  threshold: number
): UseGraphDataResult {
  return useMemo(() => {
    // Try WASM first
    if (isWasmGraphAvailable()) {
      const result = wasmProcessGraphData(nodes, edges, centerArtist, threshold);
      if (result) {
        const nodeMap = new Map(
          result.nodes.map((n) => [n.name.toLowerCase(), n])
        );
        return {
          filteredNodes: result.nodes,
          graphLinks: result.links,
          nodeMap,
          usedWasm: true,
        };
      }
    }

    // JavaScript fallback
    const result = processGraphDataJS(nodes, edges, centerArtist, threshold);
    const nodeMap = new Map(result.nodes.map((n) => [n.name.toLowerCase(), n]));
    
    return {
      filteredNodes: result.nodes,
      graphLinks: result.links,
      nodeMap,
      usedWasm: false,
    };
  }, [nodes, edges, centerArtist, threshold]);
}
```

### Success Criteria:

#### Automated Verification:
- [x] Existing useGraphData tests pass
- [x] TypeScript compilation passes
- [x] `npm run lint` passes

#### Manual Verification:
- [ ] Hook works with WASM disabled (JavaScript fallback)
- [ ] Hook works with WASM enabled

---

## Phase 2.5: Update ForceGraph Component

### Overview
Update ForceGraph to use pre-resolved links when WASM provides them.

### Changes Required:

#### 1. Update ForceGraph Types

**File**: `src/components/ForceGraph/types.ts`

```typescript
import type { GraphNode, GraphLink, ResolvedLink } from '@/wasm/graph-service';

export type { GraphNode, GraphLink, ResolvedLink };

export interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

// D3 can accept either node objects or indices
export interface SimulationLink {
  source: SimulationNode | number;
  target: SimulationNode | number;
  weight: number;
}
```

#### 2. Update ForceGraph Index

**File**: `src/components/ForceGraph/index.tsx`

Update the link resolution section (lines 42-59) to handle both string and integer links:

```typescript
// Inside the useMemo for simulationData:
const simulationData = useMemo(() => {
  // Clone nodes for D3 mutation
  const nodes: SimulationNode[] = filteredNodes.map((node) => ({
    ...node,
    x: node.x ?? 0,
    y: node.y ?? 0,
  }));

  // If WASM already resolved links to indices, use them directly
  // Otherwise, resolve string references to node objects
  let links: SimulationLink[];
  
  if (graphLinks.length > 0 && typeof graphLinks[0].source === 'number') {
    // Already resolved to indices (from WASM)
    links = graphLinks.map((link) => ({
      source: link.source as number,
      target: link.target as number,
      weight: link.weight,
    }));
  } else {
    // Resolve string references to node objects
    const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]));
    links = [];
    
    for (const link of graphLinks) {
      const sourceName = typeof link.source === 'string' 
        ? link.source 
        : (link.source as GraphNode).name;
      const targetName = typeof link.target === 'string' 
        ? link.target 
        : (link.target as GraphNode).name;
      
      const source = nodeMap.get(sourceName.toLowerCase());
      const target = nodeMap.get(targetName.toLowerCase());
      
      if (source && target) {
        links.push({ source, target, weight: link.weight });
      }
    }
  }

  return { nodes, links };
}, [filteredNodes, graphLinks]);
```

### Success Criteria:

#### Automated Verification:
- [x] Existing ForceGraph tests pass
- [x] TypeScript compilation passes
- [x] `npm run test:e2e` passes

#### Manual Verification:
- [ ] Graph renders correctly with WASM enabled
- [ ] Graph renders correctly with WASM disabled
- [ ] Drag and zoom interactions work

---

## Phase 2.6: Testing and Benchmarks

### Overview
Add comprehensive tests and performance benchmarks.

### Changes Required:

#### 1. WASM Graph Processing Tests

**File**: `src/wasm/graph-service.test.ts`

```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Artist } from '@/types/artist';

// Mock WASM module for unit tests
vi.mock('@/wasm/pkg', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  get_version: vi.fn().mockReturnValue('0.1.0'),
  health_check: vi.fn().mockReturnValue(true),
  process_graph_data: vi.fn().mockImplementation((nodes, edges, center, threshold) => ({
    nodes: nodes
      .filter((n: Artist) => n.name.toLowerCase() === center?.toLowerCase() || true)
      .map((n: Artist) => ({
        ...n,
        isCenter: n.name.toLowerCase() === center?.toLowerCase(),
      })),
    links: edges.filter((e: { weight: number }) => e.weight >= threshold),
  })),
  resolve_links: vi.fn().mockImplementation((nodes, links) =>
    links.map((l: { weight: number }, i: number) => ({
      source: 0,
      target: 1,
      weight: l.weight,
    }))
  ),
  process_and_resolve_graph: vi.fn().mockImplementation((nodes, edges, center, threshold) => ({
    nodes: nodes.map((n: Artist) => ({
      ...n,
      isCenter: n.name.toLowerCase() === center?.toLowerCase(),
    })),
    links: edges
      .filter((e: { weight: number }) => e.weight >= threshold)
      .map((e: { weight: number }, i: number) => ({
        source: 0,
        target: 1,
        weight: e.weight,
      })),
  })),
}));

describe('WASM Graph Service', () => {
  const mockArtists: Artist[] = [
    { id: '1', name: 'The Beatles', listeners: 1000000 },
    { id: '2', name: 'Radiohead', listeners: 500000 },
    { id: '3', name: 'Pink Floyd', listeners: 800000 },
  ];

  const mockEdges = [
    { source: 'The Beatles', target: 'Radiohead', weight: 0.8 },
    { source: 'The Beatles', target: 'Pink Floyd', weight: 0.3 },
    { source: 'Radiohead', target: 'Pink Floyd', weight: 0.6 },
  ];

  beforeAll(async () => {
    const { initWasm } = await import('@/wasm/loader');
    await initWasm();
  });

  it('should process graph data', async () => {
    const { processGraphData } = await import('./graph-service');
    
    const result = processGraphData(mockArtists, mockEdges, 'The Beatles', 0.5);
    
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBeGreaterThan(0);
    expect(result!.links.length).toBe(2); // threshold 0.5 filters one edge
  });

  it('should mark center artist', async () => {
    const { processGraphData } = await import('./graph-service');
    
    const result = processGraphData(mockArtists, mockEdges, 'The Beatles', 0);
    
    const centerNode = result!.nodes.find((n) => n.isCenter);
    expect(centerNode).toBeDefined();
    expect(centerNode!.name).toBe('The Beatles');
  });

  it('should resolve links to indices', async () => {
    const { resolveLinks } = await import('./graph-service');
    
    const nodes = mockArtists.map((a) => ({ ...a, isCenter: false }));
    const links = mockEdges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));
    
    const result = resolveLinks(nodes, links);
    
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(typeof result![0].source).toBe('number');
    expect(typeof result![0].target).toBe('number');
  });
});
```

#### 2. Performance Benchmark Tests

**File**: `src/wasm/benchmarks.test.ts` (update)

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import type { Artist } from '@/types/artist';

// Only run benchmarks when WASM is built
const describeWasm = process.env.CI ? describe.skip : describe;

describeWasm('Graph Processing Benchmarks', () => {
  // Generate large test data
  function generateTestData(nodeCount: number, edgesPerNode: number) {
    const artists: Artist[] = [];
    const edges: { source: string; target: string; weight: number }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      artists.push({
        id: `${i}`,
        name: `Artist ${i}`,
        listeners: Math.floor(Math.random() * 1000000),
      });
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < edgesPerNode; j++) {
        const target = Math.floor(Math.random() * nodeCount);
        if (target !== i) {
          edges.push({
            source: `Artist ${i}`,
            target: `Artist ${target}`,
            weight: Math.random(),
          });
        }
      }
    }

    return { artists, edges };
  }

  // JavaScript implementation for comparison
  function processGraphDataJS(
    nodes: Artist[],
    edges: { source: string; target: string; weight: number }[],
    centerArtist: string | null,
    threshold: number
  ) {
    const filteredEdges = edges.filter((e) => e.weight >= threshold);
    const connectedNodes = new Set<string>();
    filteredEdges.forEach((e) => {
      connectedNodes.add(e.source.toLowerCase());
      connectedNodes.add(e.target.toLowerCase());
    });
    const filteredNodes = nodes
      .filter(
        (n) =>
          connectedNodes.has(n.name.toLowerCase()) ||
          n.name.toLowerCase() === centerArtist?.toLowerCase()
      )
      .map((node) => ({
        ...node,
        isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
      }));
    const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));
    const graphLinks = filteredEdges
      .map((edge) => {
        const source = nodeMap.get(edge.source.toLowerCase());
        const target = nodeMap.get(edge.target.toLowerCase());
        if (source && target) {
          return { source: edge.source, target: edge.target, weight: edge.weight };
        }
        return null;
      })
      .filter(Boolean);
    return { nodes: filteredNodes, links: graphLinks };
  }

  const testCases = [
    { nodes: 100, edgesPerNode: 5, name: 'Small (100 nodes, 500 edges)' },
    { nodes: 500, edgesPerNode: 10, name: 'Medium (500 nodes, 5000 edges)' },
    { nodes: 1000, edgesPerNode: 15, name: 'Large (1000 nodes, 15000 edges)' },
  ];

  testCases.forEach(({ nodes, edgesPerNode, name }) => {
    it(`should benchmark ${name}`, async () => {
      const { artists, edges } = generateTestData(nodes, edgesPerNode);
      const centerArtist = 'Artist 0';
      const threshold = 0.5;
      const iterations = 10;

      // Warmup
      processGraphDataJS(artists, edges, centerArtist, threshold);

      // JS benchmark
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        processGraphDataJS(artists, edges, centerArtist, threshold);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // WASM benchmark
      const { processGraphData: wasmProcess } = await import('./graph-service');
      
      // Warmup
      wasmProcess(artists, edges, centerArtist, threshold);
      
      const wasmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        wasmProcess(artists, edges, centerArtist, threshold);
      }
      const wasmTime = (performance.now() - wasmStart) / iterations;

      const speedup = jsTime / wasmTime;

      console.log(`\n${name}:`);
      console.log(`  JS:   ${jsTime.toFixed(2)}ms`);
      console.log(`  WASM: ${wasmTime.toFixed(2)}ms`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x`);

      // WASM should be at least 1.5x faster for medium+ graphs
      if (nodes >= 500) {
        expect(speedup).toBeGreaterThan(1.5);
      }
    });
  });
});
```

#### 3. Integration Tests

**File**: `src/components/ForceGraph/hooks/useGraphData.test.ts` (add tests)

Add these test cases to the existing test file:

```typescript
describe('useGraphData with WASM', () => {
  it('should indicate when WASM was used', () => {
    // Mock WASM as available
    vi.mock('@/wasm/graph-service', () => ({
      isWasmGraphAvailable: () => true,
      processGraphData: () => ({
        nodes: [{ name: 'Test', isCenter: true }],
        links: [],
      }),
    }));

    const { result } = renderHook(() =>
      useGraphData([{ name: 'Test' }], [], 'Test', 0)
    );

    expect(result.current.usedWasm).toBe(true);
  });

  it('should fall back to JS when WASM unavailable', () => {
    vi.mock('@/wasm/graph-service', () => ({
      isWasmGraphAvailable: () => false,
      processGraphData: () => null,
    }));

    const { result } = renderHook(() =>
      useGraphData([{ name: 'Test' }], [], 'Test', 0)
    );

    expect(result.current.usedWasm).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run test` passes all tests
- [x] `npm run wasm:test` passes Rust tests (10 tests)
- [x] Test coverage > 80% for new code

#### Manual Verification:
- [ ] Benchmark shows WASM 1.5-2x faster for 500+ node graphs
- [ ] Console logs show speedup metrics

---

## Testing Strategy

### Unit Tests
- WASM function wrappers (processGraphData, resolveLinks)
- Type serialization/deserialization
- Error handling and fallback behavior
- Edge cases (empty graphs, single node, no edges)

### Integration Tests
- useGraphData hook with WASM enabled/disabled
- ForceGraph component with both link formats
- Feature flag switching

### Performance Benchmarks
- Small graphs (100 nodes): Baseline comparison
- Medium graphs (500 nodes): Expect 1.5-2x speedup
- Large graphs (1000+ nodes): Expect 2-4x speedup
- String normalization: Expect 10x+ speedup

### E2E Tests
- Search and visualize with WASM enabled
- Threshold slider updates graph correctly
- Graph interactions (drag, zoom, hover)

## Performance Considerations

- Minimize JS/WASM boundary crossings (use process_and_resolve_graph)
- Pre-allocate Rust vectors with capacity hints
- Use FxHashMap/FxHashSet for faster string hashing
- Single-pass algorithms where possible
- Cache normalized strings to avoid repeated toLowerCase()

## Migration Notes

This phase implements a **big bang replacement**:
- When WASM is available and feature flag is enabled, WASM path is used
- JavaScript implementation remains as fallback
- No A/B testing or gradual rollout in this phase
- All components updated to handle new data formats

## References

- Phase 1 Plan: `thoughts/shared/plans/2025-12-20-rust-wasm-phase-1-foundation.md`
- Research: `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md`
- Current implementation: `src/components/ForceGraph/hooks/useGraphData.ts:23-56`
- Current implementation: `src/components/ForceGraph/index.tsx:42-59`
