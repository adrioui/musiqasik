---
date: 2025-12-27T14:30:00+07:00
researcher: Claude
git_commit: cf11696bebc569a437093f9d55012229e6124845
branch: main
repository: musiqasik
topic: "Integration Analysis for TuneGraph/SonicGraph UI Mockups"
tags: [research, codebase, ui-ux, mockups, design-system, graph-visualization, components]
status: complete
last_updated: 2025-12-27
last_updated_by: Claude
---

# Research: Integration Analysis for TuneGraph/SonicGraph UI Mockups

**Date**: 2025-12-27T14:30:00+07:00
**Researcher**: Claude
**Git Commit**: cf11696bebc569a437093f9d55012229e6124845
**Branch**: main
**Repository**: musiqasik

## Research Question

How to integrate the provided HTML mockups (7 distinct UI states) into the existing MusiqasiQ codebase, including gap analysis, component mapping, and implementation priorities.

## Summary

The mockups represent a significant UI redesign with **new visual language** (glassmorphism, cyan-blue palette), **new layout patterns** (floating panels, slide-in sheets), and **new features** (weekly drops, bridge artists, comparison views, sharing). The existing codebase has a **solid foundation** (modular ForceGraph, Effect services, shadcn/ui) but requires substantial work in design system updates, new component creation, and service layer extensions.

**Key Findings**:
1. **Design System Gap**: Current primary `#2666E5` vs mockup `#13b6ec` requires CSS variable updates
2. **Missing Components**: Need Dialog/Sheet, glassmorphism cards, floating navigation
3. **Layout Restructure**: MapView needs responsive sidebars, overlay panels, fullscreen graph mode
4. **New Features**: Weekly drops, bridge artists, comparison mode require new services
5. **Animation System**: Enter transitions and staggered animations not yet implemented

## Detailed Findings

### Mockup Inventory

| # | Mockup Name | Key UI Elements | Priority |
|---|-------------|-----------------|----------|
| 1 | Landing/First Load | Floating header/footer, centered graph, satellite nodes | High |
| 2 | Node Interaction | Glassmorphism side panel, artist details, similarity score | High |
| 3 | Edge Explanation | Connection card, match percentage, shared listeners | Medium |
| 4 | Filters/Lenses Tray | Floating bottom-left panel, similarity/popularity sliders | High |
| 5 | Personal Taste Graph | Full-screen graph, legend tooltip, user-centric view | Medium |
| 6 | Bridge Artist Recommendation | Dual-cluster visualization, bridge card, connection paths | Low |
| 7 | Weekly Discovery Drop | Side panel with categorized recommendations | Low |
| 8 | Share Graph Flow | Modal overlay, snapshot preview, export options | Medium |

### Component Mapping

#### Existing Components → Mockup Equivalents

| Current Component | Mockup Element | Gap Analysis |
|-------------------|----------------|--------------|
| `ArtistPanel` | Node Interaction side panel | Needs glassmorphism, similarity score bar, "Explore in Graph" button |
| `ArtistSearch` | Search bar in various mockups | Styling changes only (rounded-full, glass background) |
| `GraphControls` | Filters/Lenses Tray | Complete redesign - floating card, different slider styling |
| `ForceGraph` | Graph visualization | Node styling, edge glow, entry animations needed |
| `GraphLegend` | Personal Taste legend tooltip | Redesign as hover-triggered tooltip |
| `ThemeToggle` | Dark mode support | Already functional, may need icon updates |

#### New Components Required

| Component | Mockup Source | Complexity | Dependencies |
|-----------|---------------|------------|--------------|
| `GlassPanel` | All mockups | Low | Tailwind backdrop-blur |
| `FloatingNav` | Landing, Personal Taste | Medium | None |
| `ArtistDetailSheet` | Node Interaction | High | Radix Sheet/Dialog |
| `EdgeCard` | Edge Explanation | Medium | Positioning logic |
| `LensesTray` | Filters mockup | Medium | Slider, existing controls |
| `WeeklyDropPanel` | Weekly Discovery | High | New discovery service |
| `BridgeCard` | Bridge Recommendation | Medium | Path-finding service |
| `ShareModal` | Share Graph Flow | High | Radix Dialog, clipboard API |
| `GraphSnapshot` | Share Graph Flow | High | SVG-to-image conversion |

### Design System Changes

#### Color Palette Update

**Current (`src/index.css`)**:
```css
--primary: 220 70% 50%;  /* #2666E5 - blue */
--accent: 262 83% 58%;   /* #7c3aed - purple */
```

**Mockup Colors**:
```css
--primary: 195 85% 50%;  /* #13b6ec - cyan-blue */
--primary-alt: 212 85% 50%; /* #137fec - bright blue */
--background-dark: 200 30% 8%; /* #101d22 - dark teal-gray */
--surface-dark: 195 15% 12%; /* #1c2427 - elevated surface */
```

#### Typography

**Mockup Fonts**:
- `Inter` (primary, most mockups)
- `Spline Sans` (Weekly Discovery)
- `Noto Sans` (body text)

**Current**: Uses Tailwind default sans-serif stack

**Action**: Add Inter via Google Fonts, update `tailwind.config.ts`

#### New Utilities Needed

```css
/* Glassmorphism */
.glass-panel {
  @apply bg-[rgba(16,29,34,0.75)] backdrop-blur-xl border border-white/10;
}

/* Glow effects */
.node-glow {
  filter: drop-shadow(0 0 8px rgba(19, 182, 236, 0.3));
}

.edge-glow {
  filter: drop-shadow(0 0 4px rgba(19, 182, 236, 0.5));
}

/* Float animation */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
```

### Layout Architecture Changes

#### Current MapView Structure
```
┌─────────────────────────────────────────────────────┐
│ Header (absolute overlay)                           │
├─────────────────────────────────┬───────────────────┤
│                                 │                   │
│   ForceGraph (flex-1)           │  ArtistPanel      │
│                                 │  (w-80 fixed)     │
│   ┌─────────────┐               │                   │
│   │ GraphLegend │               │                   │
│   └─────────────┘               │                   │
│   ┌──────────────┐              │                   │
│   │ GraphControls│              │                   │
│   └──────────────┘              │                   │
│                                 │                   │
└─────────────────────────────────┴───────────────────┘
```

#### Proposed Mockup Structure
```
┌─────────────────────────────────────────────────────┐
│ FloatingNav (absolute top-left)   ActionBtn (top-r) │
│                   ContextHelp (top-center)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│               ForceGraph (full-screen)              │
│                                                     │
│   ┌──────────┐                    ┌───────────────┐ │
│   │LensesTray│                    │ ArtistSheet   │ │
│   │(bottom-l)│                    │ (slide-in-r)  │ │
│   └──────────┘         ┌────────┐ └───────────────┘ │
│               ┌───────┐│ Legend │                   │
│               │ Zoom  ││(btn-r) │                   │
│               └───────┘└────────┘                   │
└─────────────────────────────────────────────────────┘
```

**Key Changes**:
1. **Full-screen graph** with all UI as overlays
2. **Slide-in side sheet** instead of fixed sidebar
3. **Floating controls** with glassmorphism styling
4. **Collapsible legend** as tooltip trigger
5. **Responsive collapse** for mobile

### ForceGraph Visualization Changes

#### Node Rendering Updates

| Aspect | Current | Mockup Target |
|--------|---------|---------------|
| Shape | Circle with optional image | Circle with ring, glow on hover/active |
| Size | 18-28px based on listeners | Larger variation (10-128px), hierarchy clearer |
| Styling | Solid fill, 3px stroke | Border-2/4 with glow, pulse on center |
| Labels | SVG text below node | Floating badge with backdrop-blur |
| Animation | Pulse on center only | Float animation on satellites, bubble-in on load |

#### Edge Rendering Updates

| Aspect | Current | Mockup Target |
|--------|---------|---------------|
| Style | Solid line | Optional glow on active, dashed for weak |
| Width | 1-3px based on weight | 0.5-2px, more subtle |
| Color | Single gray | Active edges use primary color |
| Interaction | Opacity on hover | Full edge card on click |

#### Required Hook Changes

1. **`useNodeAnimation`** (new): Staggered bubble-in on mount
2. **`useEdgeInteraction`** (new): Edge click → show EdgeCard
3. **`useGenreColors`**: Update palette to mockup colors
4. **`useD3Simulation`**: Adjust forces for larger node spacing

### Service Layer Extensions

#### For Weekly Discovery Feature

```typescript
// New service: src/services/discovery.ts
interface DiscoveryService {
  getWeeklyDrops(): Effect<DiscoveryDrop[], AppError>;
  getCloseMatches(artistName: string): Effect<Artist[], AppError>;
  getBridgeArtists(artist1: string, artist2: string): Effect<Artist[], AppError>;
}

interface DiscoveryDrop {
  category: 'close_match' | 'bridge_artist' | 'wildcard';
  artist: Artist;
  reason: string;
  graphVisualization?: { nodes: string[]; edges: string[] };
}
```

#### For Share Feature

```typescript
// New service: src/services/sharing.ts
interface ShareService {
  generateSnapshot(svgElement: SVGElement): Effect<Blob, AppError>;
  copyShareLink(graphConfig: GraphConfig): Effect<string, AppError>;
}
```

#### For Comparison Mode

```typescript
// Extension to: src/services/graph.ts
interface GraphService {
  // Existing
  buildGraph(artist: string, depth: number): Effect<GraphData, AppError>;
  
  // New
  buildComparisonGraph(artist1: string, artist2: string, depth: number): Effect<ComparisonGraphData, AppError>;
  findPath(source: string, target: string): Effect<ArtistPath, AppError>;
}
```

### Implementation Phases

#### Phase 1: Design System Foundation (Effort: 1-2 days)

1. **Update CSS variables** (`src/index.css`)
   - New primary color `#13b6ec`
   - New background colors for dark mode
   - Add glassmorphism utilities

2. **Add Inter font** (`index.html` + `tailwind.config.ts`)

3. **Create base components**:
   - `GlassCard` - reusable glassmorphism container
   - `FloatingPanel` - absolute-positioned overlay wrapper

#### Phase 2: Core Layout Restructure (Effort: 2-3 days)

1. **Refactor MapView layout**
   - Full-screen graph container
   - Overlay-based UI positioning
   - Remove fixed sidebar

2. **Create new components**:
   - `FloatingNav` - top-left navigation buttons
   - `LensesTray` - bottom-left controls panel
   - `ArtistDetailSheet` - slide-in right panel (using Radix Sheet)

3. **Add Radix Sheet** - `npx shadcn-ui@latest add sheet`

#### Phase 3: Graph Visualization Updates (Effort: 3-4 days)

1. **Update ForceGraph styling**
   - New node rendering with rings and glows
   - Updated color palette integration
   - Floating labels with backdrop-blur

2. **Add animations**:
   - Bubble-in on mount (`useNodeAnimation` hook)
   - Float animation CSS for satellite nodes
   - Edge glow transitions

3. **Edge interaction**:
   - Click handler for edges
   - `EdgeCard` component for connection details

#### Phase 4: New Features (Effort: 4-6 days)

1. **Share functionality**:
   - Add `ShareModal` component
   - URL state sync with `useSearchParams`
   - SVG-to-PNG snapshot generation

2. **Weekly Discovery** (if scope includes):
   - `DiscoveryService` with Last.fm charts integration
   - `WeeklyDropPanel` component
   - Discovery algorithm (recent searches + similar artists)

3. **Comparison Mode** (if scope includes):
   - Dual-center graph building
   - Overlap detection
   - Bridge artist path visualization

### Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Design system update | High | Low | P0 |
| Layout restructure (MapView) | High | Medium | P0 |
| Node/edge styling updates | High | Medium | P1 |
| ArtistDetailSheet | High | Medium | P1 |
| LensesTray | Medium | Low | P1 |
| Entry animations | Medium | Medium | P2 |
| ShareModal | Medium | Medium | P2 |
| EdgeCard interaction | Low | Low | P2 |
| Weekly Discovery | Medium | High | P3 |
| Comparison Mode | Medium | High | P3 |
| Bridge Artists | Low | High | P3 |

## Code References

- `src/index.css:6-100` - Current CSS variables (light/dark themes)
- `src/components/ForceGraph/index.tsx:223-257` - Node rendering
- `src/components/ForceGraph/hooks/useGenreColors.ts:14-25` - Color palette
- `src/pages/MapView.tsx:78-154` - Current page layout
- `src/components/ArtistPanel.tsx` - Current artist details panel
- `src/components/GraphControls.tsx` - Current controls panel
- `tailwind.config.ts:21-64` - Tailwind theme configuration

## Architecture Insights

### Strengths of Current Architecture

1. **Modular ForceGraph hooks** - Easy to add `useNodeAnimation`, `useEdgeInteraction`
2. **Effect-based services** - Clean extension path for `DiscoveryService`
3. **shadcn/ui foundation** - Can add Sheet, Dialog components easily
4. **WASM integration** - Heavy computations (path-finding) can use Rust

### Constraints to Consider

1. **SVG rendering** - May struggle with 1000+ nodes (PixiJS migration researched)
2. **No Radix Sheet** - Needs to be added for slide-in panels
3. **Fixed sidebar pattern** - Requires layout refactor for overlay approach
4. **Animation batching** - 100+ nodes need staggered loading to avoid jank

## Historical Context (from thoughts/)

- `thoughts/shared/plans/2025-12-21-ui-ux-graph-enhancements.md` - Partially implemented genre colors, dark mode, path highlighting
- `thoughts/shared/research/2025-12-21-graph-animation-discovery-features.md` - Detailed bubble-in animation approaches
- `thoughts/shared/research/2025-12-21-pixijs-d3force-bubble-animation.md` - Performance optimization for large graphs
- `thoughts/shared/plans/2025-12-19-component-refactoring.md` - Component cleanup context

## Related Research

- `thoughts/shared/research/2025-12-21-ui-ux-graph-enhancements.md` - Making graphs emotionally engaging
- `thoughts/shared/research/2025-12-20-graph-search-performance-optimization.md` - UI responsiveness during graph builds

## Open Questions

1. **Scope Confirmation**: Which mockups are MVP vs future enhancements?
2. **Branding**: Should we adopt "TuneGraph"/"SonicGraph" naming from mockups?
3. **Mobile Strategy**: Full responsive implementation or desktop-first?
4. **Data Sources**: Weekly discovery needs Last.fm charts API - is this scoped?
5. **Sharing Backend**: Does "Copy Link" need server-side short URLs?
6. **Performance Target**: How many nodes should we support at 60fps?

## Recommended Next Steps

1. **Confirm scope** - Which phases/features are in initial scope
2. **Start Phase 1** - Design system updates (lowest risk, enables everything else)
3. **Prototype key interactions** - ArtistDetailSheet, LensesTray in isolation
4. **Parallel track** - Add Radix Sheet while design system updates proceed
