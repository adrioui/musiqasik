# Comprehensive Codebase Cleanup Implementation Plan

## Overview

Consolidated implementation plan that addresses all 47 improvement opportunities from the research analysis. This plan properly sequences dependency cleanup, component refactoring, and Effect integration while fixing critical bugs (race conditions) and removing technical debt.

**Consolidates and supersedes:**
- `2025-12-19-dependency-cleanup.md`
- `2025-12-19-component-refactoring.md`
- `2025-12-19-effect-runtime-integration.md`

## Current State Analysis

Based on research at `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md`:

### Critical Issues
- **Race conditions** in ArtistSearch (`src/components/ArtistSearch.tsx:27-41`) - stale results can overwrite newer ones
- **~2.2MB unused dependencies** - React Query, TanStack router, 40+ shadcn/ui components
- **550+ lines of duplicated code** between Effect services and Workers API
- **Window global anti-pattern** - ForceGraph exposes zoom via `window.__graphZoomIn`

### Architectural Problems
- Effect library adopted but never executed - services built but frontend bypasses them
- React Query installed but unused - QueryClientProvider wraps app with no queries
- Two duplicate Artist type definitions, two toast systems, duplicated utility functions

### Key Discoveries
- ForceGraph.tsx: 368 lines with 9 responsibilities (needs splitting)
- MapView.tsx: 172 lines with O(n²) computation on every render (needs memoization)
- TypeScript strictNullChecks disabled (`tsconfig.json:14`) - type safety hole
- Only ~15% test coverage, critical paths untested

## Desired End State

After completion:
- **Zero race conditions** - ArtistSearch uses AbortController
- **Clean dependencies** - Only used packages remain (~500KB+ reduction)
- **Single source of truth** - One Artist type, one toast system, shared utilities
- **Effect fully wired** - Frontend uses Effect services, Workers API deleted
- **Modular components** - ForceGraph split into focused hooks, proper React patterns
- **Proper React patterns** - useImperativeHandle instead of window globals
- **Memoized computations** - No O(n²) on every render

### Verification Criteria
- `npm run build` succeeds with no warnings
- `npm run typecheck` passes
- `npm run test` passes with >50% coverage on critical paths (hooks, services, BFS algorithm)
- `npm run lint` passes
- Manual testing: graph loads, search works, zoom controls function

## What We're NOT Doing

- Enabling TypeScript strictNullChecks (separate effort, requires codebase-wide fixes)
- Adding tests for all 40+ unused UI components before removal (trust they're unused)
- Optimizing the BFS graph building algorithm (just porting it to Effect)
- Changing the graph visualization appearance
- Modifying the database schema

## Implementation Approach

**Execution order is critical** - phases have dependencies:

```
Phase 1 (Critical Fixes)
    ↓
Phase 2 (Dependency Cleanup) 
    ↓ creates utilities needed by Phase 3
Phase 3 (Component Refactoring)
    ↓ creates clean component structure for Phase 4
Phase 4 (Effect Integration)
    ↓ deletes Workers API
Phase 5 (Verification & Cleanup)
```

Total estimated time: **8-10 days** (Phase 4 Effect integration is most complex: 3-4 days)

---

## Phase 1: Critical Bug Fixes

### Overview
Fix the race condition in ArtistSearch before any refactoring. This is a data integrity bug that should be fixed first.

### Changes Required:

#### 1. Add AbortController to ArtistSearch

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Fix race condition in search debounce

```typescript
// Replace lines 27-41 with:
useEffect(() => {
  const abortController = new AbortController();
  
  const handler = setTimeout(async () => {
    if (query.trim().length >= 2) {
      try {
        const searchResults = await searchArtists(query, abortController.signal);
        if (!abortController.signal.aborted) {
          setResults(searchResults);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search failed:', error);
        }
      }
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, 300);

  return () => {
    clearTimeout(handler);
    abortController.abort();
  };
}, [query, searchArtists]);
```

#### 2. Update useLastFm hook to support AbortSignal

**File**: `src/hooks/useLastFm.ts`
**Changes**: Add signal parameter to searchArtists

```typescript
// Update searchArtists function signature and implementation
const searchArtists = useCallback(
  async (query: string, signal?: AbortSignal): Promise<Artist[]> => {
    if (!query.trim()) return [];

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(query)}`,
        { signal }
      );
      // ... rest of implementation
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err; // Re-throw abort errors
      }
      // ... handle other errors
    }
  },
  []
);
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [x] `npm run test` passes

#### Manual Verification:
- [x] Type "Radio" then quickly "Radiohead" - only Radiohead results appear
- [x] No console errors about aborted requests
- [x] Search still works normally with regular typing

**Implementation Note**: After completing this phase and all verification passes, proceed to Phase 2.

---

## Phase 2: Dependency Cleanup & Utility Consolidation

### Overview
Remove unused dependencies, consolidate duplicate code, create shared utilities. This phase creates the utilities needed by Phase 3.

### Changes Required:

#### 1. Add shared utility functions

**File**: `src/lib/utils.ts`
**Changes**: Add formatNumber and isPlaceholderImage

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with K/M suffix for display
 */
export function formatNumber(num?: number | null, suffix?: string): string {
  if (num === undefined || num === null) return 'N/A';
  
  let value: string;
  if (num >= 1_000_000) {
    value = `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    value = `${Math.round(num / 1_000)}K`;
  } else {
    value = num.toString();
  }
  
  return suffix ? `${value} ${suffix}` : value;
}

/**
 * Checks if an image URL is a Last.fm placeholder
 */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) return true;
  return (
    url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
    url.includes('star') ||
    url === '' ||
    url.endsWith('/noimage/')
  );
}
```

#### 2. Update components to use shared utilities

**File**: `src/components/ArtistPanel.tsx`
**Changes**: Import and use formatNumber

```typescript
// Add import
import { formatNumber } from '@/lib/utils';

// Remove local formatNumber function (lines 36-45)
// Update usage: formatNumber(artist.listeners, 'listeners')
```

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Import and use formatNumber

```typescript
// Add import
import { cn, formatNumber } from '@/lib/utils';

// Remove local formatListeners function (lines 85-94)
// Update usage at line 142: {formatNumber(artist.listeners, 'listeners')}
```

**File**: `src/services/lastfm.ts`
**Changes**: Import isPlaceholderImage from utils

```typescript
// Replace local isPlaceholderImage with import
import { isPlaceholderImage } from '@/lib/utils';

// Delete local function at lines 40-48
```

#### 3. Remove React Query and Sonner

**File**: `src/App.tsx`
**Changes**: Remove unused QueryClientProvider and Sonner

```typescript
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import MapView from './pages/MapView';
import NotFound from './pages/NotFound';

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/artist/:artistName" element={<MapView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
```

#### 4. Consolidate type definitions

**Files to update imports**:
- `src/services/lastfm.ts` - Change `@/integrations/surrealdb/types` to `@/types/artist`
- `src/services/database.ts` - Change `@/integrations/surrealdb/types` to `@/types/artist`
- `src/services/index.ts` - Change `@/integrations/surrealdb/types` to `@/types/artist`

**File to delete**: `src/integrations/surrealdb/types.ts`

#### 5. Remove unused npm dependencies

**File**: `package.json`
**Changes**: Remove from dependencies

```json
// Remove these lines from dependencies:
"@hookform/resolvers": "^3.10.0",
"@tanstack/react-query": "^5.83.0",
"@tanstack/react-router": "^1.140.0",
"@tanstack/react-start": "^1.140.0",
"cmdk": "^1.1.1",
"date-fns": "^3.6.0",
"embla-carousel-react": "^8.6.0",
"input-otp": "^1.4.2",
"next-themes": "^0.3.0",
"react-day-picker": "^8.10.1",
"react-hook-form": "^7.61.1",
"react-resizable-panels": "^2.1.9",
"recharts": "^2.15.4",
"sonner": "^1.7.4",
"vaul": "^0.9.9",
"zod": "^3.25.76"
```

Remove from devDependencies:
```json
"puppeteer": "^24.33.1"
```

#### 8. Delete Puppeteer integration tests (replaced by Playwright)

**File to delete**: `src/test/integration.test.ts`

**Rationale**: Playwright E2E tests in `e2e/` provide better coverage. The Puppeteer tests are redundant.

#### 6. Delete unused UI components

**Files to delete**:
- `src/components/ui/calendar.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/use-toast.ts` (re-export wrapper - actual hook is in `src/hooks/use-toast.ts`)

#### 7. Add tests for new utilities

**File**: `src/lib/utils.test.ts`
**Changes**: Add comprehensive tests

```typescript
import { describe, it, expect } from 'vitest';
import { cn, formatNumber, isPlaceholderImage } from './utils';

// ... existing cn tests ...

describe('formatNumber', () => {
  it('formats millions with M suffix', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10.0M');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1500)).toBe('2K');
    expect(formatNumber(999000)).toBe('999K');
  });

  it('returns raw number for small values', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(0)).toBe('0');
  });

  it('returns N/A for null or undefined', () => {
    expect(formatNumber(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
  });

  it('appends suffix when provided', () => {
    expect(formatNumber(1500000, 'listeners')).toBe('1.5M listeners');
    expect(formatNumber(null, 'listeners')).toBe('N/A');
  });
});

describe('isPlaceholderImage', () => {
  it('returns true for null or undefined', () => {
    expect(isPlaceholderImage(null)).toBe(true);
    expect(isPlaceholderImage(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isPlaceholderImage('')).toBe(true);
  });

  it('returns true for Last.fm placeholder hash', () => {
    expect(isPlaceholderImage('https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png')).toBe(true);
  });

  it('returns true for star placeholder', () => {
    expect(isPlaceholderImage('https://example.com/star.png')).toBe(true);
  });

  it('returns false for valid image URLs', () => {
    expect(isPlaceholderImage('https://example.com/artist.jpg')).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `npm install` completes without errors
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [x] `npm run test` passes with new utility tests
- [x] `npm run lint` passes

#### Manual Verification:
- [x] App loads at http://localhost:8080
- [x] Search returns results with formatted listener counts
- [x] Toast notifications still appear on errors
- [x] Artist images display correctly (non-placeholder)

**Implementation Note**: After completing this phase and all verification passes, proceed to Phase 3.

---

## Phase 3: Component Refactoring

### Overview
Split large components (ForceGraph, MapView), extract hooks, and replace window globals with proper React patterns. Uses utilities created in Phase 2.

**Key architectural improvement**: The current ForceGraph has a single monolithic `useEffect` (lines 66-279) with 7 dependencies including `threshold` and `showLabels`. Any change to these values tears down and recreates the entire D3 simulation, causing visual stuttering and performance issues. This phase separates:
1. **Simulation creation** (`useD3Simulation`) - Only recreates when node/link data identity changes
2. **Visual updates** (`useGraphData`) - Filters nodes/edges without recreating simulation
3. **Zoom controls** (`useD3Zoom`) - Independent zoom behavior

### Changes Required:

#### 1. Create ForceGraph hooks directory structure

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

**File**: `src/components/ForceGraph/hooks/useGraphData.ts` (new)

```typescript
import { useMemo } from 'react';
import type { Artist, SimilarityEdge } from '@/types/artist';

export interface GraphNode extends Artist {
  isCenter?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  weight: number;
}

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
    const filteredEdges = edges.filter((e) => e.weight >= threshold);

    const connectedNodes = new Set<string>();
    filteredEdges.forEach((e) => {
      connectedNodes.add(e.source.toLowerCase());
      connectedNodes.add(e.target.toLowerCase());
    });

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

    const nodeMap = new Map(filteredNodes.map((n) => [n.name.toLowerCase(), n]));

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

**File**: `src/components/ForceGraph/hooks/useD3Zoom.ts` (new)

```typescript
import { useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface UseD3ZoomProps {
  svgRef: React.RefObject<SVGSVGElement>;
  scaleExtent?: [number, number];
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
        });

      d3.select(svgRef.current).call(zoom);
      zoomRef.current = zoom;
    },
    [svgRef, scaleExtent]
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

**File**: `src/components/ForceGraph/hooks/useD3Simulation.ts` (new)

This hook separates simulation creation from visual updates to prevent recreation on threshold/label changes:

```typescript
import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink } from './useGraphData';

interface UseD3SimulationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  onTick: () => void;
}

interface UseD3SimulationResult {
  simulation: d3.Simulation<GraphNode, GraphLink> | null;
  restart: () => void;
  stop: () => void;
}

export function useD3Simulation({
  nodes,
  links,
  width,
  height,
  onTick,
}: UseD3SimulationProps): UseD3SimulationResult {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Only recreate simulation when nodes/links identity changes (not threshold filtering)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.name)
          .distance((d) => 100 + (1 - d.weight) * 100)
          .strength((d) => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))
      .on('tick', onTick);

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]); // Note: onTick excluded to prevent restart on callback change

  const restart = useCallback(() => {
    simulationRef.current?.alpha(0.3).restart();
  }, []);

  const stop = useCallback(() => {
    simulationRef.current?.stop();
  }, []);

  return {
    simulation: simulationRef.current,
    restart,
    stop,
  };
}
```

**File**: `src/components/ForceGraph/hooks/index.ts` (new)

```typescript
export { useElementDimensions } from './useElementDimensions';
export { useGraphData, type GraphNode, type GraphLink } from './useGraphData';
export { useD3Zoom } from './useD3Zoom';
export { useD3Simulation } from './useD3Simulation';
```

#### 2. Create ForceGraph types

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

#### 3. Create new ForceGraph component with useImperativeHandle

**File**: `src/components/ForceGraph/index.tsx` (new)

This file will be a refactored version of the current ForceGraph.tsx (~250 lines instead of 368) that:
- Uses the extracted hooks
- Uses `forwardRef` and `useImperativeHandle` instead of window globals
- Imports utilities from `@/lib/utils`

The full implementation follows the pattern in the component-refactoring plan.

#### 4. Delete old ForceGraph.tsx

**File to delete**: `src/components/ForceGraph.tsx`

#### 5. Create MapView hooks

**File**: `src/hooks/useSimilarArtists.ts` (new)

```typescript
import { useMemo } from 'react';
import type { Artist, GraphData } from '@/types/artist';

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
    const similarMap = new Map<string, { name: string; weight: number }>();

    for (const edge of graphData.edges) {
      const isSource = edge.source.toLowerCase() === selectedName;
      const isTarget = edge.target.toLowerCase() === selectedName;
      
      if (isSource || isTarget) {
        const otherName = isSource ? edge.target : edge.source;
        const normalized = otherName.toLowerCase();
        const existing = similarMap.get(normalized);
        
        if (!existing || edge.weight > existing.weight) {
          similarMap.set(normalized, { name: otherName, weight: edge.weight });
        }
      }
    }

    return Array.from(similarMap.values())
      .sort((a, b) => b.weight - a.weight);
  }, [selectedArtist, graphData]);
}
```

#### 6. Update MapView to use new ForceGraph and hooks

**File**: `src/pages/MapView.tsx`
**Changes**: Use ref instead of window globals, use useSimilarArtists hook

```typescript
import { useRef } from 'react';
import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { useSimilarArtists } from '@/hooks/useSimilarArtists';

// Add ref
const graphRef = useRef<ForceGraphHandle>(null);

// Use hook for similar artists (memoized)
const similarArtists = useSimilarArtists(selectedArtist, graphData);

// Update GraphControls props
<GraphControls
  onZoomIn={() => graphRef.current?.zoomIn()}
  onZoomOut={() => graphRef.current?.zoomOut()}
  onReset={() => graphRef.current?.reset()}
  // ... other props
/>

// Update ForceGraph usage
<ForceGraph
  ref={graphRef}
  nodes={graphData?.nodes || []}
  // ... other props
/>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] `npm run test` passes

#### Manual Verification:
- [x] Graph displays correctly with nodes and edges
- [x] Zoom in button works
- [x] Zoom out button works
- [x] Reset button works
- [x] Mouse wheel zoom works
- [x] Drag to pan works
- [x] Clicking node updates side panel
- [x] Similar artists list shows in side panel

**Implementation Note**: After completing this phase and all verification passes, proceed to Phase 4.

---

## Phase 4: Effect Runtime Integration

### Overview
Wire up Effect services to frontend, create GraphService with BFS algorithm, delete Workers API. This removes ~550 lines of duplicated code.

### Changes Required:

#### 1. Update ConfigService for browser compatibility

**File**: `src/services/index.ts`
**Changes**: Use import.meta.env instead of process.env

```typescript
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
  surrealdbWsUrl: import.meta.env.VITE_SURREALDB_WS_URL || '',
  surrealdbHttpUrl: import.meta.env.VITE_SURREALDB_HTTP_URL || '',
  surrealdbNamespace: import.meta.env.VITE_SURREALDB_NAMESPACE || 'musiqasik',
  surrealdbDatabase: import.meta.env.VITE_SURREALDB_DATABASE || 'main',
  surrealdbUser: import.meta.env.VITE_SURREALDB_USER || '',
  surrealdbPass: import.meta.env.VITE_SURREALDB_PASS || '',
});
```

#### 2. Update vite-env.d.ts

**File**: `src/vite-env.d.ts`
**Changes**: Add env type declarations

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_SURREALDB_WS_URL: string;
  readonly VITE_SURREALDB_HTTP_URL: string;
  readonly VITE_SURREALDB_NAMESPACE: string;
  readonly VITE_SURREALDB_DATABASE: string;
  readonly VITE_SURREALDB_USER: string;
  readonly VITE_SURREALDB_PASS: string;
  readonly VITE_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

#### 3. Create GraphService with BFS algorithm

**File**: `src/services/graph.ts` (new)

```typescript
import { Context, Effect, Layer, pipe } from 'effect';
import type { AppError } from '@/lib/errors';
import { NetworkError, DatabaseError } from '@/lib/errors';
import { LastFmService, DatabaseService, ConfigService } from '@/services';
import type { Artist, GraphData } from '@/types/artist';

export class GraphService extends Context.Tag('GraphService')<
  GraphService,
  {
    buildGraph: (
      artistName: string,
      maxDepth: number
    ) => Effect.Effect<GraphData & { metrics?: { duration: number; nodeCount: number } }, AppError>;
  }
>() {}

// Concurrency limiter for parallel API calls
const parallelMapWithLimit = <T, U, E>(
  items: T[],
  mapper: (item: T) => Effect.Effect<U | null, E>,
  concurrency: number
): Effect.Effect<(U | null)[], E> => {
  // Process in batches
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

  return GraphService.of({
    buildGraph: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const startTime = Date.now();
        const visited = new Set<string>();
        const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];
        const nodes: Artist[] = [];
        const edges: Array<{ source: string; target: string; weight: number }> = [];
        let center: Artist | null = null;

        // Per-request cache
        const requestCache = new Map<string, Artist>();

        while (queue.length > 0) {
          const current = queue.shift()!;
          const normalizedName = current.name.toLowerCase();

          if (visited.has(normalizedName)) continue;
          visited.add(normalizedName);

          // Check cache first, then database
          let artist = requestCache.get(normalizedName);
          if (!artist) {
            artist = yield* db.getArtist(current.name);
          }

          if (!artist) {
            // Fetch from Last.fm
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

            // Get similar artists if not at max depth
            if (current.depth < maxDepth) {
              // Check for cached edges first
              const cachedEdges = yield* db.getCachedEdges(artist.id!);

              if (cachedEdges.length > 0) {
                // Use cached edges
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
                // Fetch from Last.fm
                const similar = yield* lastFm.getSimilarArtists(current.name);

                // Process all similar artists with concurrency limit
                const currentArtist = artist; // Capture for closure
                const currentDepth = current.depth;

                const results = yield* parallelMapWithLimit(
                  similar,
                  (sim) =>
                    Effect.gen(function* () {
                      // Get or create target artist
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
                    }).pipe(
                      Effect.catchAll(() => Effect.succeed(null))
                    ),
                  5 // Limit to 5 concurrent requests
                );

                // Collect edges to upsert
                const edgesToUpsert: Array<{
                  source_artist_id: string;
                  target_artist_id: string;
                  match_score: number;
                  depth: number;
                }> = [];

                // Process results
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

                // Batch upsert edges
                if (edgesToUpsert.length > 0) {
                  yield* db.upsertEdges(edgesToUpsert);
                }
              }
            }
          }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
          nodes,
          edges,
          center,
          metrics: {
            duration,
            nodeCount: nodes.length,
          },
        };
      }),
  });
});

export const GraphServiceLive = Layer.effect(GraphService, makeGraphService);
```

**File**: `src/services/index.ts` (update exports)
Add to existing exports:

```typescript
export { GraphService, GraphServiceLive } from './graph';
```

#### 4. Create Effect runtime hook

**File**: `src/hooks/useEffectRuntime.ts` (new)

```typescript
import { useCallback } from 'react';
import { Effect, Layer, Runtime } from 'effect';
// ... service imports

export function useEffectRuntime() {
  const runEffect = useCallback(
    async <A, E>(effect: Effect.Effect<A, E, Services>): Promise<A> => {
      // Runtime implementation
    },
    []
  );

  return { runEffect };
}
```

#### 5. Rewrite useLastFm to use Effect

**File**: `src/hooks/useLastFm.ts`
**Changes**: Complete rewrite to use Effect services instead of fetch

```typescript
import { useState, useCallback } from 'react';
import { Effect, Layer, Runtime, Cause, Exit } from 'effect';
import type { Artist, GraphData } from '@/types/artist';
import type { AppError } from '@/lib/errors';
import {
  LastFmService,
  LastFmServiceLive,
  DatabaseService,
  DatabaseServiceLive,
  GraphService,
  GraphServiceLive,
  ConfigService,
  ConfigLive,
} from '@/services';
import { SurrealClientLive } from '@/integrations/surrealdb/client';

// Compose all service layers
const MainLive = Layer.mergeAll(ConfigLive, SurrealClientLive).pipe(
  Layer.provideMerge(LastFmServiceLive),
  Layer.provideMerge(DatabaseServiceLive),
  Layer.provideMerge(GraphServiceLive)
);

// Create runtime once
const runtime = Runtime.defaultRuntime;

// Helper to run effects with our service layer
const runEffect = <A>(
  effect: Effect.Effect<A, AppError, LastFmService | DatabaseService | GraphService | ConfigService>
): Promise<A> => {
  const provided = Effect.provide(effect, MainLive);
  return Runtime.runPromise(runtime)(provided);
};

export function useLastFm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArtists = useCallback(
    async (query: string, signal?: AbortSignal): Promise<Artist[]> => {
      if (!query.trim()) return [];

      setIsLoading(true);
      setError(null);

      try {
        const effect = Effect.gen(function* () {
          const lastFm = yield* LastFmService;
          return yield* lastFm.searchArtists(query);
        });

        // Handle abort signal
        if (signal) {
          return await new Promise<Artist[]>((resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
            runEffect(effect).then(resolve).catch(reject);
          });
        }

        return await runEffect(effect);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getGraph = useCallback(
    async (artistName: string, depth: number = 1): Promise<GraphData | null> => {
      if (!artistName.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const effect = Effect.gen(function* () {
          const graph = yield* GraphService;
          return yield* graph.buildGraph(artistName, Math.min(depth, 3));
        });

        const result = await runEffect(effect);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch graph';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getArtist = useCallback(async (name: string): Promise<Artist | null> => {
    if (!name.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const effect = Effect.gen(function* () {
        const db = yield* DatabaseService;
        const lastFm = yield* LastFmService;

        // Try database first
        let artist = yield* db.getArtist(name);
        if (!artist) {
          // Fetch from Last.fm and cache
          const artistInfo = yield* lastFm.getArtistInfo(name);
          if (artistInfo) {
            artist = yield* db.upsertArtist(artistInfo);
          }
        }
        return artist;
      });

      return await runEffect(effect);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artist';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchArtists,
    getGraph,
    getArtist,
    isLoading,
    error,
  };
}
```

#### 6. Delete Workers API

**Files to delete**:
- `workers/api/index.ts`
- `workers/api/index.test.ts`
- `workers/api/wrangler.toml`
- `workers/` directory

#### 7. Update package.json

**File**: `package.json`
**Changes**: Remove worker scripts

```json
// Remove these lines:
"dev:worker": "wrangler dev workers/api/index.ts --local",
"deploy:worker": "wrangler deploy workers/api/index.ts"
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [x] `npm run test` passes
- [x] `npm run lint` passes
- [x] No references to `workers/` in codebase

#### Manual Verification:
- [x] Home page loads
- [x] Search returns results
- [x] Graph loads and displays nodes/edges
- [x] Node clicking works
- [x] Zoom controls work
- [x] Threshold slider filters edges
- [x] Navigation between pages works

**Implementation Note**: This is the most complex phase. After completion, do thorough manual testing before proceeding to Phase 5.

---

## Phase 5: Final Verification & Cleanup

### Overview
Final verification, additional test coverage, and documentation updates.

### Changes Required:

#### 1. Add hook tests

**File**: `src/hooks/useSimilarArtists.test.ts` (new)
**File**: `src/components/ForceGraph/hooks/useGraphData.test.ts` (new)

#### 2. Update AGENTS.md if needed

Verify documentation still accurate after refactoring.

#### 3. Run full test suite

```bash
npm run test:coverage
npm run test:e2e
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run test` passes (60 tests across 5 test files)
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds (chunk size warning, not error)
- [x] `npm run lint` passes (only warnings from shadcn/ui components)
- [x] AGENTS.md and CLAUDE.md updated to reflect current architecture

#### Manual Verification:
- [x] Complete user flow test: search → select → view graph → click node → navigate
- [x] Performance acceptable with large graphs (50+ nodes)
- [x] No console errors during normal usage

---

## Testing Strategy

### Unit Tests
- All new hooks tested with @testing-library/react
- Utility functions tested with vitest
- Mock D3 and Effect services for isolation

### BFS Algorithm Tests (Critical - `src/services/graph.test.ts`)

The BFS algorithm in GraphService is critical and must be tested for:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { GraphService, GraphServiceLive } from './graph';
import { LastFmService, DatabaseService, ConfigService, ConfigLive } from './index';

// Mock services
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
  getSimilarityGraph: vi.fn(),
};

const MockLastFmLive = Layer.succeed(LastFmService, mockLastFm);
const MockDbLive = Layer.succeed(DatabaseService, mockDb);

describe('GraphService.buildGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty artist name gracefully', async () => {
    // Test edge case
  });

  it('respects maxDepth limit to prevent infinite traversal', async () => {
    // Ensure BFS stops at maxDepth
    mockLastFm.getArtistInfo.mockReturnValue(Effect.succeed({ name: 'Artist', id: '1' }));
    mockLastFm.getSimilarArtists.mockReturnValue(
      Effect.succeed([{ name: 'Similar1', match: 0.9 }])
    );
    mockDb.getArtist.mockReturnValue(Effect.succeed(null));
    mockDb.upsertArtist.mockImplementation((a) => Effect.succeed({ ...a, id: 'id-' + a.name }));
    mockDb.getCachedEdges.mockReturnValue(Effect.succeed([]));
    mockDb.upsertEdges.mockReturnValue(Effect.succeed(undefined));

    // Run with depth 1 and verify only 2 levels traversed
  });

  it('handles circular references without infinite loop', async () => {
    // Artist A -> Artist B -> Artist A (cycle)
    // The visited set should prevent re-processing
  });

  it('handles artist not found from Last.fm', async () => {
    mockLastFm.getArtistInfo.mockReturnValue(Effect.succeed(null));
    mockDb.getArtist.mockReturnValue(Effect.succeed(null));

    // Should return empty graph, not throw
  });

  it('uses cached edges when available', async () => {
    const cachedArtist = { name: 'Cached', id: '1' };
    mockDb.getArtist.mockReturnValue(Effect.succeed(cachedArtist));
    mockDb.getCachedEdges.mockReturnValue(
      Effect.succeed([{ target: { name: 'Target', id: '2' }, match_score: 0.8 }])
    );

    // Should NOT call lastFm.getSimilarArtists
  });

  it('limits concurrent API calls to prevent rate limiting', async () => {
    // With 10 similar artists, should process in batches of 5
  });

  it('returns metrics with duration and node count', async () => {
    // Verify metrics object is populated
  });
});
```

### Integration Tests
- Test ForceGraph renders with mock data
- Test zoom controls via ref
- Test search with AbortController
- **Test Effect runtime integration in useLastFm**

### E2E Tests
- Existing Playwright tests in `e2e/` directory (replaces Puppeteer integration tests)
- Test full user flows

### Manual Testing Checklist
After each phase:
1. App loads without console errors
2. Search works and returns results
3. Graph displays correctly
4. All controls function
5. Navigation works

---

## Performance Considerations

### Bundle Size
- Removing unused dependencies saves ~500KB+
- Removing 8 UI components with their Radix deps saves ~200KB

### Runtime Performance
- useMemo in useSimilarArtists prevents O(n²) on every render
- useCallback for stable function references
- Separated D3 effects to prevent unnecessary recreations

### Network
- AbortController prevents wasted API calls
- Effect services maintain same caching strategy as Workers API

---

## Rollback Strategy

Each phase can be rolled back independently:

**Phase 1**: Revert ArtistSearch.tsx and useLastFm.ts changes
**Phase 2**: Restore deleted files, revert package.json, npm install
**Phase 3**: Restore old ForceGraph.tsx, revert MapView.tsx
**Phase 4**: Multi-step rollback required:
  1. Restore `workers/` directory from git: `git checkout HEAD -- workers/`
  2. Restore original `src/hooks/useLastFm.ts` (fetch-based version)
  3. Delete new files: `src/services/graph.ts`, `src/hooks/useEffectRuntime.ts`
  4. Restore worker scripts in `package.json`
  5. Update `src/services/index.ts` to remove GraphService export
  6. Run `npm install` to restore any removed dependencies
  7. Verify build passes: `npm run build`
**Phase 5**: No changes to roll back (just tests/docs)

**Git-based rollback**: Each phase should be committed separately. To rollback any phase:
```bash
git log --oneline  # Find the commit before the phase
git revert <commit-hash>  # Or git reset --hard <commit-hash> if not pushed
```

---

## References

- Research document: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md`
- Original plans (superseded):
  - `thoughts/shared/plans/2025-12-19-dependency-cleanup.md`
  - `thoughts/shared/plans/2025-12-19-component-refactoring.md`
  - `thoughts/shared/plans/2025-12-19-effect-runtime-integration.md`
- Previous research:
  - `thoughts/shared/research/2025-12-07-effect-integration-research.md`
  - `thoughts/shared/research/2025-12-09-software-engineering-best-practices-assessment.md`
