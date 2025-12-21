# Phase 4: Spatial Index with rstar

## Overview

This plan implements R-tree spatial indexing using the rstar library for efficient viewport culling and nearest-neighbor queries. This enables the ForceGraph component to only render visible nodes when zoomed/panned, and provides fast node lookup for hover and click interactions.

**Prerequisites**: Phases 1-3 must be completed.

## Current State Analysis

### Current Rendering Behavior

**Location**: `src/components/ForceGraph/index.tsx:93-250`

**Current Implementation:**
- Renders ALL nodes and edges every frame
- No visibility culling based on viewport
- Linear search for node interactions (implicit in D3)
- Performance degrades linearly with node count

**Performance Characteristics:**
| Nodes | SVG Elements | Performance |
|-------|--------------|-------------|
| 50    | ~100-200     | Smooth      |
| 200   | ~400-800     | Slight lag  |
| 500+  | ~1000+       | Noticeable degradation |

### What Spatial Indexing Provides

1. **Viewport Culling**: Only render nodes visible in current view
   - O(log n + k) query where k = visible nodes
   - 3-5x render speedup for 500+ node graphs

2. **Nearest Neighbor**: Fast node lookup for interactions
   - O(log n) instead of O(n) linear search
   - Instant hover response even with 10k+ nodes

3. **Range Queries**: Find nodes in selection rectangle
   - O(log n + k) for rectangular selections
   - Enables efficient multi-select

## Desired End State

After completing this phase:
1. `SpatialIndex` Rust struct implements R-tree using rstar
2. Nodes are indexed by position after force simulation stabilizes
3. ForceGraph only renders nodes within viewport bounds
4. Hover interactions use nearest-neighbor for instant response
5. Performance remains smooth with 2000+ nodes

### Verification
```bash
# Run unit tests
npm run test

# Run WASM tests
npm run wasm:test

# Run E2E tests
npm run test:e2e

# Manual verification with large graph
VITE_USE_WASM_GRAPH=true npm run dev
# Search for artist with depth=2, zoom in/out, observe performance
```

## What We're NOT Doing

- WebGL/Canvas rendering migration
- Force simulation in WASM (Phase 5)
- Lazy node loading/streaming
- Level-of-detail (LOD) rendering
- Collision detection optimization

## Implementation Approach

**Architecture:**
```
ForceGraph Component
       │
       ▼
┌─────────────────────────┐
│ useSpatialIndex Hook    │
│   - Update on tick      │
│   - Query on viewport   │
│   - Nearest neighbor    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ WASM SpatialIndex       │
│   - rstar R-tree        │
│   - Bulk insert         │
│   - Range query         │
│   - Nearest query       │
└─────────────────────────┘
```

**Data Flow:**
1. Force simulation runs (D3 mutates node positions)
2. When simulation stabilizes (alpha < 0.01), rebuild spatial index
3. On pan/zoom, query visible nodes from index
4. Render only visible nodes
5. On mouse move, use nearest-neighbor for hover

---

## Phase 4.1: Rust Spatial Index Implementation

### Overview
Implement R-tree spatial indexing using the rstar library.

### Changes Required:

#### 1. Spatial Index Module

**File**: `rust/graph-wasm/src/spatial_index.rs`

```rust
use rstar::{RTree, AABB, PointDistance, RTreeObject};
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// A node in the spatial index with position and identifier
#[derive(Debug, Clone)]
pub struct SpatialNode {
    pub id: u32,
    pub x: f64,
    pub y: f64,
    pub radius: f64,
}

impl RTreeObject for SpatialNode {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        // Create bounding box around the node (circle approximation)
        AABB::from_corners(
            [self.x - self.radius, self.y - self.radius],
            [self.x + self.radius, self.y + self.radius],
        )
    }
}

impl PointDistance for SpatialNode {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        let dx = self.x - point[0];
        let dy = self.y - point[1];
        dx * dx + dy * dy
    }
}

/// Viewport bounds for culling queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewport {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

/// Query result for nearest neighbor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NearestResult {
    pub id: u32,
    pub distance: f64,
    pub x: f64,
    pub y: f64,
}

/// R-tree spatial index for efficient spatial queries
#[wasm_bindgen]
pub struct SpatialIndex {
    tree: RTree<SpatialNode>,
    default_radius: f64,
}

#[wasm_bindgen]
impl SpatialIndex {
    /// Create a new empty spatial index
    #[wasm_bindgen(constructor)]
    pub fn new() -> SpatialIndex {
        SpatialIndex {
            tree: RTree::new(),
            default_radius: 20.0,
        }
    }

    /// Create spatial index with initial capacity hint
    #[wasm_bindgen]
    pub fn with_capacity(capacity: usize) -> SpatialIndex {
        SpatialIndex {
            tree: RTree::new(),
            default_radius: 20.0,
        }
    }

    /// Set the default node radius for new insertions
    #[wasm_bindgen]
    pub fn set_default_radius(&mut self, radius: f64) {
        self.default_radius = radius;
    }

    /// Insert a single node
    #[wasm_bindgen]
    pub fn insert(&mut self, id: u32, x: f64, y: f64) {
        self.tree.insert(SpatialNode {
            id,
            x,
            y,
            radius: self.default_radius,
        });
    }

    /// Insert a node with custom radius
    #[wasm_bindgen]
    pub fn insert_with_radius(&mut self, id: u32, x: f64, y: f64, radius: f64) {
        self.tree.insert(SpatialNode { id, x, y, radius });
    }

    /// Bulk insert nodes for better tree structure
    /// Input: flat array [id0, x0, y0, id1, x1, y1, ...]
    #[wasm_bindgen]
    pub fn bulk_insert(&mut self, data: &[f64]) {
        let nodes: Vec<SpatialNode> = data
            .chunks(3)
            .map(|chunk| SpatialNode {
                id: chunk[0] as u32,
                x: chunk[1],
                y: chunk[2],
                radius: self.default_radius,
            })
            .collect();
        
        self.tree = RTree::bulk_load(nodes);
    }

    /// Bulk insert with individual radii
    /// Input: flat array [id0, x0, y0, r0, id1, x1, y1, r1, ...]
    #[wasm_bindgen]
    pub fn bulk_insert_with_radii(&mut self, data: &[f64]) {
        let nodes: Vec<SpatialNode> = data
            .chunks(4)
            .map(|chunk| SpatialNode {
                id: chunk[0] as u32,
                x: chunk[1],
                y: chunk[2],
                radius: chunk[3],
            })
            .collect();
        
        self.tree = RTree::bulk_load(nodes);
    }

    /// Clear the index
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.tree = RTree::new();
    }

    /// Get number of nodes in the index
    #[wasm_bindgen]
    pub fn size(&self) -> usize {
        self.tree.size()
    }

    /// Query nodes within a viewport/bounding box
    /// Returns array of node IDs
    #[wasm_bindgen]
    pub fn query_viewport(&self, min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> Vec<u32> {
        let envelope = AABB::from_corners([min_x, min_y], [max_x, max_y]);
        self.tree
            .locate_in_envelope(&envelope)
            .map(|node| node.id)
            .collect()
    }

    /// Query with viewport object
    #[wasm_bindgen]
    pub fn query_viewport_obj(&self, viewport_json: &JsValue) -> Result<Vec<u32>, JsValue> {
        let viewport: Viewport = serde_wasm_bindgen::from_value(viewport_json.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid viewport: {}", e)))?;
        
        Ok(self.query_viewport(
            viewport.min_x,
            viewport.min_y,
            viewport.max_x,
            viewport.max_y,
        ))
    }

    /// Find nearest node to a point
    #[wasm_bindgen]
    pub fn nearest(&self, x: f64, y: f64) -> JsValue {
        match self.tree.nearest_neighbor(&[x, y]) {
            Some(node) => {
                let result = NearestResult {
                    id: node.id,
                    distance: ((node.x - x).powi(2) + (node.y - y).powi(2)).sqrt(),
                    x: node.x,
                    y: node.y,
                };
                serde_wasm_bindgen::to_value(&result).unwrap()
            }
            None => JsValue::NULL,
        }
    }

    /// Find k nearest nodes to a point
    #[wasm_bindgen]
    pub fn k_nearest(&self, x: f64, y: f64, k: usize) -> JsValue {
        let results: Vec<NearestResult> = self.tree
            .nearest_neighbor_iter(&[x, y])
            .take(k)
            .map(|node| NearestResult {
                id: node.id,
                distance: ((node.x - x).powi(2) + (node.y - y).powi(2)).sqrt(),
                x: node.x,
                y: node.y,
            })
            .collect();
        
        serde_wasm_bindgen::to_value(&results).unwrap()
    }

    /// Check if a point is within any node's radius
    #[wasm_bindgen]
    pub fn point_in_node(&self, x: f64, y: f64) -> Option<u32> {
        self.tree.nearest_neighbor(&[x, y]).and_then(|node| {
            let dist_sq = (node.x - x).powi(2) + (node.y - y).powi(2);
            if dist_sq <= node.radius.powi(2) {
                Some(node.id)
            } else {
                None
            }
        })
    }

    /// Get all nodes within a radius of a point
    #[wasm_bindgen]
    pub fn within_radius(&self, x: f64, y: f64, radius: f64) -> Vec<u32> {
        let radius_sq = radius * radius;
        
        // First get candidates from bounding box
        let envelope = AABB::from_corners([x - radius, y - radius], [x + radius, y + radius]);
        
        // Then filter by actual distance
        self.tree
            .locate_in_envelope(&envelope)
            .filter(|node| {
                let dist_sq = (node.x - x).powi(2) + (node.y - y).powi(2);
                dist_sq <= radius_sq
            })
            .map(|node| node.id)
            .collect()
    }
}

impl Default for SpatialIndex {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_and_query() {
        let mut index = SpatialIndex::new();
        
        index.insert(0, 100.0, 100.0);
        index.insert(1, 200.0, 200.0);
        index.insert(2, 300.0, 300.0);
        
        assert_eq!(index.size(), 3);
        
        // Query viewport containing first two nodes
        let visible = index.query_viewport(0.0, 0.0, 250.0, 250.0);
        assert_eq!(visible.len(), 2);
        assert!(visible.contains(&0));
        assert!(visible.contains(&1));
    }

    #[test]
    fn test_bulk_insert() {
        let mut index = SpatialIndex::new();
        
        // Insert 3 nodes: [id, x, y, ...]
        let data = vec![
            0.0, 100.0, 100.0,
            1.0, 200.0, 200.0,
            2.0, 300.0, 300.0,
        ];
        
        index.bulk_insert(&data);
        
        assert_eq!(index.size(), 3);
    }

    #[test]
    fn test_nearest_neighbor() {
        let mut index = SpatialIndex::new();
        
        index.insert(0, 100.0, 100.0);
        index.insert(1, 200.0, 200.0);
        index.insert(2, 300.0, 300.0);
        
        // Point closest to node 1
        let result = index.nearest(190.0, 210.0);
        let nearest: NearestResult = serde_wasm_bindgen::from_value(result).unwrap();
        
        assert_eq!(nearest.id, 1);
    }

    #[test]
    fn test_point_in_node() {
        let mut index = SpatialIndex::new();
        index.set_default_radius(25.0);
        
        index.insert(0, 100.0, 100.0);
        index.insert(1, 200.0, 200.0);
        
        // Point inside node 0's radius
        assert_eq!(index.point_in_node(110.0, 110.0), Some(0));
        
        // Point outside all nodes
        assert_eq!(index.point_in_node(150.0, 150.0), None);
    }

    #[test]
    fn test_within_radius() {
        let mut index = SpatialIndex::new();
        
        index.insert(0, 100.0, 100.0);
        index.insert(1, 120.0, 100.0);
        index.insert(2, 200.0, 100.0);
        
        // Find nodes within 50 units of (100, 100)
        let nearby = index.within_radius(100.0, 100.0, 50.0);
        
        assert_eq!(nearby.len(), 2);
        assert!(nearby.contains(&0));
        assert!(nearby.contains(&1));
    }
}
```

#### 2. Add rstar Dependency

**File**: `rust/graph-wasm/Cargo.toml` (update dependencies)

```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
rustc-hash = "2.0"
petgraph = { version = "0.8", default-features = false }
rstar = "0.12"
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
mod spatial_index;

pub use types::*;
pub use graph_processor::*;
pub use graph_builder::*;
pub use spatial_index::*;

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
- [ ] `cd rust/graph-wasm && cargo test` passes (5 new tests)
- [ ] `npm run wasm:build` succeeds

#### Manual Verification:
- [ ] WASM binary size under 120KB gzipped (with rstar)

---

## Phase 4.2: TypeScript Bindings

### Overview
Create TypeScript wrapper for the SpatialIndex and React hook.

### Changes Required:

#### 1. Update WASM Type Declarations

**File**: `src/wasm/types.d.ts` (append)

```typescript
// Add to existing declarations

declare module '@/wasm/pkg' {
  // ... existing declarations ...

  export class SpatialIndex {
    constructor();
    static with_capacity(capacity: number): SpatialIndex;
    
    set_default_radius(radius: number): void;
    insert(id: number, x: number, y: number): void;
    insert_with_radius(id: number, x: number, y: number, radius: number): void;
    bulk_insert(data: Float64Array): void;
    bulk_insert_with_radii(data: Float64Array): void;
    clear(): void;
    size(): number;
    query_viewport(minX: number, minY: number, maxX: number, maxY: number): Uint32Array;
    query_viewport_obj(viewport: Viewport): Uint32Array;
    nearest(x: number, y: number): NearestResult | null;
    k_nearest(x: number, y: number, k: number): NearestResult[];
    point_in_node(x: number, y: number): number | null;
    within_radius(x: number, y: number, radius: number): Uint32Array;
    free(): void;
  }

  export interface Viewport {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  }

  export interface NearestResult {
    id: number;
    distance: number;
    x: number;
    y: number;
  }
}
```

#### 2. Spatial Index Service

**File**: `src/wasm/spatial-index-service.ts`

```typescript
import { getWasmModule, isWasmLoaded } from './loader';

export interface Viewport {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface NearestResult {
  id: number;
  distance: number;
  x: number;
  y: number;
}

export interface SpatialNode {
  id: number;
  x: number;
  y: number;
  radius?: number;
}

/**
 * Wrapper class for WASM SpatialIndex.
 * Provides efficient spatial queries for graph nodes.
 */
export class WasmSpatialIndex {
  private index: import('@/wasm/pkg').SpatialIndex | null = null;
  private initialized = false;

  /**
   * Initialize the spatial index.
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    const wasm = getWasmModule();
    if (!wasm) return false;

    try {
      this.index = new wasm.SpatialIndex();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[WASM] SpatialIndex init failed:', error);
      return false;
    }
  }

  /**
   * Set default node radius for insertions.
   */
  setDefaultRadius(radius: number): void {
    this.index?.set_default_radius(radius);
  }

  /**
   * Insert a single node.
   */
  insert(id: number, x: number, y: number): void {
    this.index?.insert(id, x, y);
  }

  /**
   * Insert a node with custom radius.
   */
  insertWithRadius(id: number, x: number, y: number, radius: number): void {
    this.index?.insert_with_radius(id, x, y, radius);
  }

  /**
   * Bulk insert nodes for optimal tree structure.
   */
  bulkInsert(nodes: SpatialNode[]): void {
    if (!this.index) return;

    const hasRadii = nodes.some((n) => n.radius !== undefined);
    
    if (hasRadii) {
      const data = new Float64Array(nodes.length * 4);
      nodes.forEach((node, i) => {
        data[i * 4] = node.id;
        data[i * 4 + 1] = node.x;
        data[i * 4 + 2] = node.y;
        data[i * 4 + 3] = node.radius ?? 20;
      });
      this.index.bulk_insert_with_radii(data);
    } else {
      const data = new Float64Array(nodes.length * 3);
      nodes.forEach((node, i) => {
        data[i * 3] = node.id;
        data[i * 3 + 1] = node.x;
        data[i * 3 + 2] = node.y;
      });
      this.index.bulk_insert(data);
    }
  }

  /**
   * Clear the index.
   */
  clear(): void {
    this.index?.clear();
  }

  /**
   * Get number of indexed nodes.
   */
  size(): number {
    return this.index?.size() ?? 0;
  }

  /**
   * Query nodes visible in viewport.
   */
  queryViewport(viewport: Viewport): number[] {
    if (!this.index) return [];

    try {
      const result = this.index.query_viewport(
        viewport.minX,
        viewport.minY,
        viewport.maxX,
        viewport.maxY
      );
      return Array.from(result);
    } catch (error) {
      console.error('[WASM] queryViewport failed:', error);
      return [];
    }
  }

  /**
   * Find nearest node to a point.
   */
  nearest(x: number, y: number): NearestResult | null {
    if (!this.index) return null;

    try {
      return this.index.nearest(x, y);
    } catch (error) {
      console.error('[WASM] nearest failed:', error);
      return null;
    }
  }

  /**
   * Find k nearest nodes to a point.
   */
  kNearest(x: number, y: number, k: number): NearestResult[] {
    if (!this.index) return [];

    try {
      return this.index.k_nearest(x, y, k);
    } catch (error) {
      console.error('[WASM] kNearest failed:', error);
      return [];
    }
  }

  /**
   * Check if a point is inside any node.
   */
  pointInNode(x: number, y: number): number | null {
    if (!this.index) return null;

    try {
      return this.index.point_in_node(x, y) ?? null;
    } catch (error) {
      console.error('[WASM] pointInNode failed:', error);
      return null;
    }
  }

  /**
   * Find nodes within radius of a point.
   */
  withinRadius(x: number, y: number, radius: number): number[] {
    if (!this.index) return [];

    try {
      const result = this.index.within_radius(x, y, radius);
      return Array.from(result);
    } catch (error) {
      console.error('[WASM] withinRadius failed:', error);
      return [];
    }
  }

  /**
   * Free WASM memory.
   */
  dispose(): void {
    this.index?.free();
    this.index = null;
    this.initialized = false;
  }
}

/**
 * Create a new spatial index.
 */
export async function createSpatialIndex(): Promise<WasmSpatialIndex | null> {
  if (!isWasmLoaded()) return null;

  const index = new WasmSpatialIndex();
  const success = await index.init();
  
  return success ? index : null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] No type errors in `src/wasm/` directory

#### Manual Verification:
- [ ] Types match Rust struct definitions

---

## Phase 4.3: React Hook Integration

### Overview
Create a React hook for managing spatial index and integrating with ForceGraph.

### Changes Required:

#### 1. useSpatialIndex Hook

**File**: `src/components/ForceGraph/hooks/useSpatialIndex.ts`

```typescript
import { useRef, useCallback, useEffect, useState } from 'react';
import { 
  createSpatialIndex, 
  WasmSpatialIndex,
  type Viewport,
  type NearestResult 
} from '@/wasm/spatial-index-service';
import { isWasmLoaded } from '@/wasm/loader';
import type { GraphNode } from '@/wasm/graph-service';

interface UseSpatialIndexOptions {
  /** Enable spatial indexing (default: true if WASM available) */
  enabled?: boolean;
  /** Default node radius for hit testing */
  defaultRadius?: number;
  /** Rebuild threshold - rebuild if alpha drops below this */
  rebuildThreshold?: number;
}

interface UseSpatialIndexResult {
  /** Whether spatial index is available */
  available: boolean;
  /** Rebuild the index with new node positions */
  rebuild: (nodes: GraphNode[]) => void;
  /** Query visible nodes in viewport */
  queryViewport: (viewport: Viewport) => number[];
  /** Find nearest node to point */
  findNearest: (x: number, y: number) => NearestResult | null;
  /** Find node at point (within radius) */
  findNodeAt: (x: number, y: number) => number | null;
  /** Number of indexed nodes */
  size: number;
}

/**
 * Hook for spatial indexing of graph nodes.
 * Provides efficient viewport culling and nearest-neighbor queries.
 */
export function useSpatialIndex(
  options: UseSpatialIndexOptions = {}
): UseSpatialIndexResult {
  const {
    enabled = true,
    defaultRadius = 20,
  } = options;

  const indexRef = useRef<WasmSpatialIndex | null>(null);
  const [available, setAvailable] = useState(false);
  const [size, setSize] = useState(0);

  // Initialize spatial index
  useEffect(() => {
    if (!enabled || !isWasmLoaded()) {
      setAvailable(false);
      return;
    }

    let mounted = true;

    createSpatialIndex().then((index) => {
      if (!mounted) {
        index?.dispose();
        return;
      }

      if (index) {
        index.setDefaultRadius(defaultRadius);
        indexRef.current = index;
        setAvailable(true);
      }
    });

    return () => {
      mounted = false;
      indexRef.current?.dispose();
      indexRef.current = null;
    };
  }, [enabled, defaultRadius]);

  // Rebuild index with new node positions
  const rebuild = useCallback((nodes: GraphNode[]) => {
    const index = indexRef.current;
    if (!index) return;

    const spatialNodes = nodes
      .filter((n) => n.x !== undefined && n.y !== undefined)
      .map((n, i) => ({
        id: i,
        x: n.x!,
        y: n.y!,
        radius: n.isCenter ? 28 : 18 + Math.min((n.listeners || 0) / 10000000, 1) * 8,
      }));

    index.bulkInsert(spatialNodes);
    setSize(index.size());
  }, []);

  // Query visible nodes in viewport
  const queryViewport = useCallback((viewport: Viewport): number[] => {
    const index = indexRef.current;
    if (!index) return [];

    return index.queryViewport(viewport);
  }, []);

  // Find nearest node
  const findNearest = useCallback((x: number, y: number): NearestResult | null => {
    const index = indexRef.current;
    if (!index) return null;

    return index.nearest(x, y);
  }, []);

  // Find node at point (hit test)
  const findNodeAt = useCallback((x: number, y: number): number | null => {
    const index = indexRef.current;
    if (!index) return null;

    return index.pointInNode(x, y);
  }, []);

  return {
    available,
    rebuild,
    queryViewport,
    findNearest,
    findNodeAt,
    size,
  };
}
```

#### 2. useViewportCulling Hook

**File**: `src/components/ForceGraph/hooks/useViewportCulling.ts`

```typescript
import { useCallback, useRef, useState } from 'react';
import { useSpatialIndex } from './useSpatialIndex';
import type { GraphNode } from '@/wasm/graph-service';
import type { Viewport } from '@/wasm/spatial-index-service';

interface UseViewportCullingOptions {
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** Padding around viewport in pixels */
  padding?: number;
  /** Minimum nodes to render (even if culled) */
  minNodes?: number;
}

interface UseViewportCullingResult {
  /** Visible node indices */
  visibleIndices: Set<number>;
  /** Update visible nodes based on viewport */
  updateViewport: (viewport: Viewport) => void;
  /** Rebuild spatial index (call when nodes change position) */
  rebuildIndex: () => void;
  /** Whether culling is active */
  cullingActive: boolean;
  /** Total nodes */
  totalNodes: number;
  /** Visible nodes count */
  visibleCount: number;
}

/**
 * Hook for viewport culling using spatial index.
 * Determines which nodes should be rendered based on current viewport.
 */
export function useViewportCulling(
  options: UseViewportCullingOptions
): UseViewportCullingResult {
  const { nodes, padding = 50, minNodes = 10 } = options;

  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(
    new Set(nodes.map((_, i) => i))
  );

  const lastViewportRef = useRef<Viewport | null>(null);
  
  const spatial = useSpatialIndex({ enabled: nodes.length > 100 });

  // Rebuild spatial index when nodes change
  const rebuildIndex = useCallback(() => {
    if (spatial.available) {
      spatial.rebuild(nodes);
    }
  }, [spatial, nodes]);

  // Update visible nodes based on viewport
  const updateViewport = useCallback((viewport: Viewport) => {
    // If spatial index not available, show all nodes
    if (!spatial.available) {
      setVisibleIndices(new Set(nodes.map((_, i) => i)));
      return;
    }

    // Add padding to viewport
    const paddedViewport: Viewport = {
      minX: viewport.minX - padding,
      minY: viewport.minY - padding,
      maxX: viewport.maxX + padding,
      maxY: viewport.maxY + padding,
    };

    // Query visible nodes
    const visible = spatial.queryViewport(paddedViewport);

    // Ensure minimum nodes visible
    if (visible.length < minNodes && nodes.length > 0) {
      // Fall back to showing all nodes
      setVisibleIndices(new Set(nodes.map((_, i) => i)));
    } else {
      setVisibleIndices(new Set(visible));
    }

    lastViewportRef.current = viewport;
  }, [spatial, nodes, padding, minNodes]);

  return {
    visibleIndices,
    updateViewport,
    rebuildIndex,
    cullingActive: spatial.available && nodes.length > 100,
    totalNodes: nodes.length,
    visibleCount: visibleIndices.size,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] Hook tests pass

#### Manual Verification:
- [ ] Hook initializes when WASM available
- [ ] Rebuild correctly indexes nodes

---

## Phase 4.4: ForceGraph Integration

### Overview
Integrate viewport culling into ForceGraph rendering.

### Changes Required:

#### 1. Update ForceGraph Component

**File**: `src/components/ForceGraph/index.tsx`

Add the following integration (this shows the key changes, not the full file):

```typescript
import { useSpatialIndex } from './hooks/useSpatialIndex';

// Inside ForceGraph component:

// Add spatial index hook
const spatialIndex = useSpatialIndex({
  enabled: simulationData.nodes.length > 100,
  defaultRadius: 20,
});

// Rebuild index when simulation stabilizes
useEffect(() => {
  if (!spatialIndex.available || !simulation) return;

  const handleEnd = () => {
    // Rebuild spatial index when simulation ends
    spatialIndex.rebuild(simulationData.nodes);
  };

  simulation.on('end', handleEnd);
  
  return () => {
    simulation.on('end', null);
  };
}, [simulation, spatialIndex, simulationData.nodes]);

// Update tick handler to use spatial queries for large graphs
const handleTick = useCallback(() => {
  if (linkSelectionRef.current) {
    linkSelectionRef.current
      .attr('x1', (d) => d.source.x!)
      .attr('y1', (d) => d.source.y!)
      .attr('x2', (d) => d.target.x!)
      .attr('y2', (d) => d.target.y!);
  }

  if (nodeSelectionRef.current) {
    nodeSelectionRef.current.attr('transform', (d) => `translate(${d.x},${d.y})`);
  }
}, []);

// Add hover handler using spatial index
const handleMouseMove = useCallback((event: MouseEvent) => {
  if (!spatialIndex.available || !svgRef.current) return;

  const svg = svgRef.current;
  const rect = svg.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Transform to graph coordinates (accounting for zoom)
  // ... zoom transform calculation ...

  const nearest = spatialIndex.findNearest(x, y);
  if (nearest && nearest.distance < 50) {
    // Show tooltip for nearest node
    setHoveredNode(nearest.id);
  } else {
    setHoveredNode(null);
  }
}, [spatialIndex]);
```

#### 2. Viewport Culling Render Optimization

For graphs with 500+ nodes, add conditional rendering:

```typescript
// In the render effect, filter nodes by visibility
useEffect(() => {
  if (!svgRef.current || !gRef.current) return;

  const svg = d3.select(svgRef.current);
  const g = d3.select(gRef.current);

  // Get current viewport in graph coordinates
  const transform = d3.zoomTransform(svg.node()!);
  const viewport = {
    minX: -transform.x / transform.k,
    minY: -transform.y / transform.k,
    maxX: (width - transform.x) / transform.k,
    maxY: (height - transform.y) / transform.k,
  };

  // Query visible nodes
  const visibleIds = spatialIndex.available
    ? new Set(spatialIndex.queryViewport(viewport))
    : new Set(nodes.map((_, i) => i));

  // Update node visibility
  g.selectAll('.node')
    .style('display', (d, i) => visibleIds.has(i) ? null : 'none');

  // Update link visibility (show if either endpoint visible)
  g.selectAll('.link')
    .style('display', (d: any) => {
      const srcIdx = typeof d.source === 'number' ? d.source : nodes.indexOf(d.source);
      const tgtIdx = typeof d.target === 'number' ? d.target : nodes.indexOf(d.target);
      return visibleIds.has(srcIdx) || visibleIds.has(tgtIdx) ? null : 'none';
    });
}, [zoom, spatialIndex, nodes, width, height]);
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] ForceGraph tests pass
- [ ] E2E tests pass

#### Manual Verification:
- [ ] Graph renders correctly with culling
- [ ] Zoom/pan updates visible nodes
- [ ] Hover uses nearest-neighbor lookup

---

## Phase 4.5: Testing and Benchmarks

### Overview
Add comprehensive tests for spatial indexing.

### Changes Required:

#### 1. Spatial Index Tests

**File**: `src/wasm/spatial-index-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WASM module
vi.mock('@/wasm/pkg', () => {
  class MockSpatialIndex {
    private nodes: Array<{ id: number; x: number; y: number; radius: number }> = [];
    
    set_default_radius(r: number) {}
    insert(id: number, x: number, y: number) {
      this.nodes.push({ id, x, y, radius: 20 });
    }
    insert_with_radius(id: number, x: number, y: number, r: number) {
      this.nodes.push({ id, x, y, radius: r });
    }
    bulk_insert(data: Float64Array) {
      for (let i = 0; i < data.length; i += 3) {
        this.nodes.push({
          id: data[i],
          x: data[i + 1],
          y: data[i + 2],
          radius: 20,
        });
      }
    }
    bulk_insert_with_radii(data: Float64Array) {
      for (let i = 0; i < data.length; i += 4) {
        this.nodes.push({
          id: data[i],
          x: data[i + 1],
          y: data[i + 2],
          radius: data[i + 3],
        });
      }
    }
    clear() {
      this.nodes = [];
    }
    size() {
      return this.nodes.length;
    }
    query_viewport(minX: number, minY: number, maxX: number, maxY: number) {
      return new Uint32Array(
        this.nodes
          .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
          .map((n) => n.id)
      );
    }
    nearest(x: number, y: number) {
      if (this.nodes.length === 0) return null;
      let nearest = this.nodes[0];
      let minDist = Infinity;
      for (const n of this.nodes) {
        const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = n;
        }
      }
      return { id: nearest.id, distance: minDist, x: nearest.x, y: nearest.y };
    }
    k_nearest(x: number, y: number, k: number) {
      const sorted = [...this.nodes].sort((a, b) => {
        const distA = (a.x - x) ** 2 + (a.y - y) ** 2;
        const distB = (b.x - x) ** 2 + (b.y - y) ** 2;
        return distA - distB;
      });
      return sorted.slice(0, k).map((n) => ({
        id: n.id,
        distance: Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2),
        x: n.x,
        y: n.y,
      }));
    }
    point_in_node(x: number, y: number) {
      for (const n of this.nodes) {
        const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        if (dist <= n.radius) return n.id;
      }
      return null;
    }
    within_radius(x: number, y: number, r: number) {
      return new Uint32Array(
        this.nodes
          .filter((n) => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) <= r)
          .map((n) => n.id)
      );
    }
    free() {}
  }

  return {
    init: vi.fn().mockResolvedValue(undefined),
    SpatialIndex: MockSpatialIndex,
  };
});

vi.mock('@/wasm/loader', () => ({
  getWasmModule: () => require('@/wasm/pkg'),
  isWasmLoaded: () => true,
}));

describe('WasmSpatialIndex', () => {
  it('should bulk insert nodes', async () => {
    const { createSpatialIndex } = await import('./spatial-index-service');
    
    const index = await createSpatialIndex();
    index!.bulkInsert([
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 200 },
      { id: 2, x: 300, y: 300 },
    ]);
    
    expect(index!.size()).toBe(3);
  });

  it('should query viewport', async () => {
    const { createSpatialIndex } = await import('./spatial-index-service');
    
    const index = await createSpatialIndex();
    index!.bulkInsert([
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 200 },
      { id: 2, x: 500, y: 500 },
    ]);
    
    const visible = index!.queryViewport({
      minX: 0,
      minY: 0,
      maxX: 300,
      maxY: 300,
    });
    
    expect(visible).toContain(0);
    expect(visible).toContain(1);
    expect(visible).not.toContain(2);
  });

  it('should find nearest node', async () => {
    const { createSpatialIndex } = await import('./spatial-index-service');
    
    const index = await createSpatialIndex();
    index!.bulkInsert([
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 200 },
    ]);
    
    const nearest = index!.nearest(190, 210);
    
    expect(nearest).not.toBeNull();
    expect(nearest!.id).toBe(1);
  });
});
```

#### 2. Performance Benchmarks

**File**: `src/wasm/spatial-benchmarks.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

const describeWasm = process.env.CI ? describe.skip : describe;

describeWasm('Spatial Index Benchmarks', () => {
  // Generate random nodes
  function generateNodes(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    }));
  }

  // JavaScript linear search for comparison
  function linearViewportQuery(
    nodes: Array<{ x: number; y: number }>,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    return nodes.filter(
      (n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY
    );
  }

  const testCases = [
    { count: 100, name: '100 nodes' },
    { count: 500, name: '500 nodes' },
    { count: 1000, name: '1000 nodes' },
    { count: 5000, name: '5000 nodes' },
  ];

  testCases.forEach(({ count, name }) => {
    it(`should benchmark viewport query: ${name}`, async () => {
      const nodes = generateNodes(count);
      const iterations = 100;
      const viewport = { minX: 200, minY: 200, maxX: 600, maxY: 600 };

      // JS linear search
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        linearViewportQuery(nodes, 200, 200, 600, 600);
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // WASM R-tree (if available)
      const { createSpatialIndex } = await import('./spatial-index-service');
      const index = await createSpatialIndex();
      
      if (index) {
        index.bulkInsert(nodes);
        
        const wasmStart = performance.now();
        for (let i = 0; i < iterations; i++) {
          index.queryViewport(viewport);
        }
        const wasmTime = (performance.now() - wasmStart) / iterations;

        const speedup = jsTime / wasmTime;

        console.log(`\n${name}:`);
        console.log(`  JS Linear: ${jsTime.toFixed(3)}ms`);
        console.log(`  WASM R-tree: ${wasmTime.toFixed(3)}ms`);
        console.log(`  Speedup: ${speedup.toFixed(2)}x`);

        // R-tree should be faster for larger datasets
        if (count >= 500) {
          expect(speedup).toBeGreaterThan(1);
        }

        index.dispose();
      }
    });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test` passes all tests
- [ ] `npm run wasm:test` passes Rust tests
- [ ] Test coverage > 80% for new code

#### Manual Verification:
- [ ] Benchmarks show speedup for 500+ nodes
- [ ] Viewport queries < 1ms for 1000 nodes

---

## Testing Strategy

### Unit Tests
- SpatialIndex Rust implementation
- Bulk insert and single insert
- Viewport queries
- Nearest neighbor queries
- Point-in-node hit testing
- Radius queries

### Integration Tests
- useSpatialIndex hook initialization
- useViewportCulling hook behavior
- ForceGraph with culling enabled

### Performance Benchmarks
- Compare linear O(n) vs R-tree O(log n + k) queries
- Measure overhead of index rebuilding
- Test with 100, 500, 1000, 5000 nodes

### E2E Tests
- Graph renders correctly with culling
- Zoom/pan updates visible nodes smoothly
- Node interactions work with spatial queries

## Performance Considerations

- R-tree bulk loading is O(n log n) - use for initial build
- Individual inserts are O(log n)
- Viewport queries are O(log n + k) where k = results
- Nearest neighbor is O(log n)
- Rebuild index only when simulation stabilizes (not every frame)

## Migration Notes

This phase is additive:
- Spatial indexing is optional optimization
- Falls back to rendering all nodes if WASM unavailable
- Only activates for graphs with 100+ nodes
- No changes to existing rendering for small graphs

## References

- Phase 1-3 Plans: `thoughts/shared/plans/2025-12-20-rust-wasm-phase-*.md`
- Research: `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md`
- rstar documentation: https://docs.rs/rstar/latest/rstar/
- D3 zoom documentation: https://github.com/d3/d3-zoom
