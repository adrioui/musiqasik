---
date: 2025-12-21T10:00:00+00:00
researcher: opencode
git_commit: b171db5afa5d42e388663cc06cf8cceebed6732c
branch: main
repository: musiqasik
topic: "UI/UX and Graph Enhancements"
tags: [research, ui-ux, force-graph, dark-mode, visualization]
status: complete
last_updated: 2025-12-21
last_updated_by: opencode
---

# Research: UI/UX and Graph Enhancements

**Date**: 2025-12-21
**Researcher**: opencode
**Git Commit**: b171db5afa5d42e388663cc06cf8cceebed6732c
**Branch**: main
**Repository**: musiqasik

## Research Question

How can we make the data more emotionally engaging, intuitive, and delightful through dynamic colors, animations, path highlighting, dark mode, and better onboarding?

## Summary

The current implementation provides a solid foundation with D3.js force simulation and basic interactivity. However, it lacks emotional engagement due to static coloring, limited animations, and standard loading states. The data structures (specifically `tags` on `GraphNode`) exist to support dynamic features, and the styling system (Tailwind) is ready for dark mode implementation.

## Detailed Findings

### 1. Graph Visualization & Engagement

**Current State**:
- **Colors**: Static CSS variables (`--graph-node`, `--graph-center`) are used for all nodes regardless of genre or popularity.
- **Animations**: Basic CSS transitions for fill and opacity. No continuous animations like pulsing.
- **Data**: `GraphNode` contains `tags` (string array), which can be used for genre classification.

**Proposed Enhancements**:
- **Dynamic Colors**: Use `d3.scaleOrdinal` to map the most frequent `tags` in the dataset to a color palette (e.g., d3-scale-chromatic). Fallback to a default color if no tags match.
- **Pulsing Animation**: Add a CSS `@keyframes` pulse animation to the center node or highly popular nodes to draw attention.
- **Forces**: Adjust `charge` force (currently -400) to be more repulsive (-600) and increase `collision` radius (currently 40px) to 60px to improve readability and reduce overlap.

### 2. Interaction Design (Highlight Path)

**Current State**:
- **Click**: Triggers `onNodeClick` navigation.
- **Hover**: Changes fill color and shows tooltip.
- **Connections**: All links are always visible with static opacity based on weight.

**Proposed Enhancements**:
- **Path Highlighting**: Introduce a `highlightedNode` state. When a node is hovered/clicked, dim all other nodes and links *except* the connected neighbors and incident edges.
- **Implementation**:
  - Add `activeNode` state to `ForceGraph`.
  - In D3 `tick` or render cycle, set opacity: `opacity = isConnected(d, activeNode) ? 1 : 0.1`.

### 3. Dark Mode & Design System

**Current State**:
- **Support**: `tailwind.config.ts` has `darkMode: ['class']`. `src/index.css` defines `.dark` variables.
- **Missing**: No mechanism to toggle the `.dark` class on the `<html>` element. No persistent preference storage.

**Proposed Enhancements**:
- **ThemeProvider**: Create a React context (`ThemeProvider`) that manages the theme state (light/dark/system) and applies the class to `document.documentElement`.
- **ThemeToggle**: Add a button component in the header to switch themes.

### 4. Search & Onboarding

**Current State**:
- **Search**: `ArtistSearch` component creates `AbortController` and debounces input. Shows dropdown results.
- **Missing**: "Recent Searches" functionality.
- **Onboarding**: Static text on `Index.tsx`.
- **Empty State**: Simple text message in graph container.

**Proposed Enhancements**:
- **Recent Searches**: Implement `useLocalStorage` hook to store last 5 selected artists. Display these when the search input is focused but empty.
- **Skeleton Loader**: Replace the simple `Loader2` spinner or blank screen with a "Skeleton Graph" (faint circles and lines) to perceive faster loading.

## Code References

- `src/components/ForceGraph/index.tsx:154`: Current static color assignment.
- `src/components/ForceGraph/hooks/useD3Simulation.ts:53`: Current force configuration.
- `src/types/artist.ts:35`: `tags` field availability.
- `src/index.css:58`: Dark mode CSS variable definitions.
- `src/components/ArtistSearch.tsx:27`: Current search effect (no history logic).

## Architecture Insights

- **Data Availability**: The `tags` data is available on nodes but currently unused for visualization. This is a "low-hanging fruit" for high-impact visual improvement.
- **Effect/Service Layer**: Data fetching is handled via Effect services, but the UI consumption is standard React hooks. Any caching for "Recent Searches" should be client-side (localStorage) as it's a user-preference feature, not server data.
- **Component Isolation**: The `ForceGraph` is well-isolated. Visual changes can be contained within `src/components/ForceGraph/` without refactoring the data layer.

## Open Questions

- **Color Palette**: Should we define a fixed set of genre colors (Rock=Red, Pop=Blue) or generate them dynamically based on the specific subgraph's tags? Dynamic generation is more robust for diverse datasets.
- **Performance**: Will continuous pulse animations on many nodes degrade performance? *Mitigation*: Only pulse the center node or top 3 connected nodes.

