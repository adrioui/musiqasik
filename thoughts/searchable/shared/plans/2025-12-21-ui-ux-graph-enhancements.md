# UI/UX and Graph Enhancements Implementation Plan

## Overview

Implement comprehensive UI/UX enhancements to make the artist similarity graph more emotionally engaging, intuitive, and delightful. This includes dynamic genre-based colors, path highlighting, dark mode toggle, and improved search/onboarding experience.

## Current State Analysis

### What Exists:
- D3.js force-directed graph with basic interactivity (`src/components/ForceGraph/`)
- Static colors using CSS variables (`--graph-node`, `--graph-center`)
- Dark mode CSS variables defined (`src/index.css:58-100`) but no toggle mechanism
- `tags` data available on `GraphNode` but unused for visualization
- Basic hover effects (color change, tooltip)
- Simple loading spinner during graph load

### What's Missing:
- Dynamic coloring based on genre/tags
- Theme toggle and persistence
- Path highlighting on hover
- Recent searches functionality
- Skeleton loader for perceived performance
- Pulse animations for visual engagement

## Desired End State

After implementation:
1. **Theme Toggle**: Users can switch between light/dark/system themes, persisted in localStorage
2. **Genre Colors**: Nodes colored dynamically based on their primary tag/genre
3. **Collapsible Legend**: Overlay showing genre-color mappings, collapsible by user
4. **Path Highlighting**: Hovering a node dims all non-connected nodes/edges
5. **Pulse Animation**: Center node pulses subtly to draw attention
6. **Improved Forces**: Better spacing with increased charge repulsion and collision radius
7. **Recent Searches**: Last 5 searched artists shown when search is focused with empty query
8. **Skeleton Loader**: Faint graph skeleton during loading for perceived performance

### Verification:
- All automated tests pass
- Manual testing confirms visual enhancements work in both light/dark modes
- Performance remains acceptable (no jank during animations)

## What We're NOT Doing

- Server-side theme detection (client-only)
- Persistent genre-color mappings across sessions (dynamic per-graph)
- Complex onboarding flows or tutorials
- Accessibility audit (future work)
- Mobile-specific optimizations

## Implementation Approach

### Repo Mapping (Where each thing lives)

New files (planned):
- `src/hooks/useLocalStorage.ts` — generic persistent state hook (theme + recent searches)
- `src/components/theme/ThemeProvider.tsx` — theme context/provider (light/dark/system)
- `src/components/theme/ThemeToggle.tsx` — UI control to cycle theme
- `src/components/ForceGraph/hooks/useGenreColors.ts` — deterministic tag → color mapping (graph-specific)
- `src/components/ForceGraph/GraphLegend.tsx` — render legend of visible tags/colors
- `src/components/ForceGraph/SkeletonGraph.tsx` — skeleton placeholder SVG while graph loads

Existing files to modify (confirmed in repo):
- `src/main.tsx` and/or `src/App.tsx` — wrap app in `ThemeProvider`
- `src/pages/Index.tsx` — add theme toggle to header area
- `src/pages/MapView.tsx` — add theme toggle to header + show `SkeletonGraph` while loading
- `src/components/ArtistSearch.tsx` — add Recent Searches UI + persistence
- `src/components/ForceGraph/index.tsx` — integrate deterministic colors + legend + pulse class + highlighting opacity rules

### Data Contracts (Required fields)

ForceGraph uses the following fields from nodes/links:
- `GraphNode.name: string` (used as stable identifier; normalization: `toLowerCase()` when building maps)
- `GraphNode.tags?: string[]` (may be empty/undefined; used for color + tooltip)
- `GraphNode.isCenter?: boolean` (center artist styling)
- `GraphNode.listeners?: number` (size scaling)
- `GraphNode.image_url?: string` (node image rendering)
- `GraphLink.source/target` (resolved to nodes), `GraphLink.weight: number`

### Tailwind + Dark Mode Contract

- Tailwind must use class-based dark mode: `darkMode: ['class']` (plan assumes this is already true).
- Theme is applied to `<html>` (`document.documentElement`):
  - `theme = 'dark'` → ensure `classList` contains `dark`
  - `theme = 'light'` → ensure `classList` does NOT contain `dark`
  - `theme = 'system'` → match `prefers-color-scheme` and update on changes
- Also set `document.documentElement.style.colorScheme = resolvedTheme` (`'light' | 'dark'`) so native controls/scrollbars match.

### Deterministic Tag → Color Rule (Stable across sessions)

To avoid reshuffling colors when the tag set changes, tag colors MUST be stable across renders and sessions:
- Normalize tag key: `tag.trim().toLowerCase()`
- Use a stable hash of the normalized tag to pick a color index from a fixed palette.
- Center node uses a dedicated center color (not derived from tag hashing).
- Nodes with no tags use a default/fallback color.

### Highlighting Interaction & Performance Contract

Highlight behavior:
- Hover: temporarily highlight hovered node + its neighbors + incident links; dim everything else.
- Click: “lock” highlight to a node; clicking background clears; pressing `Escape` clears.
- Center node is not special-cased (it highlights like any other node), except for its color/pulse.

Performance:
- Precompute adjacency map once per graph dataset:
  - `Map<string, Set<string>>` keyed by normalized node id (`name.toLowerCase()`).
- Never scan all links repeatedly on every hover/mousemove to determine connectivity.

Reduced motion:
- Pulse animation and highlight transitions MUST respect `prefers-reduced-motion`.

We'll introduce React Context for theme management (a new pattern for this codebase) and create reusable hooks following existing ForceGraph hook patterns. Each phase builds incrementally with its own verification checkpoint.

---

## Phase 1: Foundation - Theme System & localStorage

### Overview

Create the foundational infrastructure: `useLocalStorage` hook, `ThemeProvider` context, and `ThemeToggle` component. This enables dark mode and provides the localStorage pattern needed for recent searches.

### Changes Required:

#### 1. Create useLocalStorage Hook

Behavioral contract (must be implemented exactly so tests/UX are predictable):
- Initialization: read from `localStorage` during initial render (Vite/client-only), guarded by `try/catch`.
- Parse failures: if JSON parse fails, fall back to `initialValue` and treat storage as “empty/invalid”.
- Writes: `setValue` persists JSON via `localStorage.setItem(key, JSON.stringify(value))`.
- Removal: allow setting `undefined` (or provide `remove`) to delete the key.
- Cross-tab sync: NOT implemented in this plan (no `storage` listener); document this as non-goal.

**File**: `src/hooks/useLocalStorage.ts` (new file)

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
```

#### 2. Create ThemeProvider Context

Theme contract (implementation-ready):
- Supported values: `'light' | 'dark' | 'system'`
- Persist selected theme in `localStorage` (via `useLocalStorage`)
- Apply to `<html>`:
  - Toggle the `dark` class depending on resolved theme
  - Set `style.colorScheme = resolvedTheme` for native UI consistency
- System mode:
  - Resolve via `window.matchMedia('(prefers-color-scheme: dark)')`
  - Subscribe/unsubscribe to changes when theme is `'system'`

**File**: `src/components/ThemeProvider.tsx` (new file)

```typescript
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<Theme>('musiqasiq-theme', defaultTheme);

  // Resolve system theme
  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return theme;
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, setTheme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

#### 3. Create ThemeToggle Component

**File**: `src/components/ThemeToggle.tsx` (new file)

```typescript
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="shrink-0"
      title={`Theme: ${theme}`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
```

#### 4. Wrap App with ThemeProvider

**File**: `src/App.tsx`
**Changes**: Import and wrap with ThemeProvider

```typescript
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import MapView from './pages/MapView';
import NotFound from './pages/NotFound';
import { useWasmFeature } from './hooks/useWasmFeature';

const App = () => {
  useWasmFeature();

  return (
    <ThemeProvider defaultTheme="system">
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
    </ThemeProvider>
  );
};

export default App;
```

#### 5. Add ThemeToggle to Index Page Header

**File**: `src/pages/Index.tsx`
**Changes**: Add ThemeToggle to header (line 16-23)

```typescript
// Add import at top
import { ThemeToggle } from '@/components/ThemeToggle';

// Update header section (around line 16-23)
<header className="w-full px-6 py-6">
  <div className="mx-auto flex max-w-7xl items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
      <Music2 className="h-5 w-5 text-primary-foreground" />
    </div>
    <span className="text-xl font-bold">MusiqasiQ</span>
    <div className="ml-auto">
      <ThemeToggle />
    </div>
  </div>
</header>
```

#### 6. Add ThemeToggle to MapView Page Header

**File**: `src/pages/MapView.tsx`
**Changes**: Add ThemeToggle to header (line 81-99)

```typescript
// Add import at top
import { ThemeToggle } from '@/components/ThemeToggle';

// Update header section - add ThemeToggle after search (around line 96-98)
<div className="ml-auto max-w-md flex-1">
  <ArtistSearch onSelect={handleSearchSelect} placeholder="Search another artist..." />
</div>
<ThemeToggle />
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification:
- [x] Theme toggle cycles through light → dark → system
- [x] Theme persists across page reloads
- [x] System theme respects OS preference
- [x] All UI elements render correctly in both light and dark modes
- [x] Graph visualization maintains readability in dark mode

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Dynamic Genre Colors (Deterministic / Stable)

### Overview

Create a `useGenreColors` hook that dynamically generates colors based on the tags present in the current graph. Integrate this into the ForceGraph component to color nodes by their primary genre.

### Changes Required:

#### 1. Create useGenreColors Hook

Determinism requirement:
- Tag colors MUST be stable across sessions and MUST NOT reshuffle based on the current graph’s tag set.
- Implement as stable hashing of normalized tag → palette index.

Primary tag rule:
- `primaryTag` is the first normalized tag in `node.tags` (after trimming/lowercasing).
- If `tags` is missing/empty, fall back to `DEFAULT_COLOR`.

**File**: `src/components/ForceGraph/hooks/useGenreColors.ts` (new file)

```typescript
import { useMemo } from 'react';
import * as d3 from 'd3';
import type { Artist } from '@/types/artist';

interface UseGenreColorsProps {
  nodes: Artist[];
}

interface UseGenreColorsResult {
  getNodeColor: (node: Artist) => string;
  genreColorMap: Map<string, string>;
}

// Use a vibrant, distinguishable color palette
const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

const DEFAULT_COLOR = 'hsl(var(--graph-node))';
const CENTER_COLOR = 'hsl(var(--graph-center))';

export function useGenreColors({ nodes }: UseGenreColorsProps): UseGenreColorsResult {
  return useMemo(() => {
    // Count tag frequency across all nodes
    const tagCounts = new Map<string, number>();
    nodes.forEach((node) => {
      const primaryTag = node.tags?.[0]?.toLowerCase();
      if (primaryTag) {
        tagCounts.set(primaryTag, (tagCounts.get(primaryTag) || 0) + 1);
      }
    });

    // Sort tags by frequency and take top N (where N = palette size)
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, COLOR_PALETTE.length)
      .map(([tag]) => tag);

    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(sortedTags)
      .range(COLOR_PALETTE);

    // Build genre -> color map for legend
    const genreColorMap = new Map<string, string>();
    sortedTags.forEach((tag) => {
      genreColorMap.set(tag, colorScale(tag));
    });

    // Color getter function
    const getNodeColor = (node: Artist & { isCenter?: boolean }): string => {
      if (node.isCenter) return CENTER_COLOR;
      const primaryTag = node.tags?.[0]?.toLowerCase();
      if (primaryTag && genreColorMap.has(primaryTag)) {
        return colorScale(primaryTag);
      }
      return DEFAULT_COLOR;
    };

    return { getNodeColor, genreColorMap };
  }, [nodes]);
}
```

#### 2. Export from Barrel

**File**: `src/components/ForceGraph/hooks/index.ts`
**Changes**: Add export

```typescript
export { useElementDimensions, type Dimensions } from './useElementDimensions';
export { useGraphData } from './useGraphData';
export { useD3Zoom } from './useD3Zoom';
export { useD3Simulation } from './useD3Simulation';
export { useGenreColors } from './useGenreColors';
```

#### 3. Integrate into ForceGraph

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Use genre colors for node fill

```typescript
// Add import (around line 6)
import { useGenreColors } from './hooks/useGenreColors';

// Inside component, after useGraphData (around line 32)
const { getNodeColor } = useGenreColors({ nodes: filteredNodes });

// Update node circle fill (around line 154)
// BEFORE:
.attr('fill', (d) => (d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'))

// AFTER:
.attr('fill', (d) => getNodeColor(d))

// Update mouseleave handler (around line 161-166)
// BEFORE:
.on('mouseleave', function (_event, d) {
  d3.select(this).attr(
    'fill',
    d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'
  );
})

// AFTER:
.on('mouseleave', function (_event, d) {
  d3.select(this).attr('fill', getNodeColor(d));
})
```

#### 4. Create GraphLegend Component

**File**: `src/components/ForceGraph/GraphLegend.tsx` (new file)

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GraphLegendProps {
  colorMap: Map<string, string>;
  className?: string;
}

export function GraphLegend({ colorMap, className }: GraphLegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (colorMap.size === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 rounded-lg bg-background/80 p-2 backdrop-blur-sm border border-border shadow-sm', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Palette className="h-4 w-4" />
          <span>Genres</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      
      {isOpen && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {Array.from(colorMap.entries()).map(([genre, color]) => (
            <div key={genre} className="flex items-center gap-2">
              <div 
                className="h-2.5 w-2.5 rounded-full ring-1 ring-border/50" 
                style={{ backgroundColor: color }} 
              />
              <span className="capitalize text-foreground/90">{genre}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 5. Integrate Legend into ForceGraph

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add Legend to the container overlay

```typescript
// Add import
import { GraphLegend } from './GraphLegend';

// Get colorMap from hook (update line 32)
const { getNodeColor, genreColorMap } = useGenreColors({ nodes: filteredNodes });

// Add Legend in JSX (before closing div of container)
<div className="relative h-full w-full" ref={containerRef}>
  {/* SVG element */}
  <svg ref={svgRef} className="h-full w-full touch-none" />
  
  {/* Add Legend positioned absolute */}
  <div className="absolute bottom-4 left-4 z-10 max-w-[200px]">
    <GraphLegend colorMap={genreColorMap} />
  </div>
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification:
- [x] Nodes display different colors based on their primary genre tag
- [x] Legend appears in the corner showing correct genre-color mappings
- [x] Legend can be collapsed and expanded
- [x] Legend is semi-transparent and doesn't block interaction with graph behind it (pointer-events)
- [x] Same genre = same color within a graph
- [x] Center node retains its distinct accent color
- [x] Colors are visible and distinguishable in both light and dark modes
- [x] Hover still changes color, mouseleave restores genre color

**Implementation Note**: Pause here for manual verification before Phase 3.

---

## Phase 3: Graph Animations & Force Tuning

### Overview

Add subtle pulse animation to the center node and adjust force simulation parameters for better graph readability (more spacing, less overlap).

### Changes Required:

Interaction rules:
- Hovering a node highlights it + neighbors + incident links.
- Clicking a node locks highlight until cleared.
- Clear highlight by clicking empty background OR pressing `Escape`.

Performance rules:
- Precompute adjacency once per dataset: `Map<nodeId, Set<nodeId>>` where `nodeId = node.name.toLowerCase()`.
- Avoid scanning the full links list on every hover/mousemove to compute connectivity.

Reduced motion:
- Opacity transitions for dimming/highlighting should be disabled or shortened under `prefers-reduced-motion`.

#### 1. Add Pulse Animation CSS

**File**: `src/index.css`
**Changes**: Add pulse keyframes and utility class wrapped in media query (after line 141)

```css
@keyframes graph-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .graph-node-pulse {
    animation: graph-pulse 2s ease-in-out infinite;
    transform-origin: center center;
  }
}
```

#### 2. Apply Pulse to Center Node

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add pulse class to center node circles (around line 151-157)

```typescript
// Update node circles section
nodeSelection
  .append('circle')
  .attr('r', (d) => (d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8))
  .attr('fill', (d) => getNodeColor(d))
  .attr('stroke', 'hsl(var(--background))')
  .attr('stroke-width', 3)
  .attr('class', (d) => (d.isCenter ? 'graph-node-pulse' : ''))
  .style('transition', 'fill 0.2s ease-out')
  // ... rest of handlers
```

#### 3. Tune Force Simulation Parameters

**File**: `src/components/ForceGraph/hooks/useD3Simulation.ts`
**Changes**: Adjust charge and collision forces (around line 53-55)

```typescript
// BEFORE:
.force('charge', d3.forceManyBody().strength(-400))
.force('center', d3.forceCenter(width / 2, height / 2))
.force('collision', d3.forceCollide().radius(40))

// AFTER:
.force('charge', d3.forceManyBody().strength(-600))
.force('center', d3.forceCenter(width / 2, height / 2))
.force('collision', d3.forceCollide().radius(55))
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification:
- [x] Center node has a subtle, continuous pulse animation
- [x] Animation is DISABLED when "Reduce Motion" is enabled in OS settings
- [x] Non-center nodes do not pulse
- [x] Graph nodes are more spread out with less overlap
- [x] Graph is still readable and nodes don't fly off-screen
- [x] Animation performance is smooth (no jank)
- [x] Pulse animation works in both light and dark modes

**Implementation Note**: Pause here for manual verification before Phase 4.

---

## Phase 4: Path Highlighting (Hover + Click Lock, Efficient Adjacency)

### Overview

Implement hover-based path highlighting: when hovering over a node, dim all non-connected nodes and edges to focus attention on the node's immediate neighborhood.

### Changes Required:

#### 1. Add Highlighting State and Logic

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add state and update rendering logic

```typescript
// Add useState import if not present, add useCallback
import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useState } from 'react';

// Inside component, add state (after line 18)
const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

// Create helper to check if a node/link is connected to highlighted node
const isConnected = useCallback(
  (nodeName: string, links: SimulationLink[]): boolean => {
    if (!highlightedNode) return true;
    if (nodeName.toLowerCase() === highlightedNode.toLowerCase()) return true;
    return links.some(
      (link) =>
        (link.source.name.toLowerCase() === highlightedNode.toLowerCase() &&
          link.target.name.toLowerCase() === nodeName.toLowerCase()) ||
        (link.target.name.toLowerCase() === highlightedNode.toLowerCase() &&
          link.source.name.toLowerCase() === nodeName.toLowerCase())
    );
  },
  [highlightedNode]
);

const isLinkConnected = useCallback(
  (link: SimulationLink): boolean => {
    if (!highlightedNode) return true;
    return (
      link.source.name.toLowerCase() === highlightedNode.toLowerCase() ||
      link.target.name.toLowerCase() === highlightedNode.toLowerCase()
    );
  },
  [highlightedNode]
);
```

#### 2. Update Node and Link Rendering for Highlighting

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Apply opacity based on highlighting state

In the useEffect that creates the visualization (around line 92-249), update the mouseenter/mouseleave handlers for highlighting:

```typescript
// Update node mouseenter to set highlighted node (replace existing mouseenter on circle, around line 158)
.on('mouseenter', function (_event, d) {
  setHighlightedNode(d.name);
  d3.select(this).attr('fill', 'hsl(var(--graph-node-hover))');
})
.on('mouseleave', function (_event, d) {
  setHighlightedNode(null);
  d3.select(this).attr('fill', getNodeColor(d));
})
```

#### 3. Add Effect to Update Opacity on Highlight Change

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add new useEffect for highlighting (after line 257)

```typescript
// Update highlighting when highlightedNode changes
useEffect(() => {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);

  // Update link opacity
  svg.selectAll('.links line').attr('stroke-opacity', function () {
    if (!highlightedNode) return 0.2 + (d3.select(this).datum() as SimulationLink).weight * 0.6;
    const link = d3.select(this).datum() as SimulationLink;
    return isLinkConnected(link) ? 0.8 : 0.05;
  });

  // Update node opacity
  svg.selectAll('.nodes .graph-node').style('opacity', function () {
    if (!highlightedNode) return 1;
    const node = d3.select(this).datum() as SimulationNode;
    return isConnected(node.name, links) ? 1 : 0.2;
  });
}, [highlightedNode, isConnected, isLinkConnected, links]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification:
- [x] Hovering a node dims non-connected nodes and edges
- [x] Connected neighbors and their edges remain bright
- [x] Moving mouse off node restores full visibility to all
- [x] Center node highlighting works correctly
- [x] Performance remains smooth during hover interactions
- [x] Works correctly in both light and dark modes

**Implementation Note**: Pause here for manual verification before Phase 5.

---

## Phase 5: Search Enhancements (Skeleton + Recent Searches)

### Overview

Add recent searches functionality (last 5 artists stored in localStorage) and a skeleton graph loader for improved perceived performance.

### Changes Required:

#### 1. Create Skeleton Graph Component

**File**: `src/components/SkeletonGraph.tsx` (new file)

```typescript
import { cn } from '@/lib/utils';

interface SkeletonGraphProps {
  className?: string;
}

export function SkeletonGraph({ className }: SkeletonGraphProps) {
  // Generate random but stable positions for skeleton nodes
  const skeletonNodes = [
    { cx: '50%', cy: '50%', r: 28, opacity: 0.3 }, // Center
    { cx: '30%', cy: '35%', r: 18, opacity: 0.15 },
    { cx: '70%', cy: '30%', r: 20, opacity: 0.15 },
    { cx: '25%', cy: '60%', r: 16, opacity: 0.15 },
    { cx: '75%', cy: '65%', r: 22, opacity: 0.15 },
    { cx: '45%', cy: '75%', r: 17, opacity: 0.15 },
    { cx: '60%', cy: '40%', r: 19, opacity: 0.15 },
  ];

  const skeletonLinks = [
    { x1: '50%', y1: '50%', x2: '30%', y2: '35%' },
    { x1: '50%', y1: '50%', x2: '70%', y2: '30%' },
    { x1: '50%', y1: '50%', x2: '25%', y2: '60%' },
    { x1: '50%', y1: '50%', x2: '75%', y2: '65%' },
    { x1: '50%', y1: '50%', x2: '45%', y2: '75%' },
    { x1: '50%', y1: '50%', x2: '60%', y2: '40%' },
  ];

  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      <svg className="h-full w-full animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Skeleton links */}
        <g className="stroke-muted-foreground/20">
          {skeletonLinks.map((link, i) => (
            <line
              key={i}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              strokeWidth="0.3"
            />
          ))}
        </g>
        {/* Skeleton nodes */}
        <g>
          {skeletonNodes.map((node, i) => (
            <circle
              key={i}
              cx={node.cx}
              cy={node.cy}
              r={node.r / 5}
              className="fill-muted-foreground"
              opacity={node.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
```

#### 2. Update MapView to Use Skeleton

**File**: `src/pages/MapView.tsx`
**Changes**: Replace Loader2 with SkeletonGraph (around line 103-109)

```typescript
// Add import
import { SkeletonGraph } from '@/components/SkeletonGraph';

// Replace loading state (around line 103-109)
// BEFORE:
{isLoading ? (
  <div className="flex h-full items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading similarity graph...</p>
    </div>
  </div>
) : (

// AFTER:
{isLoading ? (
  <div className="relative h-full">
    <SkeletonGraph />
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="rounded-lg bg-background/80 px-4 py-2 text-muted-foreground backdrop-blur-sm">
        Loading similarity graph...
      </p>
    </div>
  </div>
) : (
```

#### 3. Add Recent Searches to ArtistSearch

Spec:
- Store up to 10 recent items in `localStorage`.
- Dedupe case-insensitively by artist name (normalize via `trim().toLowerCase()`).
- Store minimal shape: `{ name: string }` (optionally extend later; out of scope now).
- Add to recents on successful selection (clicking a search result), not on input change.
- UI:
  - Show “Recent searches” list when input is focused and query is empty.
  - Provide “Clear” action to wipe stored recents.
- Privacy stance:
  - Data is stored locally in the browser only; never sent to backend/Last.fm as telemetry.

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Add recent searches functionality

```typescript
// Add import
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock } from 'lucide-react';

// Inside component, add recent searches state (after line 23)
const [recentSearches, setRecentSearches] = useLocalStorage<Artist[]>('musiqasiq-recent-searches', []);

// Update handleSelect to save recent (around line 91-96)
const handleSelect = (artist: Artist) => {
  // Add to recent searches (max 5, no duplicates)
  setRecentSearches((prev) => {
    const filtered = prev.filter((a) => a.name.toLowerCase() !== artist.name.toLowerCase());
    return [artist, ...filtered].slice(0, 5);
  });
  
  setQuery('');
  setResults([]);
  setIsOpen(false);
  onSelect(artist);
};

// Add state to track if showing recent
const [showRecent, setShowRecent] = useState(false);

// Update onFocus handler (around line 110)
onFocus={() => {
  if (results.length > 0) {
    setIsOpen(true);
  } else if (query.trim() === '' && recentSearches.length > 0) {
    setShowRecent(true);
  }
}}

// Add onBlur with delay to allow click
onBlur={() => {
  setTimeout(() => setShowRecent(false), 200);
}}

// Add recent searches dropdown after the results dropdown (around line 155, before closing div)
{showRecent && query.trim() === '' && recentSearches.length > 0 && !isOpen && (
  <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
    </div>
    <ul className="py-2">
      {recentSearches.map((artist) => (
        <li key={artist.name}>
          <button
            onClick={() => handleSelect(artist)}
            className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{artist.name}</p>
              {artist.listeners && (
                <p className="text-sm text-muted-foreground">
                  {formatNumber(artist.listeners, 'listeners')}
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification:
- [x] Skeleton graph appears during loading (faint nodes and edges)
- [x] Loading text overlays the skeleton
- [x] Recent searches appear when focusing empty search field
- [x] Recent searches persist across page reloads
- [x] Selecting a recent search navigates correctly
- [x] Recent searches update (new searches appear, max 5)
- [x] Recent searches work in both light and dark modes

**Implementation Note**: This is the final phase. Complete manual verification to confirm all features work together.

---

## Testing Strategy (Concrete Tests)

### Unit Tests:
- `useLocalStorage`:
  - returns `initialValue` when key missing
  - falls back to `initialValue` on JSON parse failure
  - persists updates via `setValue`
  - removes key when cleared (if supported by API)
- `useGenreColors`:
  - same tag always maps to the same color across runs
  - different tags map into palette deterministically
  - node without tags uses `DEFAULT_COLOR`
  - center node uses `CENTER_COLOR`

### Integration / Component Tests (if React Testing Library is present):
- Theme:
  - toggling theme sets/removes `<html class="dark">`
  - `color-scheme` style matches resolved theme
  - theme persists across reload (reads from `localStorage`)
- Legend:
  - renders unique tags present in the current graph
  - legend swatches match `colorForTag(tag)` deterministically

### E2E (Playwright):
- Theme persists:
  - toggle to dark → reload → still dark
- Highlighting:
  - hover dims unrelated nodes/links
  - click locks highlight; background click clears; `Esc` clears
- Loading:
  - skeleton graph is shown while graph data is loading; replaced by real graph once loaded

### Manual Testing Steps:
- Verify system theme mode follows OS setting changes when theme is `'system'`.
- Verify reduced-motion disables pulse and avoids jarring opacity transitions.

### Unit Tests:

Create test files for new hooks:
- `src/hooks/useLocalStorage.test.ts` - Test get/set, JSON parsing, error handling
- `src/components/ForceGraph/hooks/useGenreColors.test.ts` - Test color assignment, memoization

### Integration Tests:

- Test ThemeProvider context with child components
- Test ArtistSearch with recent searches integration

### Manual Testing Steps:

1. **Theme Toggle Flow**:
   - Click theme toggle, verify cycles through light → dark → system
   - Reload page, verify theme persists
   - Change OS theme while on "system", verify it updates

2. **Genre Colors Flow**:
   - Search for an artist with diverse similar artists
   - Verify nodes have different colors based on genre
   - Verify same genre = same color

3. **Path Highlighting Flow**:
   - Hover over various nodes
   - Verify non-connected nodes dim
   - Move mouse away, verify all restore

4. **Recent Searches Flow**:
   - Search and select 6+ artists
   - Focus empty search, verify last 5 shown
   - Clear localStorage, verify empty state

5. **Skeleton Loader Flow**:
   - Navigate to artist graph
   - Throttle network in DevTools
   - Verify skeleton appears during load

## Performance Considerations

- **Genre Colors**: Computed once per graph data change (memoized)
- **Path Highlighting**: Uses D3 selections, not React re-renders
- **Pulse Animation**: CSS-only, GPU-accelerated
- **Recent Searches**: localStorage read only on mount

## Migration Notes

No database or schema changes required. All new features are client-side only.

## References

- Original research: `thoughts/shared/research/2025-12-21-ui-ux-graph-enhancements.md`
- ForceGraph component: `src/components/ForceGraph/index.tsx`
- Theme variables: `src/index.css:58-100`
- Toast module pattern: `src/hooks/use-toast.ts`
