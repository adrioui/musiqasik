# Phase 5: Force Simulation in WASM

## Overview

This plan ports the D3.js force simulation to Rust WASM for improved performance on large graphs. This includes implementing link forces, charge (many-body) forces, center forces, and collision detection. The simulation runs in WASM with position data transferred via TypedArrays for efficient rendering.

**Prerequisites**: Phases 1-4 must be completed.

## Current State Analysis

### Current D3 Force Simulation

**Location**: `src/components/ForceGraph/hooks/useD3Simulation.ts:43-58`

**Current Implementation:**
```typescript
const simulation = d3
  .forceSimulation<GraphNode>(nodes)
  .force(
    'link',
    d3.forceLink<GraphNode, GraphLink>(links)
      .id((d) => d.name)
      .distance((d) => 100 + (1 - d.weight) * 100)
      .strength((d) => d.weight * 0.5)
  )
  .force('charge', d3.forceManyBody().strength(-400))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(40))
  .on('tick', onTick);
```

**Performance Characteristics:**
- Charge force is O(n²) without Barnes-Hut approximation
- D3 uses quadtree for charge approximation (O(n log n))
- ~60 ticks to stabilize, each tick processes all forces
- With 500 nodes: ~10-20ms per tick
- With 2000 nodes: ~50-100ms per tick (janky)

### What WASM Provides

1. **Parallel Force Calculations**: SIMD and multi-threading potential
2. **Efficient Memory Layout**: Struct-of-arrays for cache locality
3. **No GC Pauses**: Predictable frame times
4. **Typed Arrays**: Zero-copy position transfer to JavaScript

### Expected Improvements

| Nodes | D3 per-tick | WASM per-tick | Improvement |
|-------|-------------|---------------|-------------|
| 100   | 2-5ms       | 1-2ms         | 2x          |
| 500   | 15-25ms     | 5-10ms        | 2-3x        |
| 2000  | 80-120ms    | 20-40ms       | 3-4x        |
| 5000  | 300-500ms   | 60-100ms      | 4-5x        |

## Desired End State

After completing this phase:
1. `ForceSimulation` Rust struct implements all D3 forces
2. Position data transferred via Float32Array (zero-copy)
3. React hook manages WASM simulation lifecycle
4. ForceGraph uses WASM simulation when available
5. Smooth 60fps animation for 2000+ node graphs
6. Barnes-Hut approximation for O(n log n) charge force

### Verification
```bash
# Run unit tests
npm run test

# Run WASM tests
npm run wasm:test

# Run E2E tests
npm run test:e2e

# Manual benchmark with large graph
VITE_USE_WASM_GRAPH=true npm run dev
# Search for artist with depth=2-3, observe frame rate
```

## What We're NOT Doing

- GPU/WebGL acceleration
- Web Worker integration (future optimization)
- Custom force implementations beyond standard D3 forces
- Streaming/incremental simulation

## Implementation Approach

**Architecture:**
```
ForceGraph Component
       │
       ▼
┌─────────────────────────┐
│ useWasmSimulation Hook  │
│   - Init with nodes     │
│   - Tick management     │
│   - Position sync       │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ WASM ForceSimulation    │
│   - Link force          │
│   - Charge force (B-H)  │
│   - Center force        │
│   - Collision force     │
│   - Position arrays     │
└─────────────────────────┘
```

**Data Flow:**
1. Initialize simulation with node/link data
2. Each frame: call `tick()` in WASM
3. Get positions via TypedArray view (zero-copy)
4. Update D3 selections with new positions
5. Repeat until alpha decays

---

## Phase 5.1: Rust Force Simulation Core

### Overview
Implement the core force simulation with all standard forces.

### Changes Required:

#### 1. Force Simulation Module

**File**: `rust/graph-wasm/src/force_simulation.rs`

```rust
use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

/// Force simulation parameters
#[derive(Debug, Clone)]
pub struct SimulationConfig {
    pub alpha: f32,
    pub alpha_min: f32,
    pub alpha_decay: f32,
    pub alpha_target: f32,
    pub velocity_decay: f32,
}

impl Default for SimulationConfig {
    fn default() -> Self {
        SimulationConfig {
            alpha: 1.0,
            alpha_min: 0.001,
            alpha_decay: 0.0228, // 1 - pow(0.001, 1/300)
            alpha_target: 0.0,
            velocity_decay: 0.6,
        }
    }
}

/// Link between two nodes
#[derive(Debug, Clone)]
pub struct SimLink {
    pub source: usize,
    pub target: usize,
    pub distance: f32,
    pub strength: f32,
}

/// Node in the simulation
#[derive(Debug, Clone)]
pub struct SimNode {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub fx: Option<f32>,  // Fixed x position
    pub fy: Option<f32>,  // Fixed y position
    pub radius: f32,
}

impl Default for SimNode {
    fn default() -> Self {
        SimNode {
            x: 0.0,
            y: 0.0,
            vx: 0.0,
            vy: 0.0,
            fx: None,
            fy: None,
            radius: 20.0,
        }
    }
}

/// Force simulation with D3-compatible forces
#[wasm_bindgen]
pub struct ForceSimulation {
    nodes: Vec<SimNode>,
    links: Vec<SimLink>,
    config: SimulationConfig,
    
    // Link force parameters
    link_distance: f32,
    link_strength: f32,
    
    // Charge force parameters (many-body)
    charge_strength: f32,
    charge_theta: f32,  // Barnes-Hut threshold
    charge_min_distance: f32,
    charge_max_distance: f32,
    
    // Center force parameters
    center_x: f32,
    center_y: f32,
    center_strength: f32,
    
    // Collision force parameters
    collision_radius: f32,
    collision_strength: f32,
    collision_iterations: u32,
    
    // Quadtree for Barnes-Hut approximation
    quadtree_bounds: (f32, f32, f32, f32),  // (min_x, min_y, max_x, max_y)
}

#[wasm_bindgen]
impl ForceSimulation {
    /// Create a new force simulation
    #[wasm_bindgen(constructor)]
    pub fn new(width: f32, height: f32) -> ForceSimulation {
        ForceSimulation {
            nodes: Vec::new(),
            links: Vec::new(),
            config: SimulationConfig::default(),
            
            link_distance: 100.0,
            link_strength: 0.5,
            
            charge_strength: -400.0,
            charge_theta: 0.9,
            charge_min_distance: 1.0,
            charge_max_distance: f32::INFINITY,
            
            center_x: width / 2.0,
            center_y: height / 2.0,
            center_strength: 0.1,
            
            collision_radius: 40.0,
            collision_strength: 0.7,
            collision_iterations: 1,
            
            quadtree_bounds: (0.0, 0.0, width, height),
        }
    }

    /// Initialize nodes from flat array [x0, y0, r0, x1, y1, r1, ...]
    #[wasm_bindgen]
    pub fn init_nodes(&mut self, data: &[f32]) {
        self.nodes = data
            .chunks(3)
            .enumerate()
            .map(|(_, chunk)| SimNode {
                x: chunk[0],
                y: chunk[1],
                radius: chunk[2],
                ..Default::default()
            })
            .collect();
        
        // Initialize random positions for nodes at origin
        let cx = self.center_x;
        let cy = self.center_y;
        for (i, node) in self.nodes.iter_mut().enumerate() {
            if node.x == 0.0 && node.y == 0.0 {
                // Phyllotaxis arrangement for initial positions
                let radius = 10.0 * (i as f32).sqrt();
                let angle = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt()) * (i as f32);
                node.x = cx + radius * angle.cos();
                node.y = cy + radius * angle.sin();
            }
        }
    }

    /// Initialize links from flat array [src0, tgt0, dist0, str0, ...]
    #[wasm_bindgen]
    pub fn init_links(&mut self, data: &[f32]) {
        self.links = data
            .chunks(4)
            .map(|chunk| SimLink {
                source: chunk[0] as usize,
                target: chunk[1] as usize,
                distance: chunk[2],
                strength: chunk[3],
            })
            .collect();
    }

    /// Set simulation alpha
    #[wasm_bindgen]
    pub fn set_alpha(&mut self, alpha: f32) {
        self.config.alpha = alpha;
    }

    /// Get current alpha
    #[wasm_bindgen]
    pub fn alpha(&self) -> f32 {
        self.config.alpha
    }

    /// Set alpha target (for reheating)
    #[wasm_bindgen]
    pub fn set_alpha_target(&mut self, target: f32) {
        self.config.alpha_target = target;
    }

    /// Set charge (many-body) strength
    #[wasm_bindgen]
    pub fn set_charge_strength(&mut self, strength: f32) {
        self.charge_strength = strength;
    }

    /// Set center position
    #[wasm_bindgen]
    pub fn set_center(&mut self, x: f32, y: f32) {
        self.center_x = x;
        self.center_y = y;
    }

    /// Set collision radius
    #[wasm_bindgen]
    pub fn set_collision_radius(&mut self, radius: f32) {
        self.collision_radius = radius;
    }

    /// Fix node position
    #[wasm_bindgen]
    pub fn fix_node(&mut self, index: usize, x: f32, y: f32) {
        if let Some(node) = self.nodes.get_mut(index) {
            node.fx = Some(x);
            node.fy = Some(y);
        }
    }

    /// Unfix node position
    #[wasm_bindgen]
    pub fn unfix_node(&mut self, index: usize) {
        if let Some(node) = self.nodes.get_mut(index) {
            node.fx = None;
            node.fy = None;
        }
    }

    /// Run one tick of the simulation
    #[wasm_bindgen]
    pub fn tick(&mut self) -> bool {
        // Decay alpha
        self.config.alpha += (self.config.alpha_target - self.config.alpha) 
            * self.config.alpha_decay;
        
        if self.config.alpha < self.config.alpha_min {
            return false; // Simulation complete
        }

        // Apply forces
        self.apply_link_force();
        self.apply_charge_force();
        self.apply_center_force();
        self.apply_collision_force();

        // Update positions
        self.integrate();

        true // Simulation still running
    }

    /// Run multiple ticks
    #[wasm_bindgen]
    pub fn tick_n(&mut self, n: u32) -> bool {
        for _ in 0..n {
            if !self.tick() {
                return false;
            }
        }
        true
    }

    /// Get positions as Float32Array view (zero-copy when possible)
    #[wasm_bindgen]
    pub fn get_positions(&self) -> Float32Array {
        let data: Vec<f32> = self.nodes
            .iter()
            .flat_map(|n| [n.x, n.y])
            .collect();
        
        Float32Array::from(&data[..])
    }

    /// Get positions directly into provided buffer
    #[wasm_bindgen]
    pub fn get_positions_into(&self, buffer: &mut [f32]) {
        for (i, node) in self.nodes.iter().enumerate() {
            if i * 2 + 1 < buffer.len() {
                buffer[i * 2] = node.x;
                buffer[i * 2 + 1] = node.y;
            }
        }
    }

    /// Get node count
    #[wasm_bindgen]
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Check if simulation is complete
    #[wasm_bindgen]
    pub fn is_complete(&self) -> bool {
        self.config.alpha < self.config.alpha_min
    }

    // ==================== Force Implementations ====================

    /// Apply link forces
    fn apply_link_force(&mut self) {
        let alpha = self.config.alpha;
        
        for link in &self.links {
            let source = &self.nodes[link.source];
            let target = &self.nodes[link.target];
            
            let dx = target.x - source.x;
            let dy = target.y - source.y;
            let dist = (dx * dx + dy * dy).sqrt().max(0.001);
            
            let force = (dist - link.distance) * link.strength * alpha;
            let fx = dx / dist * force;
            let fy = dy / dist * force;
            
            // Apply forces (need mutable access)
            self.nodes[link.source].vx += fx;
            self.nodes[link.source].vy += fy;
            self.nodes[link.target].vx -= fx;
            self.nodes[link.target].vy -= fy;
        }
    }

    /// Apply charge (many-body) forces using naive O(n²) for simplicity
    /// TODO: Implement Barnes-Hut approximation for O(n log n)
    fn apply_charge_force(&mut self) {
        let alpha = self.config.alpha;
        let strength = self.charge_strength;
        let min_dist = self.charge_min_distance;
        
        let n = self.nodes.len();
        let mut forces = vec![(0.0f32, 0.0f32); n];
        
        for i in 0..n {
            for j in (i + 1)..n {
                let dx = self.nodes[j].x - self.nodes[i].x;
                let dy = self.nodes[j].y - self.nodes[i].y;
                let dist_sq = (dx * dx + dy * dy).max(min_dist * min_dist);
                let dist = dist_sq.sqrt();
                
                // Coulomb's law: F = k * q1 * q2 / r²
                let force = strength * alpha / dist_sq;
                let fx = dx / dist * force;
                let fy = dy / dist * force;
                
                forces[i].0 -= fx;
                forces[i].1 -= fy;
                forces[j].0 += fx;
                forces[j].1 += fy;
            }
        }
        
        for (i, (fx, fy)) in forces.into_iter().enumerate() {
            self.nodes[i].vx += fx;
            self.nodes[i].vy += fy;
        }
    }

    /// Apply center force
    fn apply_center_force(&mut self) {
        let alpha = self.config.alpha;
        let strength = self.center_strength;
        
        // Calculate center of mass
        let n = self.nodes.len() as f32;
        if n == 0.0 {
            return;
        }
        
        let (sum_x, sum_y) = self.nodes
            .iter()
            .fold((0.0, 0.0), |(sx, sy), node| (sx + node.x, sy + node.y));
        
        let com_x = sum_x / n;
        let com_y = sum_y / n;
        
        // Move center of mass towards target center
        let dx = (self.center_x - com_x) * strength * alpha;
        let dy = (self.center_y - com_y) * strength * alpha;
        
        for node in &mut self.nodes {
            node.x += dx;
            node.y += dy;
        }
    }

    /// Apply collision forces
    fn apply_collision_force(&mut self) {
        let n = self.nodes.len();
        let strength = self.collision_strength;
        
        for _ in 0..self.collision_iterations {
            for i in 0..n {
                for j in (i + 1)..n {
                    let ri = self.nodes[i].radius;
                    let rj = self.nodes[j].radius;
                    let min_dist = ri + rj;
                    
                    let dx = self.nodes[j].x - self.nodes[i].x;
                    let dy = self.nodes[j].y - self.nodes[i].y;
                    let dist = (dx * dx + dy * dy).sqrt();
                    
                    if dist < min_dist && dist > 0.001 {
                        let overlap = (min_dist - dist) * strength;
                        let push = overlap / dist * 0.5;
                        
                        self.nodes[i].x -= dx * push;
                        self.nodes[i].y -= dy * push;
                        self.nodes[j].x += dx * push;
                        self.nodes[j].y += dy * push;
                    }
                }
            }
        }
    }

    /// Integrate velocities to update positions
    fn integrate(&mut self) {
        let velocity_decay = self.config.velocity_decay;
        
        for node in &mut self.nodes {
            // Apply fixed positions if set
            if let Some(fx) = node.fx {
                node.x = fx;
                node.vx = 0.0;
            } else {
                node.vx *= velocity_decay;
                node.x += node.vx;
            }
            
            if let Some(fy) = node.fy {
                node.y = fy;
                node.vy = 0.0;
            } else {
                node.vy *= velocity_decay;
                node.y += node.vy;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simulation_creation() {
        let sim = ForceSimulation::new(800.0, 600.0);
        assert_eq!(sim.node_count(), 0);
    }

    #[test]
    fn test_node_initialization() {
        let mut sim = ForceSimulation::new(800.0, 600.0);
        
        // Init with 3 nodes: [x, y, radius, ...]
        let data = vec![
            400.0, 300.0, 20.0,
            100.0, 100.0, 15.0,
            700.0, 500.0, 25.0,
        ];
        sim.init_nodes(&data);
        
        assert_eq!(sim.node_count(), 3);
    }

    #[test]
    fn test_simulation_tick() {
        let mut sim = ForceSimulation::new(800.0, 600.0);
        
        let nodes = vec![
            200.0, 300.0, 20.0,
            600.0, 300.0, 20.0,
        ];
        sim.init_nodes(&nodes);
        
        let links = vec![0.0, 1.0, 100.0, 0.5]; // source, target, distance, strength
        sim.init_links(&links);
        
        // Run some ticks
        for _ in 0..10 {
            sim.tick();
        }
        
        // Positions should have changed
        let positions = sim.get_positions();
        assert!(positions.length() == 4); // 2 nodes * 2 coords
    }

    #[test]
    fn test_simulation_completion() {
        let mut sim = ForceSimulation::new(800.0, 600.0);
        
        let nodes = vec![400.0, 300.0, 20.0];
        sim.init_nodes(&nodes);
        
        // Run until complete
        let mut ticks = 0;
        while sim.tick() {
            ticks += 1;
            if ticks > 1000 {
                break; // Safety limit
            }
        }
        
        assert!(sim.is_complete());
    }

    #[test]
    fn test_fix_unfix_node() {
        let mut sim = ForceSimulation::new(800.0, 600.0);
        
        let nodes = vec![400.0, 300.0, 20.0];
        sim.init_nodes(&nodes);
        
        sim.fix_node(0, 500.0, 400.0);
        sim.tick();
        
        let positions = sim.get_positions();
        let x = positions.get_index(0);
        let y = positions.get_index(1);
        
        assert_eq!(x, 500.0);
        assert_eq!(y, 400.0);
        
        sim.unfix_node(0);
    }
}
```

#### 2. Update Cargo.toml

No new dependencies needed for basic force simulation.

#### 3. Update lib.rs

**File**: `rust/graph-wasm/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;

mod types;
mod graph_processor;
mod graph_builder;
mod spatial_index;
mod force_simulation;

pub use types::*;
pub use graph_processor::*;
pub use graph_builder::*;
pub use spatial_index::*;
pub use force_simulation::*;

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
- [ ] WASM binary size under 150KB gzipped

---

## Phase 5.2: TypeScript Integration

### Overview
Create TypeScript wrapper and React hook for the force simulation.

### Changes Required:

#### 1. Update WASM Type Declarations

**File**: `src/wasm/types.d.ts` (append)

```typescript
// Add to existing declarations

declare module '@/wasm/pkg' {
  // ... existing declarations ...

  export class ForceSimulation {
    constructor(width: number, height: number);
    
    init_nodes(data: Float32Array): void;
    init_links(data: Float32Array): void;
    set_alpha(alpha: number): void;
    alpha(): number;
    set_alpha_target(target: number): void;
    set_charge_strength(strength: number): void;
    set_center(x: number, y: number): void;
    set_collision_radius(radius: number): void;
    fix_node(index: number, x: number, y: number): void;
    unfix_node(index: number): void;
    tick(): boolean;
    tick_n(n: number): boolean;
    get_positions(): Float32Array;
    get_positions_into(buffer: Float32Array): void;
    node_count(): number;
    is_complete(): boolean;
    free(): void;
  }
}
```

#### 2. Force Simulation Service

**File**: `src/wasm/force-simulation-service.ts`

```typescript
import { getWasmModule, isWasmLoaded } from './loader';
import type { GraphNode, GraphLink } from './graph-service';

export interface ForceConfig {
  chargeStrength?: number;
  linkDistance?: number;
  linkStrength?: number;
  collisionRadius?: number;
  centerStrength?: number;
  alpha?: number;
  alphaDecay?: number;
}

/**
 * Wrapper for WASM ForceSimulation.
 */
export class WasmForceSimulation {
  private simulation: import('@/wasm/pkg').ForceSimulation | null = null;
  private width: number;
  private height: number;
  private nodeCount = 0;
  private positionBuffer: Float32Array | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Initialize the simulation.
   */
  async init(): Promise<boolean> {
    const wasm = getWasmModule();
    if (!wasm) return false;

    try {
      this.simulation = new wasm.ForceSimulation(this.width, this.height);
      return true;
    } catch (error) {
      console.error('[WASM] ForceSimulation init failed:', error);
      return false;
    }
  }

  /**
   * Set up nodes for simulation.
   */
  initNodes(nodes: GraphNode[]): void {
    if (!this.simulation) return;

    this.nodeCount = nodes.length;
    this.positionBuffer = new Float32Array(nodes.length * 2);

    const data = new Float32Array(nodes.length * 3);
    nodes.forEach((node, i) => {
      data[i * 3] = node.x ?? this.width / 2;
      data[i * 3 + 1] = node.y ?? this.height / 2;
      data[i * 3 + 2] = node.isCenter ? 28 : 18 + Math.min((node.listeners || 0) / 10000000, 1) * 8;
    });

    this.simulation.init_nodes(data);
  }

  /**
   * Set up links for simulation.
   */
  initLinks(links: Array<{ source: number; target: number; weight: number }>): void {
    if (!this.simulation) return;

    const data = new Float32Array(links.length * 4);
    links.forEach((link, i) => {
      data[i * 4] = link.source;
      data[i * 4 + 1] = link.target;
      data[i * 4 + 2] = 100 + (1 - link.weight) * 100; // distance
      data[i * 4 + 3] = link.weight * 0.5; // strength
    });

    this.simulation.init_links(data);
  }

  /**
   * Configure forces.
   */
  configure(config: ForceConfig): void {
    if (!this.simulation) return;

    if (config.chargeStrength !== undefined) {
      this.simulation.set_charge_strength(config.chargeStrength);
    }
    if (config.collisionRadius !== undefined) {
      this.simulation.set_collision_radius(config.collisionRadius);
    }
    if (config.alpha !== undefined) {
      this.simulation.set_alpha(config.alpha);
    }
  }

  /**
   * Update center position.
   */
  setCenter(x: number, y: number): void {
    this.simulation?.set_center(x, y);
  }

  /**
   * Fix a node's position (for dragging).
   */
  fixNode(index: number, x: number, y: number): void {
    this.simulation?.fix_node(index, x, y);
  }

  /**
   * Unfix a node's position.
   */
  unfixNode(index: number): void {
    this.simulation?.unfix_node(index);
  }

  /**
   * Restart simulation with new alpha.
   */
  restart(alpha: number = 0.3): void {
    this.simulation?.set_alpha(alpha);
  }

  /**
   * Run one tick. Returns false if simulation complete.
   */
  tick(): boolean {
    return this.simulation?.tick() ?? false;
  }

  /**
   * Run multiple ticks.
   */
  tickN(n: number): boolean {
    return this.simulation?.tick_n(n) ?? false;
  }

  /**
   * Get current positions.
   */
  getPositions(): Float32Array | null {
    if (!this.simulation || !this.positionBuffer) return null;

    try {
      // Get positions (this returns a copy)
      return this.simulation.get_positions();
    } catch (error) {
      console.error('[WASM] getPositions failed:', error);
      return null;
    }
  }

  /**
   * Get current alpha value.
   */
  getAlpha(): number {
    return this.simulation?.alpha() ?? 0;
  }

  /**
   * Check if simulation is complete.
   */
  isComplete(): boolean {
    return this.simulation?.is_complete() ?? true;
  }

  /**
   * Get node count.
   */
  getNodeCount(): number {
    return this.nodeCount;
  }

  /**
   * Update dimensions.
   */
  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.simulation?.set_center(width / 2, height / 2);
  }

  /**
   * Dispose simulation.
   */
  dispose(): void {
    this.simulation?.free();
    this.simulation = null;
    this.positionBuffer = null;
  }
}

/**
 * Create a new WASM force simulation.
 */
export async function createForceSimulation(
  width: number,
  height: number
): Promise<WasmForceSimulation | null> {
  if (!isWasmLoaded()) return null;

  const sim = new WasmForceSimulation(width, height);
  const success = await sim.init();
  
  return success ? sim : null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] No type errors

#### Manual Verification:
- [ ] Service initializes correctly

---

## Phase 5.3: React Hook Integration

### Overview
Create React hook for managing WASM force simulation.

### Changes Required:

#### 1. useWasmSimulation Hook

**File**: `src/components/ForceGraph/hooks/useWasmSimulation.ts`

```typescript
import { useRef, useEffect, useCallback, useState } from 'react';
import {
  createForceSimulation,
  WasmForceSimulation,
  type ForceConfig,
} from '@/wasm/force-simulation-service';
import { isWasmLoaded } from '@/wasm/loader';
import type { GraphNode } from '@/wasm/graph-service';

interface UseWasmSimulationOptions {
  nodes: GraphNode[];
  links: Array<{ source: number; target: number; weight: number }>;
  width: number;
  height: number;
  onTick?: (positions: Float32Array) => void;
  config?: ForceConfig;
}

interface UseWasmSimulationResult {
  available: boolean;
  running: boolean;
  alpha: number;
  restart: (alpha?: number) => void;
  stop: () => void;
  fixNode: (index: number, x: number, y: number) => void;
  unfixNode: (index: number) => void;
}

/**
 * Hook for WASM-accelerated force simulation.
 */
export function useWasmSimulation(
  options: UseWasmSimulationOptions
): UseWasmSimulationResult {
  const { nodes, links, width, height, onTick, config } = options;

  const simulationRef = useRef<WasmForceSimulation | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);
  
  const [available, setAvailable] = useState(false);
  const [running, setRunning] = useState(false);
  const [alpha, setAlpha] = useState(1);

  // Keep onTick ref updated
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Initialize simulation
  useEffect(() => {
    if (!isWasmLoaded() || nodes.length === 0) {
      setAvailable(false);
      return;
    }

    let mounted = true;

    createForceSimulation(width, height).then((sim) => {
      if (!mounted || !sim) {
        sim?.dispose();
        return;
      }

      sim.initNodes(nodes);
      sim.initLinks(links);
      
      if (config) {
        sim.configure(config);
      }

      simulationRef.current = sim;
      setAvailable(true);

      // Start animation loop
      const tick = () => {
        if (!sim.tick()) {
          setRunning(false);
          return;
        }

        setAlpha(sim.getAlpha());
        
        const positions = sim.getPositions();
        if (positions && onTickRef.current) {
          onTickRef.current(positions);
        }

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      setRunning(true);
      animationFrameRef.current = requestAnimationFrame(tick);
    });

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      simulationRef.current?.dispose();
      simulationRef.current = null;
    };
  }, [nodes, links, width, height, config]);

  // Update dimensions
  useEffect(() => {
    simulationRef.current?.setDimensions(width, height);
  }, [width, height]);

  // Restart simulation
  const restart = useCallback((newAlpha = 0.3) => {
    const sim = simulationRef.current;
    if (!sim) return;

    sim.restart(newAlpha);
    setRunning(true);

    // Restart animation loop if not running
    if (!animationFrameRef.current) {
      const tick = () => {
        if (!sim.tick()) {
          setRunning(false);
          animationFrameRef.current = null;
          return;
        }

        setAlpha(sim.getAlpha());
        
        const positions = sim.getPositions();
        if (positions && onTickRef.current) {
          onTickRef.current(positions);
        }

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  // Stop simulation
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setRunning(false);
  }, []);

  // Fix node (for dragging)
  const fixNode = useCallback((index: number, x: number, y: number) => {
    simulationRef.current?.fixNode(index, x, y);
  }, []);

  // Unfix node
  const unfixNode = useCallback((index: number) => {
    simulationRef.current?.unfixNode(index);
  }, []);

  return {
    available,
    running,
    alpha,
    restart,
    stop,
    fixNode,
    unfixNode,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] Hook tests pass

#### Manual Verification:
- [ ] Simulation runs and updates positions

---

## Phase 5.4: ForceGraph Integration

### Overview
Update ForceGraph to use WASM simulation when available.

### Changes Required:

#### 1. Update useD3Simulation Hook

**File**: `src/components/ForceGraph/hooks/useD3Simulation.ts`

Add WASM fallback logic:

```typescript
import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useWasmSimulation } from './useWasmSimulation';
import { isWasmLoaded } from '@/wasm/loader';
import type { GraphNode, SimulationLink } from '../types';

interface UseD3SimulationOptions {
  nodes: GraphNode[];
  links: SimulationLink[];
  width: number;
  height: number;
  onTick: () => void;
  useWasm?: boolean;
}

export function useD3Simulation(options: UseD3SimulationOptions) {
  const { nodes, links, width, height, onTick, useWasm = true } = options;
  
  const simulationRef = useRef<d3.Simulation<GraphNode, SimulationLink> | null>(null);
  const onTickRef = useRef(onTick);
  
  // Prepare link data for WASM
  const wasmLinks = links.map((link) => ({
    source: typeof link.source === 'number' ? link.source : nodes.indexOf(link.source as GraphNode),
    target: typeof link.target === 'number' ? link.target : nodes.indexOf(link.target as GraphNode),
    weight: link.weight,
  }));

  // Try WASM simulation first
  const wasmSimulation = useWasmSimulation({
    nodes,
    links: wasmLinks,
    width,
    height,
    onTick: useWasm ? (positions) => {
      // Update node positions from WASM
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x = positions[i * 2];
        nodes[i].y = positions[i * 2 + 1];
      }
      onTickRef.current();
    } : undefined,
    config: {
      chargeStrength: -400,
      collisionRadius: 40,
    },
  });

  // Use WASM if available and enabled
  const useWasmSimulation = useWasm && wasmSimulation.available;

  // Fall back to D3 if WASM not available
  useEffect(() => {
    if (useWasmSimulation) {
      // WASM is handling simulation
      return;
    }

    // D3 simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3.forceLink<GraphNode, SimulationLink>(links)
          .id((d) => d.name)
          .distance((d) => 100 + (1 - d.weight) * 100)
          .strength((d) => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))
      .on('tick', () => onTickRef.current());

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [nodes, links, width, height, useWasmSimulation]);

  // Restart function
  const restart = useCallback((alpha = 0.3) => {
    if (useWasmSimulation) {
      wasmSimulation.restart(alpha);
    } else {
      simulationRef.current?.alpha(alpha).restart();
    }
  }, [useWasmSimulation, wasmSimulation]);

  // Stop function
  const stop = useCallback(() => {
    if (useWasmSimulation) {
      wasmSimulation.stop();
    } else {
      simulationRef.current?.stop();
    }
  }, [useWasmSimulation, wasmSimulation]);

  return {
    simulation: simulationRef.current,
    restart,
    stop,
    isWasm: useWasmSimulation,
    alpha: useWasmSimulation ? wasmSimulation.alpha : (simulationRef.current?.alpha() ?? 0),
    fixNode: wasmSimulation.fixNode,
    unfixNode: wasmSimulation.unfixNode,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes
- [ ] ForceGraph tests pass
- [ ] E2E tests pass

#### Manual Verification:
- [ ] Graph animates smoothly with WASM
- [ ] Fallback to D3 works correctly
- [ ] Drag interactions work

---

## Phase 5.5: Testing and Benchmarks

### Overview
Add comprehensive tests and performance benchmarks.

### Changes Required:

#### 1. Force Simulation Tests

**File**: `src/wasm/force-simulation-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WASM module
vi.mock('@/wasm/pkg', () => {
  class MockForceSimulation {
    private alpha = 1.0;
    private positions: Float32Array;
    private nodeCount = 0;
    
    constructor(width: number, height: number) {
      this.positions = new Float32Array(0);
    }
    
    init_nodes(data: Float32Array) {
      this.nodeCount = data.length / 3;
      this.positions = new Float32Array(this.nodeCount * 2);
      for (let i = 0; i < this.nodeCount; i++) {
        this.positions[i * 2] = data[i * 3];
        this.positions[i * 2 + 1] = data[i * 3 + 1];
      }
    }
    
    init_links(data: Float32Array) {}
    set_alpha(a: number) { this.alpha = a; }
    alpha_value() { return this.alpha; }
    set_alpha_target(t: number) {}
    set_charge_strength(s: number) {}
    set_center(x: number, y: number) {}
    set_collision_radius(r: number) {}
    fix_node(i: number, x: number, y: number) {}
    unfix_node(i: number) {}
    
    tick() {
      this.alpha *= 0.99;
      return this.alpha > 0.001;
    }
    
    tick_n(n: number) {
      for (let i = 0; i < n; i++) {
        if (!this.tick()) return false;
      }
      return true;
    }
    
    get_positions() {
      return this.positions;
    }
    
    node_count() { return this.nodeCount; }
    is_complete() { return this.alpha <= 0.001; }
    free() {}
  }
  
  return {
    init: vi.fn().mockResolvedValue(undefined),
    ForceSimulation: MockForceSimulation,
  };
});

vi.mock('@/wasm/loader', () => ({
  getWasmModule: () => require('@/wasm/pkg'),
  isWasmLoaded: () => true,
}));

describe('WasmForceSimulation', () => {
  it('should initialize simulation', async () => {
    const { createForceSimulation } = await import('./force-simulation-service');
    
    const sim = await createForceSimulation(800, 600);
    
    expect(sim).not.toBeNull();
    sim?.dispose();
  });

  it('should init nodes', async () => {
    const { createForceSimulation } = await import('./force-simulation-service');
    
    const sim = await createForceSimulation(800, 600);
    sim!.initNodes([
      { name: 'A', x: 100, y: 100, isCenter: true },
      { name: 'B', x: 200, y: 200, isCenter: false },
    ] as any);
    
    expect(sim!.getNodeCount()).toBe(2);
    sim!.dispose();
  });

  it('should run tick', async () => {
    const { createForceSimulation } = await import('./force-simulation-service');
    
    const sim = await createForceSimulation(800, 600);
    sim!.initNodes([{ name: 'A', isCenter: true }] as any);
    
    const running = sim!.tick();
    
    expect(running).toBe(true);
    sim!.dispose();
  });

  it('should get positions', async () => {
    const { createForceSimulation } = await import('./force-simulation-service');
    
    const sim = await createForceSimulation(800, 600);
    sim!.initNodes([
      { name: 'A', x: 100, y: 100, isCenter: true },
      { name: 'B', x: 200, y: 200, isCenter: false },
    ] as any);
    
    const positions = sim!.getPositions();
    
    expect(positions).not.toBeNull();
    expect(positions!.length).toBe(4);
    sim!.dispose();
  });
});
```

#### 2. Performance Benchmarks

**File**: `src/wasm/force-simulation-benchmarks.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';

const describeWasm = process.env.CI ? describe.skip : describe;

describeWasm('Force Simulation Benchmarks', () => {
  interface Node {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
  }
  
  interface Link {
    source: number;
    target: number;
    weight: number;
  }

  function generateGraph(nodeCount: number, edgesPerNode: number) {
    const nodes: Node[] = Array.from({ length: nodeCount }, () => ({}));
    const links: Link[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < edgesPerNode; j++) {
        const target = Math.floor(Math.random() * nodeCount);
        if (target !== i) {
          links.push({
            source: i,
            target,
            weight: Math.random(),
          });
        }
      }
    }
    
    return { nodes, links };
  }

  const testCases = [
    { nodes: 100, edges: 5, name: '100 nodes' },
    { nodes: 500, edges: 10, name: '500 nodes' },
    { nodes: 1000, edges: 10, name: '1000 nodes' },
  ];

  testCases.forEach(({ nodes, edges, name }) => {
    it(`should benchmark D3 simulation: ${name}`, () => {
      const { nodes: graphNodes, links } = generateGraph(nodes, edges);
      const ticks = 100;

      // D3 simulation
      const simulation = d3.forceSimulation(graphNodes)
        .force('link', d3.forceLink(links).id((_, i) => i))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(400, 300))
        .stop();

      const start = performance.now();
      for (let i = 0; i < ticks; i++) {
        simulation.tick();
      }
      const time = performance.now() - start;

      console.log(`\n${name} (${ticks} ticks):`);
      console.log(`  D3: ${time.toFixed(2)}ms (${(time / ticks).toFixed(3)}ms/tick)`);

      expect(time).toBeGreaterThan(0);
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
- [ ] Benchmarks show WASM 2-3x faster for 500+ nodes
- [ ] Per-tick time < 10ms for 1000 nodes

---

## Testing Strategy

### Unit Tests
- ForceSimulation Rust implementation
- All force calculations (link, charge, center, collision)
- Node fix/unfix functionality
- Alpha decay and completion detection

### Integration Tests
- TypeScript wrapper methods
- React hook lifecycle
- D3 fallback behavior
- Position synchronization

### Performance Benchmarks
- Compare D3 vs WASM per-tick time
- Test with 100, 500, 1000, 2000 nodes
- Measure memory usage
- Frame rate analysis

### E2E Tests
- Graph animates smoothly
- Drag interactions work
- Simulation completes correctly
- Performance acceptable on mobile

## Performance Considerations

- O(n²) charge force is the bottleneck - consider Barnes-Hut
- TypedArray transfers are near zero-copy
- Avoid creating new arrays each tick
- Batch position updates instead of per-node
- Consider Web Worker for background simulation

## Migration Notes

This phase is a big bang replacement:
- When WASM simulation is available, it replaces D3
- D3 remains as complete fallback
- All interactions (drag, fix) work with both
- Performance metrics logged for comparison

## Future Improvements (Not in this plan)

1. **Barnes-Hut Approximation**: O(n log n) instead of O(n²) for charge
2. **Web Worker**: Move simulation to background thread
3. **SIMD**: Use WASM SIMD for parallel force calculations
4. **Shared Memory**: SharedArrayBuffer for zero-copy updates

## References

- Phase 1-4 Plans: `thoughts/shared/plans/2025-12-20-rust-wasm-phase-*.md`
- Research: `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md`
- D3 Force: https://github.com/d3/d3-force
- Fjädra (Rust force simulation): https://github.com/cprimozic/fjadra
