# Component Refactoring Implementation Plan

## Overview

Split large components (ForceGraph 368 lines, MapView 172 lines) into focused modules, extract reusable hooks, and fix the window global anti-pattern. This improves maintainability and reduces cognitive load.

## Current State Analysis

### ForceGraph.tsx (368 lines, 9 responsibilities)
Located at `src/components/ForceGraph.tsx`

**Current responsibilities mixed together:**
1. Graph data filtering (lines 34-49)
2. D3 simulation setup (lines 109-123)
3. Node rendering (lines 136-180)
4. Image rendering with clipping (lines 183-213)
5. Label rendering (lines 216-224)
6. Tooltip management (lines 232-260)
7. Zoom control (lines 79-87, 290-309)
8. Window method exposure (lines 312-345) - **anti-pattern**
9. Dimension management (lines 52-63)

### MapView.tsx (172 lines, 11 concerns)
Located at `src/pages/MapView.tsx`

**Mixed concerns:**
1. Route parameter handling (line 14)
2. Toast management (line 16)
3. Graph state management (lines 19-23)
4. API calls via hook (line 17)
5. Error handling effect (lines 45-53)
6. Similar artist computation (lines 72-90) - **O(n²) every render**
7. Navigation handlers (lines 55-69)

### Window Global Anti-Pattern
- ForceGraph exposes `__graphZoomIn`, `__graphZoomOut`, `__graphReset` on window
- MapView reads these through type-unsafe window access
- Problems: breaks in SSR, multiple instances conflict, violates React data flow

## Desired End State

```
src/components/ForceGraph/
├── index.tsx              # Main component (~100 lines)
├── hooks/
│   ├── useElementDimensions.ts
│   ├── useD3Zoom.ts
│   ├── useForceSimulation.ts
│   └── useGraphData.ts
├── GraphTooltip.tsx
└── types.ts

src/pages/MapView.tsx      # Simplified (~80 lines)
src/hooks/
├── useArtistGraph.ts      # Graph loading + state
└── useSimilarArtists.ts   # Memoized computation
```

- ForceGraph uses `useImperativeHandle` instead of window globals
- All expensive computations memoized
- Single responsibility per module

## What We're NOT Doing

- Changing D3.js visualization logic
- Modifying the graph appearance
- Adding new features
- Changing routing structure

---

## Phase 1: Extract ForceGraph Hooks

### Overview
Extract dimension tracking, zoom control, and data filtering into reusable hooks.

### Changes Required:

#### 1. Create useElementDimensions hook

**File**: `src/components/ForceGraph/hooks/useElementDimensions.ts` (new)

```typescript
import { useState, useEffect, RefObject } from 'react';

export interface Dimensions {
  width: number;
  height: number;
}

export function useElementDimensions(
  containerRef: RefObject<HTMLElement>,
  defaultDimensions: Dimensions = { width: 800, height: 600 }
): Dimensions {
  const [dimensions, setDimensions] = useState<Dimensions>(defaultDimensions);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  return dimensions;
}
```

#### 2. Create useGraphData hook

**File**: `src/components/ForceGraph/hooks/useGraphData.ts` (new)

```typescript
import { useMemo } from 'react';
import type { Artist, SimilarityEdge, GraphNode, GraphLink } from '@/types/artist';

interface UseGraphDataProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold: number;
}

interface UseGraphDataResult {
  filteredNodes: GraphNode[];
  graphLinks: GraphLink[];
  nodeMap: Map<string, GraphNode>;
}

export function useGraphData({
  nodes,
  edges,
  centerArtist,
  threshold,
}: UseGraphDataProps): UseGraphDataResult {
  return useMemo(() => {
    // Filter edges by threshold
    const filteredEdges = edges.filter((e) => e.weight >= threshold);

    // Get connected node names
    const connectedNodes = new Set<string>();
    filteredEdges.forEach((e) => {
      connectedNodes.add(e.source.toLowerCase());
      connectedNodes.add(e.target.toLowerCase());
    });

    // Filter nodes to only include connected ones (or center)
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

    // Create node map for link resolution
    const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

    // Create graph links with resolved node references
    const graphLinks: GraphLink[] = filteredEdges
      .map((edge) => {
        const source = nodeMap.get(edge.source.toLowerCase());
        const target = nodeMap.get(edge.target.toLowerCase());
        if (source && target) {
          return { source, target, weight: edge.weight } as GraphLink;
        }
        return null;
      })
      .filter((link): link is GraphLink => link !== null);

    return { filteredNodes, graphLinks, nodeMap };
  }, [nodes, edges, centerArtist, threshold]);
}
```

#### 3. Create useD3Zoom hook

**File**: `src/components/ForceGraph/hooks/useD3Zoom.ts` (new)

```typescript
import { useRef, useCallback, useEffect, RefObject } from 'react';
import * as d3 from 'd3';

interface UseD3ZoomProps {
  svgRef: RefObject<SVGSVGElement>;
  scaleExtent?: [number, number];
  onZoom?: (transform: d3.ZoomTransform) => void;
}

interface UseD3ZoomResult {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  applyZoom: (g: d3.Selection<SVGGElement, unknown, null, undefined>) => void;
}

export function useD3Zoom({
  svgRef,
  scaleExtent = [0.2, 4],
  onZoom,
}: UseD3ZoomProps): UseD3ZoomResult {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const applyZoom = useCallback(
    (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      if (!svgRef.current) return;

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent(scaleExtent)
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
          onZoom?.(event.transform);
        });

      d3.select(svgRef.current).call(zoom);
      zoomRef.current = zoom;
    },
    [svgRef, scaleExtent, onZoom]
  );

  const zoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.4);
    }
  }, [svgRef]);

  const zoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, [svgRef]);

  const reset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, [svgRef]);

  return { zoomIn, zoomOut, reset, applyZoom };
}
```

#### 4. Create hooks index

**File**: `src/components/ForceGraph/hooks/index.ts` (new)

```typescript
export { useElementDimensions } from './useElementDimensions';
export { useGraphData } from './useGraphData';
export { useD3Zoom } from './useD3Zoom';
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] None yet - hooks not integrated

**Implementation Note**: After completing this phase, proceed to Phase 2.

---

## Phase 2: Replace Window Globals with useImperativeHandle

### Overview
Create a proper React ref-based API for zoom controls instead of window globals.

### Changes Required:

#### 1. Create ForceGraph types

**File**: `src/components/ForceGraph/types.ts` (new)

```typescript
import type { Artist, SimilarityEdge } from '@/types/artist';

export interface ForceGraphProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold: number;
  showLabels: boolean;
  onNodeClick: (artist: Artist) => void;
  className?: string;
}

export interface ForceGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}
```

#### 2. Refactor ForceGraph to use forwardRef

**File**: `src/components/ForceGraph/index.tsx` (new - replaces old ForceGraph.tsx)

```typescript
import { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import * as d3 from 'd3';
import { cn, isPlaceholderImage, formatNumber } from '@/lib/utils';
import { useElementDimensions, useGraphData, useD3Zoom } from './hooks';
import type { ForceGraphProps, ForceGraphHandle } from './types';
import type { GraphNode, GraphLink } from '@/types/artist';

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(
    { nodes, edges, centerArtist, threshold, showLabels, onNodeClick, className },
    ref
  ) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

    const dimensions = useElementDimensions(containerRef);
    const { filteredNodes, graphLinks } = useGraphData({
      nodes,
      edges,
      centerArtist,
      threshold,
    });
    const { zoomIn, zoomOut, reset, applyZoom } = useD3Zoom({ svgRef });

    // Expose zoom methods via ref
    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      reset,
    }), [zoomIn, zoomOut, reset]);

    // Create and update the force simulation
    useEffect(() => {
      if (!svgRef.current || filteredNodes.length === 0) return;

      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      // Clear previous content
      svg.selectAll('*').remove();

      // Create container group for zoom
      const g = svg.append('g').attr('class', 'graph-container');
      applyZoom(g);

      // Create simulation
      const simulation = d3
        .forceSimulation<GraphNode>(filteredNodes)
        .force(
          'link',
          d3
            .forceLink<GraphNode, GraphLink>(graphLinks)
            .id((d) => d.name)
            .distance((d) => 100 + (1 - d.weight) * 100)
            .strength((d) => d.weight * 0.5)
        )
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

      simulationRef.current = simulation;

      // Draw links
      const link = g
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(graphLinks)
        .join('line')
        .attr('stroke', 'hsl(var(--graph-edge))')
        .attr('stroke-opacity', (d) => 0.2 + d.weight * 0.6)
        .attr('stroke-width', (d) => 1 + d.weight * 2);

      // Draw nodes
      const node = g
        .append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(filteredNodes)
        .join('g')
        .attr('class', 'graph-node')
        .style('cursor', 'pointer')
        .call(
          d3
            .drag<SVGGElement, GraphNode>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      // Node circles
      node
        .append('circle')
        .attr('r', (d) => (d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8))
        .attr('fill', (d) => (d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'))
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 3)
        .style('transition', 'fill 0.2s ease-out')
        .on('mouseenter', function () {
          d3.select(this).attr('fill', 'hsl(var(--graph-node-hover))');
        })
        .on('mouseleave', function (event, d) {
          d3.select(this).attr(
            'fill',
            d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'
          );
        });

      // Node images (skip placeholders)
      node.each(function (d) {
        if (!isPlaceholderImage(d.image_url) && d.image_url) {
          const nodeG = d3.select(this);
          const radius = d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8;

          const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
          svg
            .append('defs')
            .append('clipPath')
            .attr('id', clipId)
            .append('circle')
            .attr('r', radius - 2);

          nodeG
            .insert('image', 'circle')
            .attr('xlink:href', d.image_url)
            .attr('x', -(radius - 2))
            .attr('y', -(radius - 2))
            .attr('width', (radius - 2) * 2)
            .attr('height', (radius - 2) * 2)
            .attr('clip-path', `url(#${clipId})`)
            .style('pointer-events', 'none');
        }
      });

      // Node labels
      node
        .append('text')
        .text((d) => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => (d.isCenter ? 45 : 35))
        .attr('class', 'fill-foreground text-xs font-medium')
        .style('pointer-events', 'none')
        .style('opacity', showLabels ? 1 : 0)
        .style('transition', 'opacity 0.2s ease-out');

      // Node click handler
      node.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

      // Tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'graph-tooltip')
        .style('opacity', 0)
        .style('display', 'none');

      node
        .on('mouseenter', (event, d) => {
          tooltip
            .style('display', 'block')
            .style('opacity', 1)
            .html(
              `
            <div class="font-semibold">${d.name}</div>
            ${d.listeners ? `<div class="text-sm text-muted-foreground">${formatNumber(d.listeners, 'listeners')}</div>` : ''}
            ${d.tags && d.tags.length > 0 ? `<div class="text-xs text-muted-foreground mt-1">${d.tags.slice(0, 3).join(', ')}</div>` : ''}
          `
            )
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`);
        })
        .on('mouseleave', () => {
          tooltip.style('opacity', 0).style('display', 'none');
        });

      // Update positions on tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as GraphNode).x!)
          .attr('y1', (d) => (d.source as GraphNode).y!)
          .attr('x2', (d) => (d.target as GraphNode).x!)
          .attr('y2', (d) => (d.target as GraphNode).y!);

        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

      // Cleanup
      return () => {
        simulation.stop();
        tooltip.remove();
        simulationRef.current = null;
      };
    }, [filteredNodes, graphLinks, centerArtist, threshold, dimensions, onNodeClick, showLabels, applyZoom]);

    // Update labels visibility
    useEffect(() => {
      if (!svgRef.current) return;
      d3.select(svgRef.current)
        .selectAll('.nodes text')
        .style('opacity', showLabels ? 1 : 0);
    }, [showLabels]);

    if (filteredNodes.length === 0) {
      return (
        <div
          className={cn('flex h-full items-center justify-center text-muted-foreground', className)}
        >
          <p>Search for an artist to explore their similarity map</p>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={cn('h-full w-full', className)}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="bg-background"
        />
      </div>
    );
  }
);

// Re-export types
export type { ForceGraphProps, ForceGraphHandle } from './types';
```

#### 3. Update MapView to use ref

**File**: `src/pages/MapView.tsx`
**Changes**: Use ref instead of window globals

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { ArtistPanel } from '@/components/ArtistPanel';
import { GraphControls } from '@/components/GraphControls';
import { ArtistSearch } from '@/components/ArtistSearch';
import { useLastFm } from '@/hooks/useLastFm';
import { Artist, GraphData } from '@/types/artist';
import { useToast } from '@/hooks/use-toast';

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();
  const graphRef = useRef<ForceGraphHandle>(null);

  // ... rest of state ...

  return (
    <div className="flex h-screen bg-background">
      {/* ... */}
      
      <ForceGraph
        ref={graphRef}
        nodes={graphData?.nodes || []}
        edges={graphData?.edges || []}
        centerArtist={graphData?.center?.name || null}
        threshold={threshold}
        showLabels={showLabels}
        onNodeClick={handleNodeClick}
      />
      
      {/* ... */}
      
      <GraphControls
        depth={depth}
        onDepthChange={handleDepthChange}
        threshold={threshold}
        onThresholdChange={setThreshold}
        showLabels={showLabels}
        onShowLabelsChange={setShowLabels}
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onReset={() => graphRef.current?.reset()}
        isLoading={isLoading}
      />
      
      {/* ... */}
    </div>
  );
}
```

#### 4. Delete old ForceGraph.tsx

**File to delete**: `src/components/ForceGraph.tsx`

#### 5. Remove unused props from ForceGraph

The old component had `onZoomIn`, `onZoomOut`, `onReset` props that were never used. These are now removed from the new implementation.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Graph displays correctly
- [ ] Zoom in button works
- [ ] Zoom out button works
- [ ] Reset button works
- [ ] Mouse wheel zoom works
- [ ] Drag to pan works

**Implementation Note**: After completing this phase and all verification passes, pause here for confirmation before proceeding.

---

## Phase 3: Extract MapView Hooks

### Overview
Extract graph loading, state management, and similar artist computation into focused hooks.

### Changes Required:

#### 1. Create useSimilarArtists hook

**File**: `src/hooks/useSimilarArtists.ts` (new)

```typescript
import { useMemo } from 'react';
import type { Artist, GraphData, SimilarityEdge } from '@/types/artist';

interface SimilarArtist {
  name: string;
  weight: number;
}

export function useSimilarArtists(
  selectedArtist: Artist | null,
  graphData: GraphData | null
): SimilarArtist[] {
  return useMemo(() => {
    if (!selectedArtist || !graphData) return [];

    const selectedName = selectedArtist.name.toLowerCase();

    // Find all edges connected to selected artist
    const connectedEdges = graphData.edges.filter(
      (e) =>
        e.source.toLowerCase() === selectedName ||
        e.target.toLowerCase() === selectedName
    );

    // Map to similar artists (the other end of each edge)
    const similarMap = new Map<string, number>();
    
    for (const edge of connectedEdges) {
      const otherName =
        edge.source.toLowerCase() === selectedName ? edge.target : edge.source;
      const normalizedName = otherName.toLowerCase();
      
      // Keep highest weight if duplicate
      const existing = similarMap.get(normalizedName);
      if (!existing || edge.weight > existing) {
        similarMap.set(normalizedName, edge.weight);
      }
    }

    // Convert to array and sort by weight
    return Array.from(similarMap.entries())
      .map(([name, weight]) => {
        // Find original casing from edges
        const originalEdge = connectedEdges.find(
          (e) =>
            e.source.toLowerCase() === name || e.target.toLowerCase() === name
        );
        const originalName =
          originalEdge?.source.toLowerCase() === name
            ? originalEdge.source
            : originalEdge?.target || name;
        return { name: originalName, weight };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [selectedArtist, graphData]);
}
```

#### 2. Create useArtistGraph hook

**File**: `src/hooks/useArtistGraph.ts` (new)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useLastFm } from './useLastFm';
import type { Artist, GraphData } from '@/types/artist';

interface UseArtistGraphResult {
  graphData: GraphData | null;
  selectedArtist: Artist | null;
  isLoading: boolean;
  error: string | null;
  setSelectedArtist: (artist: Artist | null) => void;
  reloadGraph: (artistName: string, depth: number) => Promise<void>;
}

export function useArtistGraph(
  artistName: string | undefined,
  depth: number
): UseArtistGraphResult {
  const { getGraph, isLoading, error } = useLastFm();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const loadGraph = useCallback(
    async (name: string, graphDepth: number) => {
      const data = await getGraph(name, graphDepth);
      if (data) {
        setGraphData(data);
        setSelectedArtist(data.center);
      }
    },
    [getGraph]
  );

  // Load initial data when artistName or depth changes
  useEffect(() => {
    if (artistName) {
      loadGraph(decodeURIComponent(artistName), depth);
    }
  }, [artistName, depth, loadGraph]);

  const reloadGraph = useCallback(
    async (name: string, newDepth: number) => {
      await loadGraph(name, newDepth);
    },
    [loadGraph]
  );

  return {
    graphData,
    selectedArtist,
    isLoading,
    error,
    setSelectedArtist,
    reloadGraph,
  };
}
```

#### 3. Refactor MapView to use new hooks

**File**: `src/pages/MapView.tsx`
**Changes**: Use extracted hooks

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { ArtistPanel } from '@/components/ArtistPanel';
import { GraphControls } from '@/components/GraphControls';
import { ArtistSearch } from '@/components/ArtistSearch';
import { useArtistGraph } from '@/hooks/useArtistGraph';
import { useSimilarArtists } from '@/hooks/useSimilarArtists';
import { useToast } from '@/hooks/use-toast';
import type { Artist } from '@/types/artist';

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const graphRef = useRef<ForceGraphHandle>(null);

  // Graph controls state
  const [depth, setDepth] = useState(1);
  const [threshold, setThreshold] = useState(0);
  const [showLabels, setShowLabels] = useState(true);

  // Graph data from hook
  const {
    graphData,
    selectedArtist,
    isLoading,
    error,
    setSelectedArtist,
  } = useArtistGraph(artistName, depth);

  // Computed similar artists (memoized)
  const similarArtists = useSimilarArtists(selectedArtist, graphData);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleNodeClick = useCallback((artist: Artist) => {
    setSelectedArtist(artist);
  }, [setSelectedArtist]);

  const handleRecenter = (name: string) => {
    navigate(`/artist/${encodeURIComponent(name)}`);
  };

  const handleSearchSelect = (artist: Artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Graph Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center gap-4 bg-gradient-to-b from-background via-background/80 to-transparent p-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Music2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">MusiqasiQ</h1>
              <p className="text-xs text-muted-foreground">Artist Similarity Map</p>
            </div>
          </div>
          <div className="ml-auto max-w-md flex-1">
            <ArtistSearch onSelect={handleSearchSelect} placeholder="Search another artist..." />
          </div>
        </header>

        {/* Graph */}
        <div className="flex-1 pt-20">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading similarity graph...</p>
              </div>
            </div>
          ) : (
            <ForceGraph
              ref={graphRef}
              nodes={graphData?.nodes || []}
              edges={graphData?.edges || []}
              centerArtist={graphData?.center?.name || null}
              threshold={threshold}
              showLabels={showLabels}
              onNodeClick={handleNodeClick}
            />
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-4 w-64">
          <GraphControls
            depth={depth}
            onDepthChange={setDepth}
            threshold={threshold}
            onThresholdChange={setThreshold}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onReset={() => graphRef.current?.reset()}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Side Panel */}
      <aside className="flex w-80 flex-col border-l border-border bg-card">
        <ArtistPanel
          artist={selectedArtist}
          similarArtists={similarArtists}
          onArtistClick={handleRecenter}
        />
      </aside>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Graph loads when navigating to /artist/:name
- [ ] Clicking node updates side panel
- [ ] Similar artists list is correct
- [ ] Depth change reloads graph
- [ ] Error toast appears on failure

---

## Phase 4: Add Component Tests

### Overview
Add unit tests for the new hooks and components.

### Changes Required:

#### 1. Test useSimilarArtists hook

**File**: `src/hooks/useSimilarArtists.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSimilarArtists } from './useSimilarArtists';
import type { Artist, GraphData } from '@/types/artist';

describe('useSimilarArtists', () => {
  const mockArtist: Artist = { name: 'Radiohead' };
  
  const mockGraphData: GraphData = {
    nodes: [
      { name: 'Radiohead' },
      { name: 'Muse' },
      { name: 'Coldplay' },
    ],
    edges: [
      { source: 'Radiohead', target: 'Muse', weight: 0.9 },
      { source: 'Radiohead', target: 'Coldplay', weight: 0.7 },
      { source: 'Muse', target: 'Coldplay', weight: 0.5 },
    ],
    center: { name: 'Radiohead' },
  };

  it('returns empty array when no artist selected', () => {
    const { result } = renderHook(() => useSimilarArtists(null, mockGraphData));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when no graph data', () => {
    const { result } = renderHook(() => useSimilarArtists(mockArtist, null));
    expect(result.current).toEqual([]);
  });

  it('returns similar artists sorted by weight', () => {
    const { result } = renderHook(() => useSimilarArtists(mockArtist, mockGraphData));
    
    expect(result.current).toEqual([
      { name: 'Muse', weight: 0.9 },
      { name: 'Coldplay', weight: 0.7 },
    ]);
  });

  it('handles case-insensitive matching', () => {
    const artist = { name: 'RADIOHEAD' };
    const { result } = renderHook(() => useSimilarArtists(artist, mockGraphData));
    
    expect(result.current.length).toBe(2);
  });

  it('deduplicates edges', () => {
    const graphWithDupes: GraphData = {
      ...mockGraphData,
      edges: [
        { source: 'Radiohead', target: 'Muse', weight: 0.9 },
        { source: 'Muse', target: 'Radiohead', weight: 0.85 }, // Duplicate in reverse
      ],
    };
    
    const { result } = renderHook(() => useSimilarArtists(mockArtist, graphWithDupes));
    
    // Should only have Muse once, with higher weight
    expect(result.current).toEqual([
      { name: 'Muse', weight: 0.9 },
    ]);
  });
});
```

#### 2. Test useGraphData hook

**File**: `src/components/ForceGraph/hooks/useGraphData.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGraphData } from './useGraphData';
import type { Artist, SimilarityEdge } from '@/types/artist';

describe('useGraphData', () => {
  const mockNodes: Artist[] = [
    { name: 'Radiohead' },
    { name: 'Muse' },
    { name: 'Coldplay' },
    { name: 'Disconnected' }, // No edges
  ];

  const mockEdges: SimilarityEdge[] = [
    { source: 'Radiohead', target: 'Muse', weight: 0.9 },
    { source: 'Radiohead', target: 'Coldplay', weight: 0.7 },
  ];

  it('filters nodes without edges', () => {
    const { result } = renderHook(() =>
      useGraphData({
        nodes: mockNodes,
        edges: mockEdges,
        centerArtist: 'Radiohead',
        threshold: 0,
      })
    );

    expect(result.current.filteredNodes).toHaveLength(3);
    expect(result.current.filteredNodes.find((n) => n.name === 'Disconnected')).toBeUndefined();
  });

  it('includes center artist even without edges', () => {
    const { result } = renderHook(() =>
      useGraphData({
        nodes: mockNodes,
        edges: [],
        centerArtist: 'Disconnected',
        threshold: 0,
      })
    );

    expect(result.current.filteredNodes).toHaveLength(1);
    expect(result.current.filteredNodes[0].name).toBe('Disconnected');
    expect(result.current.filteredNodes[0].isCenter).toBe(true);
  });

  it('filters edges by threshold', () => {
    const { result } = renderHook(() =>
      useGraphData({
        nodes: mockNodes,
        edges: mockEdges,
        centerArtist: 'Radiohead',
        threshold: 0.8,
      })
    );

    // Only Muse edge (0.9) passes threshold 0.8
    expect(result.current.graphLinks).toHaveLength(1);
    expect((result.current.graphLinks[0].target as any).name).toBe('Muse');
  });

  it('marks center artist correctly', () => {
    const { result } = renderHook(() =>
      useGraphData({
        nodes: mockNodes,
        edges: mockEdges,
        centerArtist: 'Radiohead',
        threshold: 0,
      })
    );

    const centerNode = result.current.filteredNodes.find((n) => n.name === 'Radiohead');
    expect(centerNode?.isCenter).toBe(true);

    const otherNode = result.current.filteredNodes.find((n) => n.name === 'Muse');
    expect(otherNode?.isCenter).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test` passes all new tests
- [ ] `npm run test:coverage` shows increased coverage

#### Manual Verification:
- [ ] None required for unit tests

---

## Testing Strategy

### Unit Tests
- Hook tests using `@testing-library/react-hooks`
- Pure function tests for data transformation
- Mock D3 for component tests if needed

### Integration Tests
- Test ForceGraph renders with mock data
- Test zoom controls work via ref

### Manual Testing
- Full user flow through the application
- Test with various graph sizes

---

## Performance Considerations

### Improvements Made
- `useMemo` for expensive `getSimilarArtists` computation
- `useCallback` for stable function references
- Separated data filtering from rendering

### Remaining Opportunities
- Consider splitting the monolithic D3 useEffect further
- Add virtualization for very large graphs
- Lazy load artist images

---

## References

- ForceGraph analysis: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md:43-106`
- MapView analysis: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md:71-88`
- Window global anti-pattern: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md:89-106`
