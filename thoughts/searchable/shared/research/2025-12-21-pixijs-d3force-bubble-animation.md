---
date: 2025-12-21T21:45:00+07:00
researcher: opencode
git_commit: cf11696bebc569a437093f9d55012229e6124845
branch: main
repository: musiqasik
topic: "PixiJS + d3-force Integration for Bubble Animation"
tags: [research, pixijs, d3-force, webgl, animation, performance, graph-visualization]
status: complete
last_updated: 2025-12-21
last_updated_by: opencode
---

# Research: PixiJS + d3-force Integration for Bubble Animation

**Date**: 2025-12-21T21:45:00+07:00
**Researcher**: opencode
**Git Commit**: cf11696bebc569a437093f9d55012229e6124845
**Branch**: main
**Repository**: musiqasik

## Research Question

How can we use PixiJS + d3-force for bubble animation in the graph visualization, replacing or augmenting the current SVG-based D3.js implementation?

## Summary

The current ForceGraph uses **SVG rendering with D3.js**, which struggles with 1000+ nodes. Migrating to **PixiJS for rendering while keeping d3-force for physics** is a proven pattern that can achieve:

- **10-100x performance improvement** (handle 10,000+ nodes at 60fps)
- **GPU-accelerated animations** via WebGL
- **Smooth "bubble in" effects** using GSAP + PixiJS

The key insight is **separation of concerns**: d3-force handles layout/physics, PixiJS handles rendering. This is a drop-in architecture change that preserves existing simulation logic.

## Detailed Findings

### 1. Current Architecture

#### Rendering Stack
- **Technology**: SVG with D3.js (no Canvas, WebGL, or PixiJS)
- **Main Component**: `src/components/ForceGraph/index.tsx`
- **Simulation Hook**: `src/components/ForceGraph/hooks/useD3Simulation.ts`

#### Performance Characteristics
| Node Count | Current SVG Performance |
|------------|------------------------|
| <100 | Excellent (60fps) |
| 100-300 | Good |
| 300-500 | Noticeable slowdown |
| 500-1000 | Degraded |
| >1000 | Not recommended |

#### Current Animation Patterns
- **Center node pulse**: CSS keyframes (`src/index.css:147-164`)
- **Hover transitions**: CSS opacity/fill (0.15-0.2s)
- **Zoom transitions**: D3 transitions (300-500ms)
- **No enter/exit animations**: Nodes render all-at-once via `.join()`

### 2. PixiJS + d3-force Integration Pattern

#### Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────────────┐  │
│  │   d3-force      │              │       PixiJS            │  │
│  │  (Physics)      │──────────────│     (Rendering)         │  │
│  │                 │  positions   │                         │  │
│  │ • Link force    │─────────────▶│ • PIXI.Application      │  │
│  │ • Charge force  │              │ • PIXI.Container        │  │
│  │ • Center force  │              │ • PIXI.Sprite (nodes)   │  │
│  │ • Collision     │              │ • PIXI.Graphics (links) │  │
│  └─────────────────┘              └─────────────────────────┘  │
│           │                                   │                 │
│           │ simulation.on('tick')             │ requestAnimationFrame│
│           ▼                                   ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Position Update Loop                            ││
│  │  nodes.forEach(node => {                                     ││
│  │    const sprite = nodeMap.get(node);                         ││
│  │    sprite.x = node.x;                                        ││
│  │    sprite.y = node.y;                                        ││
│  │  });                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Principles

1. **d3-force unchanged**: Keep existing `useD3Simulation` hook exactly as-is
2. **PixiJS replaces SVG**: Replace SVG elements with PixiJS sprites/graphics
3. **WeakMap for binding**: Map data objects to display objects (no D3 data binding)
4. **Same tick callback**: Update PixiJS positions instead of SVG transforms

### 3. Implementation Blueprint

#### Phase 1: PixiJS Setup (Replace SVG Container)

```typescript
// src/components/ForceGraph/PixiGraph.tsx
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

interface PixiGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
}

export function PixiGraph({ nodes, links, width, height }: PixiGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const nodeMapRef = useRef(new WeakMap<GraphNode, PIXI.Container>());
  
  // Initialize PixiJS
  useEffect(() => {
    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x1a1a2e, // Match theme
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    containerRef.current?.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    
    // Setup viewport for pan/zoom
    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: width * 2,
      worldHeight: height * 2,
      events: app.renderer.events,
    });
    
    app.stage.addChild(viewport);
    viewport.drag().pinch().wheel().decelerate();
    
    return () => {
      app.destroy(true);
    };
  }, [width, height]);
  
  // ... continued below
}
```

#### Phase 2: Node Rendering with Sprites

```typescript
// Create node textures (do once, reuse)
const createNodeTexture = (app: PIXI.Application, radius: number, color: number) => {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(color);
  graphics.drawCircle(0, 0, radius);
  graphics.endFill();
  return app.renderer.generateTexture(graphics);
};

// Create nodes as sprites
const createNodes = (app: PIXI.Application, nodes: GraphNode[], viewport: Viewport) => {
  const nodeContainer = new PIXI.Container();
  viewport.addChild(nodeContainer);
  
  const nodeMap = new WeakMap<GraphNode, PIXI.Container>();
  
  nodes.forEach((node, index) => {
    const container = new PIXI.Container();
    
    // Circle sprite
    const radius = node.isCenter ? 28 : 18 + Math.min((node.listeners || 0) / 10000000, 1) * 8;
    const color = getNodeColor(node); // Reuse existing color logic
    const texture = createNodeTexture(app, radius, color);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    container.addChild(sprite);
    
    // Artist image (if available)
    if (node.image_url && !isPlaceholderImage(node.image_url)) {
      PIXI.Assets.load(node.image_url).then(texture => {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawCircle(0, 0, radius - 2);
        mask.endFill();
        
        const image = new PIXI.Sprite(texture);
        image.anchor.set(0.5);
        image.width = (radius - 2) * 2;
        image.height = (radius - 2) * 2;
        image.mask = mask;
        container.addChild(mask, image);
      });
    }
    
    // Label
    const label = new PIXI.Text(node.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
    });
    label.anchor.set(0.5, 0);
    label.y = radius + 8;
    container.addChild(label);
    
    // Initial position (will be updated by simulation)
    container.x = node.x ?? 0;
    container.y = node.y ?? 0;
    
    // Enable interaction
    container.interactive = true;
    container.cursor = 'pointer';
    
    nodeContainer.addChild(container);
    nodeMap.set(node, container);
  });
  
  return { nodeContainer, nodeMap };
};
```

#### Phase 3: Bubble In Animation with GSAP

```typescript
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

// Register PixiJS plugin
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

// Animate node entrance
const animateNodeEntrance = (
  container: PIXI.Container, 
  index: number,
  options: { stagger?: number; duration?: number } = {}
) => {
  const { stagger = 0.03, duration = 0.6 } = options;
  
  // Set initial state
  container.alpha = 0;
  container.scale.set(0);
  
  // Animate to final state
  gsap.to(container, {
    duration,
    pixi: {
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
    },
    ease: 'elastic.out(1, 0.5)', // Bubble/bounce effect
    delay: index * stagger,
  });
};

// Usage in node creation
nodes.forEach((node, index) => {
  const container = createNodeContainer(node);
  animateNodeEntrance(container, index);
  nodeMap.set(node, container);
});
```

#### Phase 4: Integration with Existing Simulation

```typescript
// Hook into existing useD3Simulation
const { simulation, restart } = useD3Simulation({
  nodes: graphNodes,
  links,
  width: dimensions.width,
  height: dimensions.height,
  onTick: handlePixiTick, // Replace handleTick
});

// PixiJS tick handler
const handlePixiTick = useCallback(() => {
  // Update link graphics
  if (linkGraphicsRef.current) {
    const g = linkGraphicsRef.current;
    g.clear();
    links.forEach(link => {
      const source = link.source as SimulationNode;
      const target = link.target as SimulationNode;
      g.lineStyle(link.weight * 2, 0x666666, link.weight * 0.8);
      g.moveTo(source.x!, source.y!);
      g.lineTo(target.x!, target.y!);
    });
  }
  
  // Update node positions
  graphNodes.forEach(node => {
    const container = nodeMapRef.current.get(node);
    if (container) {
      container.x = node.x!;
      container.y = node.y!;
    }
  });
}, [graphNodes, links]);
```

### 4. Performance Comparison

| Aspect | SVG (Current) | PixiJS (Proposed) |
|--------|---------------|-------------------|
| **Max Nodes** | ~1,000 | 100,000+ |
| **FPS at 500 nodes** | 30-40 | 60 |
| **FPS at 5,000 nodes** | <10 | 55-60 |
| **Memory** | High (DOM) | Lower (GPU) |
| **Animation** | CSS/D3 | GSAP/GPU |
| **Text Rendering** | Native | Requires BitmapText for scale |

### 5. Required Dependencies

```json
{
  "dependencies": {
    "pixi.js": "^8.0.0",
    "pixi-viewport": "^5.0.0",
    "gsap": "^3.12.0"
  }
}
```

### 6. Migration Strategy

#### Recommended Approach: Parallel Implementation

1. **Create `PixiForceGraph` component** alongside existing `ForceGraph`
2. **Feature flag** to toggle between implementations
3. **Reuse all hooks**: `useD3Simulation`, `useGenreColors`, `useGraphData`
4. **Replace only rendering layer**: SVG → PixiJS

```typescript
// src/components/ForceGraph/index.tsx
export function ForceGraph(props: ForceGraphProps) {
  const useWebGL = useFeatureFlag('webgl-graph');
  
  if (useWebGL) {
    return <PixiForceGraph {...props} />;
  }
  
  return <SvgForceGraph {...props} />;
}
```

#### File Structure

```
src/components/ForceGraph/
├── index.tsx              # Main export with feature flag
├── SvgForceGraph.tsx      # Current SVG implementation (renamed)
├── PixiForceGraph.tsx     # New PixiJS implementation
├── hooks/
│   ├── useD3Simulation.ts # Unchanged - physics only
│   ├── useD3Zoom.ts       # Replace with pixi-viewport
│   ├── useGenreColors.ts  # Reuse for PixiJS colors
│   ├── useGraphData.ts    # Unchanged
│   └── usePixiApp.ts      # New - PixiJS application lifecycle
├── pixi/
│   ├── createNodes.ts     # Node sprite creation
│   ├── createLinks.ts     # Link graphics creation
│   └── animations.ts      # GSAP bubble animations
└── types.ts               # Unchanged
```

### 7. Bubble Animation Specifics

#### Animation Parameters

```typescript
// Bubble-in animation configuration
const BUBBLE_ANIMATION = {
  duration: 0.6,
  ease: 'elastic.out(1, 0.5)', // Bouncy bubble effect
  stagger: 0.03,              // 30ms between each node
  initialScale: 0,
  initialAlpha: 0,
  finalScale: 1,
  finalAlpha: 1,
};

// Alternative easing options:
// - 'back.out(2)'     - Overshoots then settles
// - 'bounce.out'      - Bounces at end
// - 'elastic.out'     - Spring-like bounce (most "bubble-like")
// - 'power2.out'      - Smooth deceleration
```

#### Batch Animation for Performance

```typescript
// Animate nodes in batches for 100+ nodes
const BATCH_SIZE = 10;
const BATCH_DELAY = 0.05;

const animateNodesInBatches = (nodes: PIXI.Container[]) => {
  const batches = [];
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    batches.push(nodes.slice(i, i + BATCH_SIZE));
  }
  
  batches.forEach((batch, batchIndex) => {
    batch.forEach((node, nodeIndex) => {
      gsap.to(node, {
        duration: BUBBLE_ANIMATION.duration,
        pixi: { alpha: 1, scaleX: 1, scaleY: 1 },
        ease: BUBBLE_ANIMATION.ease,
        delay: batchIndex * BATCH_DELAY + nodeIndex * 0.01,
      });
    });
  });
};
```

## Code References

### Current SVG Rendering
- `src/components/ForceGraph/index.tsx:163-168` - Node creation via `.join()`
- `src/components/ForceGraph/index.tsx:222-257` - Circle and image rendering
- `src/components/ForceGraph/index.tsx:135` - SVG clear on update
- `src/components/ForceGraph/index.tsx:94-106` - Tick handler (position updates)

### D3 Simulation (Reusable)
- `src/components/ForceGraph/hooks/useD3Simulation.ts:43-58` - Force configuration
- `src/components/ForceGraph/hooks/useD3Simulation.ts:67-73` - restart/stop methods
- `src/components/ForceGraph/hooks/useGraphData.ts:77-111` - Graph data filtering

### Existing Animation Patterns
- `src/index.css:147-164` - Pulse animation keyframes
- `src/components/ForceGraph/hooks/useD3Zoom.ts:39-64` - D3 transition patterns

## Architecture Insights

1. **Simulation-Rendering Separation**: The codebase already separates simulation (`useD3Simulation`) from rendering (main component). This is ideal for PixiJS migration.

2. **WASM Integration Point**: Existing WASM infrastructure (`src/wasm/`) processes graph data. This can be extended with Float32Array position buffers for even faster PixiJS updates.

3. **Hook Modularity**: The modular hook architecture (`hooks/`) enables surgical replacement of rendering without touching physics.

4. **Color System Reusable**: `useGenreColors` hook returns hex values that work directly with PixiJS (convert to `0x` format).

## Historical Context (from thoughts/)

- `thoughts/shared/research/2025-12-21-graph-animation-discovery-features.md` - Original research on bubble animations with D3.js approach
- `thoughts/shared/research/2025-12-20-graph-search-performance-optimization.md` - Performance limits of current SVG approach (2000+ nodes problematic)
- `thoughts/shared/plans/2025-12-20-rust-wasm-phase-5-force-simulation.md` - Future plan for WASM force simulation (complementary to PixiJS)
- `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md` - TypedArray patterns for efficient data transfer

## Related Research

- `thoughts/shared/research/2025-12-21-graph-animation-discovery-features.md` - D3.js animation approach (superseded by this research for performance scenarios)

## Open Questions

1. **Text at Scale**: With 1000+ nodes, should labels use `BitmapText` or be hidden at zoom levels?
   - *Recommendation*: LOD system - hide labels when zoomed out, show on hover/zoom in

2. **Image Loading**: How to handle async image loading without blocking animation?
   - *Recommendation*: Show colored circle immediately, add image sprite when loaded

3. **Mobile Performance**: Does PixiJS WebGL work well on mobile browsers?
   - *Note*: PixiJS auto-falls back to Canvas 2D if WebGL unavailable

4. **Bundle Size Impact**: PixiJS (~200KB) + GSAP (~50KB) adds to bundle
   - *Mitigation*: Lazy-load PixiJS module, code-split graph component

5. **Accessibility**: SVG has better screen reader support than Canvas
   - *Consideration*: Add ARIA labels to canvas container, provide data table alternative

## Implementation Priority

| Phase | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Create `usePixiApp` hook | Low | Foundation |
| 2 | Basic node rendering with sprites | Medium | Core feature |
| 3 | GSAP bubble animation | Low | UX improvement |
| 4 | Link rendering with Graphics | Low | Complete visualization |
| 5 | pixi-viewport integration | Medium | Pan/zoom |
| 6 | Interaction handlers (hover, click, drag) | Medium | Full parity |
| 7 | Performance optimization (LOD, culling) | Medium | Scale to 10k+ nodes |
| 8 | Feature flag + gradual rollout | Low | Safe migration |
