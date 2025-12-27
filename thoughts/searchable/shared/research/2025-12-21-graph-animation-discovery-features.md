---
date: 2025-12-21T14:34:36Z
researcher: opencode
git_commit: cf11696
branch: main
repository: musiqasik
topic: "Graph Animation, Discovery, and Sharing Features"
tags: [research, animation, discovery, sharing, ux, force-graph, local-storage]
status: complete
last_updated: 2025-12-21
last_updated_by: opencode
---

# Research: Graph Animation, Discovery, and Sharing Features

**Date**: 2025-12-21T14:34:36Z
**Researcher**: opencode
**Git Commit**: cf11696
**Branch**: main
**Repository**: musiqasik

## Research Question

How can we implement:
1. "Bubble in" animation for graph nodes (one by one or small batches)
2. "Discover similar artists to [artist]" — auto-generated graph suggestions
3. "Compare two artists" mode to visualize overlaps
4. Shareable links or embeds ("See my artist graph for Radiohead")
5. Save exploration: local storage or optional login to revisit graphs

## Summary

The codebase has strong foundations for these features but currently lacks them. Key findings:

- **Animation**: Nodes render all-at-once via D3 `.join()` with no enter transitions. The architecture supports D3 transitions - existing patterns for staggered CSS animations can be adapted.
- **Discovery**: BFS graph builder and recent searches exist. Auto-suggestions would require curating "interesting" artist seeds.
- **Compare Mode**: Would need dual-center graph logic and overlap detection - significant new feature.
- **Sharing**: URL only contains artist name (path param). No query params for depth/threshold. No share UI.
- **Persistence**: `useLocalStorage` hook exists but only used for theme and recent searches. Graph explorations not saved.

## Detailed Findings

### 1. Node Animation ("Bubble In" Effect)

#### Current State
- **All-at-once rendering**: `src/components/ForceGraph/index.tsx:163-168`
- **No enter transitions**: Uses `.join('g')` without enter/exit callbacks
- **Full SVG clear on data change**: `svg.selectAll('*').remove()` at line 135
- **Existing CSS transitions**: Only for hover states (0.15s-0.2s)

#### Existing Animation Patterns to Model
```css
/* src/index.css:116-129 - Staggered slide-up */
.animate-slide-up { animation: slide-up 0.3s ease-out; }

/* Usage: inline animationDelay for staggering */
style={{ animationDelay: '0.1s' }}
style={{ animationDelay: '0.2s' }}
```

#### Recommended Implementation

**Option A: D3 Enter Transition (Best for D3 integration)**

Location: `src/components/ForceGraph/index.tsx:163-168`

```typescript
// Replace .join('g') with:
.join(
  (enter) => enter
    .append('g')
    .attr('class', 'graph-node')
    .style('opacity', 0)
    .attr('transform', (d) => `translate(${d.x},${d.y}) scale(0)`)
    .call((enter) => enter
      .transition()
      .duration(400)
      .delay((d, i) => i * 30)  // Stagger by 30ms per node
      .ease(d3.easeBackOut)     // "Pop" effect
      .style('opacity', 1)
      .attr('transform', (d) => `translate(${d.x},${d.y}) scale(1)`)
    ),
  (update) => update,
  (exit) => exit
    .call((exit) => exit
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove()
    )
)
```

**Challenges to Address:**
1. Remove `svg.selectAll('*').remove()` (line 135) for incremental updates
2. Coordinate scale transform with tick handler position updates
3. Store animation state in data attribute to preserve during simulation

**Option B: CSS Animation (Simpler, works with current architecture)**

```css
/* Add to src/index.css */
@keyframes bubble-in {
  0% { opacity: 0; transform: scale(0); }
  60% { transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

.graph-node {
  animation: bubble-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}
```

```typescript
// Add to node creation (index.tsx:164)
.style('animation-delay', (d, i) => `${i * 30}ms`)
```

#### Key Files
| File | Lines | Change Needed |
|------|-------|---------------|
| `src/components/ForceGraph/index.tsx` | 135, 163-168 | Add enter transitions |
| `src/index.css` | 113+ | Add bubble-in keyframes |
| `src/components/ForceGraph/index.tsx` | 94-106 | Modify tick handler for scale |

---

### 2. Discovery Features ("Discover similar artists to [artist]")

#### Current State
- **Recent searches stored**: `useLocalStorage<Artist[]>('musiqasiq-recent-searches', [])` - `src/components/ArtistSearch.tsx:26-29`
- **Max 5 recent searches**: Deduped and capped at `slice(0, 5)` - line 101
- **BFS traversal exists**: Could use depth-1 results as suggestions

#### Implementation Approach

**A. Auto-Suggested Artists from Search History**
```typescript
// New hook: src/hooks/useDiscoverySuggestions.ts
export function useDiscoverySuggestions(recentSearches: Artist[]) {
  // For each recent artist, get their top similar artist
  // Return unique artists not in recent searches
  // Could pre-fetch at app load or lazy-load on focus
}
```

**B. Curated "Discovery Seeds"**
- Store popular/interesting artists as starting points
- Display on home page: "Try exploring: Radiohead, Billie Eilish, Led Zeppelin"

**C. "Discover More" Button in Graph View**
```typescript
// In MapView.tsx, after loading a graph:
// Show related artists not yet in current graph
const suggestions = graphData.nodes
  .filter(n => !n.isCenter)
  .sort((a, b) => (b.listeners || 0) - (a.listeners || 0))
  .slice(0, 3);
```

#### Suggested UI Location
- Home page below search: "Discover artists like..."
- MapView sidebar: "Explore related artists"

---

### 3. Compare Two Artists Mode

#### Current State
- **Single-center architecture**: Graph builds from one artist via BFS
- **GraphService.buildGraph**: Takes single `artistName` param - `src/services/graph.ts:33`

#### Implementation Requirements

**Data Layer Changes:**
```typescript
// New method in GraphService
buildComparisonGraph: (artist1: string, artist2: string, depth: number) =>
  Effect.gen(function* () {
    // Run BFS from both artists
    const graph1 = yield* buildGraph(artist1, depth);
    const graph2 = yield* buildGraph(artist2, depth);
    
    // Merge nodes, identify overlap
    const overlap = findOverlap(graph1.nodes, graph2.nodes);
    
    return {
      nodes: [...graph1.nodes, ...graph2.nodes],
      edges: [...graph1.edges, ...graph2.edges],
      centers: [graph1.center, graph2.center],
      overlap,
    };
  });
```

**UI Changes:**
```typescript
// New route: /compare/:artist1/:artist2
// New component: CompareView.tsx
// Modified ForceGraph: Support multiple center nodes with different colors
```

**Visual Representation:**
- Center A: Blue color, left-anchored
- Center B: Red color, right-anchored  
- Overlap nodes: Purple (blend of both)
- Unique to A: Blue gradient
- Unique to B: Red gradient

#### Complexity Assessment
- **Effort**: High (new route, service method, visualization logic)
- **Prerequisite**: Ensure current graph works well before adding complexity

---

### 4. Shareable Links

#### Current State
- **URL path only**: `/artist/:artistName` - `src/App.tsx:20`
- **No query parameters**: Router doesn't use `useSearchParams`
- **State not in URL**: depth, threshold, labels, selected artist all in local state

#### Implementation Plan

**Phase 1: URL State Sync (Essential)**
```typescript
// In MapView.tsx, use useSearchParams
const [searchParams, setSearchParams] = useSearchParams();

// Read from URL
const depth = parseInt(searchParams.get('depth') || '1');
const threshold = parseFloat(searchParams.get('threshold') || '0');
const showLabels = searchParams.get('labels') !== 'false';

// Write to URL on change
setSearchParams({ depth, threshold, labels: showLabels ? 'true' : 'false' });
```

**URL Format:**
```
/artist/Radiohead?depth=2&threshold=0.3&labels=true
```

**Phase 2: Share UI**
```typescript
// ShareButton component
function ShareButton({ artistName, depth, threshold }) {
  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('depth', depth);
    url.searchParams.set('threshold', threshold);
    
    await navigator.clipboard.writeText(url.toString());
    toast({ title: 'Link copied!' });
  };
  
  return <Button onClick={handleShare}><Share2 />Share</Button>;
}
```

**Phase 3: Embed Mode (Optional)**
```typescript
// New route: /embed/artist/:artistName
// Minimal chrome, no header/controls, auto-fit to container
// URL: /embed/artist/Radiohead?depth=1&threshold=0
```

#### Key Files to Modify
| File | Change |
|------|--------|
| `src/pages/MapView.tsx` | Add useSearchParams, sync state |
| `src/App.tsx` | Optional: Add embed route |
| `src/components/GraphControls.tsx` | Add ShareButton |

---

### 5. Save Explorations (Persistence)

#### Current State
- **useLocalStorage hook**: Well-implemented at `src/hooks/useLocalStorage.ts:3-38`
- **Current usage**: Theme (`musiqasiq-theme`) and recent searches (`musiqasiq-recent-searches`)
- **Pattern established**: Namespaced keys, JSON serialization, error handling

#### Implementation Design

**SavedGraph Interface:**
```typescript
interface SavedGraph {
  id: string;                    // UUID
  name: string;                  // User-defined or auto: "Radiohead - Dec 21"
  centerArtistName: string;
  depth: number;
  threshold: number;
  showLabels: boolean;
  timestamp: number;             // Unix ms
  thumbnail?: string;            // Optional: SVG snapshot as base64
}

// Usage
const [savedGraphs, setSavedGraphs] = useLocalStorage<SavedGraph[]>(
  'musiqasiq-saved-graphs',
  []
);
```

**Storage Considerations:**
- **Don't store full graph data**: Can be large (100+ nodes at depth 3)
- **Store metadata only**: Re-fetch graph from API/cache on load
- **Limit saved graphs**: Max 10-20 to avoid localStorage quota (5MB)

**UI Components:**

1. **Save Button** (in GraphControls):
```typescript
<Button onClick={handleSave}>
  <Bookmark /> Save Graph
</Button>
```

2. **Saved Graphs List** (on Index page or sidebar):
```typescript
function SavedGraphsList() {
  const [savedGraphs] = useLocalStorage<SavedGraph[]>('musiqasiq-saved-graphs', []);
  
  return (
    <div>
      <h3>Saved Graphs</h3>
      {savedGraphs.map(graph => (
        <Link to={`/artist/${graph.centerArtistName}?depth=${graph.depth}`}>
          {graph.name}
        </Link>
      ))}
    </div>
  );
}
```

**Optional: User Authentication**
- Would require backend (Supabase, Auth0, etc.)
- Store saved graphs in database keyed by user ID
- Out of scope for localStorage-first approach

---

## Code References

### Animation
- `src/components/ForceGraph/index.tsx:135` - SVG clear (remove for incremental)
- `src/components/ForceGraph/index.tsx:163-168` - Node creation (add transitions)
- `src/index.css:116-141` - Existing animation patterns
- `src/components/ForceGraph/hooks/useD3Zoom.ts:39-64` - D3 transition examples

### Sharing & URL
- `src/App.tsx:18-23` - Router configuration
- `src/pages/MapView.tsx:17,47,67,71` - URL parameter handling
- `src/pages/MapView.tsx:25-27` - State not persisted to URL

### Local Storage
- `src/hooks/useLocalStorage.ts:3-38` - Hook implementation
- `src/components/ArtistSearch.tsx:26-29,99-102` - Recent searches pattern
- `src/components/ThemeProvider.tsx:20` - Theme persistence

### Graph Data
- `src/services/graph.ts:33-188` - BFS graph building
- `src/types/artist.ts:20-28` - GraphData structure
- `src/wasm/graph-service.ts:10-31` - Node/Link types

## Architecture Insights

1. **Animation Ready**: D3 transition API is already used for zoom controls. The same pattern can apply to node enter/exit animations.

2. **Modular Hooks**: ForceGraph uses separate hooks (useD3Simulation, useD3Zoom, etc.). Animation logic could be a new `useNodeAnimation` hook.

3. **URL State Underutilized**: React Router v6 is installed but `useSearchParams` isn't used. Adding URL state sync is straightforward.

4. **localStorage Pattern Established**: The `useLocalStorage` hook is production-ready with SSR safety and error handling. Extending to saved graphs follows the same pattern.

5. **Effect Services Decoupled**: Graph fetching via Effect services is separate from UI state. Comparison feature would need new Effect service method but wouldn't require UI layer changes.

## Historical Context (from thoughts/)

- `thoughts/shared/research/2025-12-21-ui-ux-graph-enhancements.md` - Related research on making graphs more emotionally engaging (colors, animations, path highlighting)
- `thoughts/shared/plans/2025-12-21-ui-ux-graph-enhancements.md` - Implementation plan for genre colors, dark mode, recent searches (partially implemented)

## Implementation Priority

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Bubble-in animation | Medium | High | 1 |
| URL state sync (shareable links) | Low | High | 2 |
| Save exploration (localStorage) | Low | Medium | 3 |
| Discovery suggestions | Medium | Medium | 4 |
| Compare two artists | High | Medium | 5 |
| Embed mode | Medium | Low | 6 |

## Open Questions

1. **Animation Performance**: With 100+ nodes at depth 3, will staggered animations cause jank? *Mitigation*: Batch nodes (10 at a time) instead of individual delays.

2. **Compare Mode Complexity**: Is artist overlap detection valuable enough to justify the development effort? *Consider*: Start with simple side-by-side view before full graph merge.

3. **Authentication Scope**: Should saved graphs sync across devices? *Decision*: Start with localStorage-only, add auth later if users request it.

4. **Share URL Length**: With all params, URLs could get long. *Consider*: URL shortener service or just accept longer URLs.
