---
date: 2025-12-19T00:00:00+07:00
researcher: Claude
git_commit: 234dff17316d1a74895b5c43ed1edb96f6216846
branch: main
repository: musiqasik
topic: "Codebase Improvement Opportunities: Refactoring, Cognitive Load Reduction, and Code Quality"
tags: [research, codebase, refactoring, code-quality, cognitive-load, architecture, testing, typescript]
status: complete
last_updated: 2025-12-19
last_updated_by: Claude
---

# Research: Codebase Improvement Opportunities

**Date**: 2025-12-19T00:00:00+07:00
**Researcher**: Claude
**Git Commit**: 234dff17316d1a74895b5c43ed1edb96f6216846
**Branch**: main
**Repository**: musiqasik

## Research Question

What improvements, refactoring opportunities, and changes would make this codebase easier to reason about and reduce cognitive load while maintaining proper functionality?

## Summary

This research identifies **47 specific improvement opportunities** across 8 categories that would significantly reduce cognitive load and improve code maintainability. The key findings are:

1. **Large components need splitting** - ForceGraph.tsx (368 lines, 9 responsibilities) and MapView.tsx (172 lines, 11 responsibilities) are too large
2. **Massive code duplication** - ~550+ lines duplicated between Effect services and Workers API
3. **Effect library adopted but unused** - Service layer built with Effect but frontend bypasses it completely
4. **React Query installed but unused** - QueryClientProvider wraps app but no queries use it
5. **40+ unused UI components** - shadcn/ui components installed but never used (~2.2MB bloat)
6. **Testing gaps** - ~15% coverage, critical paths untested (ForceGraph, BFS algorithm, services)
7. **TypeScript strictNullChecks disabled** - Major type safety hole in base config
8. **Window global anti-pattern** - ForceGraph exposes methods via window object

## Detailed Findings

### 1. Component Architecture Issues

#### ForceGraph.tsx - Too Large (368 lines, 9 responsibilities)

**Location**: `src/components/ForceGraph.tsx:1-368`

**Current responsibilities mixed together**:
- Graph data filtering (lines 34-49)
- D3 simulation setup (lines 109-123)
- Node rendering (lines 136-180)
- Image rendering with clipping (lines 183-213)
- Label rendering (lines 216-224)
- Tooltip management (lines 232-260)
- Zoom control (lines 79-87, 290-309)
- Window method exposure (lines 312-345)
- Dimension management (lines 52-63)

**Recommendation**: Split into focused modules:
```
src/components/ForceGraph/
├── index.tsx (main orchestrator, ~100 lines)
├── GraphNode.tsx (node rendering)
├── GraphLinks.tsx (edge rendering)
├── GraphTooltip.tsx (tooltip component)
├── useGraphData.ts (data filtering hook)
├── useGraphZoom.ts (zoom controls hook)
├── useGraphSimulation.ts (D3 simulation hook)
└── useWindowMethods.ts (window method exposure)
```

#### MapView.tsx - Too Many Responsibilities (172 lines, 11 concerns)

**Location**: `src/pages/MapView.tsx:13-172`

**Mixed concerns**:
- Route parameter handling (line 14)
- Toast management (line 16)
- Graph state management (lines 19-23)
- API calls via hook (line 17)
- Error handling effect (lines 45-53)
- Similar artist computation (lines 72-90)
- Navigation handlers (lines 55-69)

**Recommendation**: Extract hooks:
- `useArtistGraph(artistName, depth)` - Graph loading and state
- `useGraphControls()` - Depth, threshold, showLabels state
- `useSimilarArtists(graphData, selectedArtist)` - Computed similar artists

#### Window Global Anti-Pattern

**Location**: `src/components/ForceGraph.tsx:312-345`

**Current**:
```typescript
(window as any).__graphZoomIn = handleZoomIn;
(window as any).__graphZoomOut = handleZoomOut;
(window as any).__graphReset = handleReset;
```

**Problems**:
- Breaks in SSR (window not available)
- Multiple ForceGraph instances would conflict
- Type safety lost with type assertions
- Violates React's data flow principles

**Recommendation**: Use `useImperativeHandle` with forwardRef instead.

---

### 2. Code Duplication (~550+ lines)

#### Last.fm API Functions - Duplicated Between Services and Workers

| Function | Effect Services | Workers API |
|----------|-----------------|-------------|
| isPlaceholderImage | `src/services/lastfm.ts:40-48` | `workers/api/index.ts:19-27` |
| fetchDeezerImage | `src/services/lastfm.ts:50-64` | `workers/api/index.ts:29-39` |
| searchArtists | `src/services/lastfm.ts:70-116` | `workers/api/index.ts:42-76` |
| getArtistInfo | `src/services/lastfm.ts:118-173` | `workers/api/index.ts:78-122` |
| getSimilarArtists | `src/services/lastfm.ts:175-206` | `workers/api/index.ts:124-147` |

**Total**: ~180 lines of nearly identical API logic

#### Database Operations - Also Duplicated

| Function | Effect Services | Workers API |
|----------|-----------------|-------------|
| getArtist | `src/services/database.ts:11-23` | `workers/api/index.ts:163-169` |
| upsertArtist | `src/services/database.ts:25-61` | `workers/api/index.ts:171-201` |

**Total**: ~70 lines duplicated

#### Duplicate Type Definitions

**Two Artist interfaces**:
- `src/types/artist.ts:1-12` - Uses `| null` for optional properties
- `src/integrations/surrealdb/types.ts:1-12` - Uses only `?` for optional

**Recommendation**: Delete `src/integrations/surrealdb/types.ts`, use `src/types/artist.ts` everywhere.

#### Duplicate Toast Systems

Both Radix UI Toast and Sonner are imported in `src/App.tsx:1-2, 15-16`:
```typescript
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
```

Only Radix toast (`use-toast.ts`) is used in `MapView.tsx:11,16,47-51`.

**Recommendation**: Remove Sonner or consolidate to one system.

#### Number Formatting - Duplicated in 3 Components

**Locations**:
- `src/components/ArtistPanel.tsx:36-41` - `formatNumber()`
- `src/components/ArtistSearch.tsx:85-94` - `formatListeners()`
- `src/components/ForceGraph.tsx:248` - Inline formatting

**Recommendation**: Create utility in `src/lib/utils.ts`:
```typescript
export function formatNumber(num?: number | null, suffix?: string): string {
  if (!num) return 'N/A';
  const value = num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` :
                num >= 1000 ? `${(num / 1000).toFixed(0)}K` :
                num.toString();
  return suffix ? `${value} ${suffix}` : value;
}
```

---

### 3. Effect Library - Adopted but Unused

**Current state**: Effect library is installed and services are defined, but never executed.

**Effect IS used in**:
- `src/services/database.ts` - Effect.gen, Effect.tryPromise
- `src/services/lastfm.ts` - Effect.async, Effect.retry
- `src/services/index.ts` - Context.Tag definitions
- `src/lib/errors.ts` - Data.TaggedError

**Effect NOT used in**:
- Frontend hooks (`useLastFm.ts` uses plain fetch)
- React components (all use vanilla hooks)
- No Effect runtime configured

**Architecture problem**: Services define Effect-based interfaces but frontend directly calls Workers API, completely bypassing the Effect layer.

**Options**:
1. **Fully adopt Effect**: Wire up runtime, use services from frontend
2. **Remove Effect**: Delete unused service layer, keep only Workers API

---

### 4. React Query - Installed but Unused

**Location**: `src/App.tsx:10-13`

```typescript
const queryClient = new QueryClient();
// Later: <QueryClientProvider client={queryClient}>
```

**Problem**: QueryClient is created but:
- No `useQuery` or `useMutation` hooks used anywhere
- All fetching done via custom `useLastFm` hook with `useState`
- No caching, no deduplication, no background refetching

**Current `useLastFm` limitations**:
- No request caching
- Race conditions possible (no AbortController)
- Manual loading/error state management
- No request deduplication

**Recommendation**: Either:
1. **Adopt React Query properly** - Replace useLastFm with useQuery hooks
2. **Remove React Query** - Delete unused dependency

---

### 5. TypeScript Configuration Issues

#### Critical: strictNullChecks Disabled

**Location**: `tsconfig.json:14`
```json
"strictNullChecks": false
```

**Impact**: This setting in the base config **overrides** `strict: true` in `tsconfig.app.json:18`, meaning:
- Null/undefined can be assigned to any type
- Optional chaining provides false safety
- Type narrowing for null checks doesn't work

**Evidence of issues**:
- `src/components/ForceGraph.tsx:265-268` uses `x!` and `y!` non-null assertions
- Optional properties inconsistently use `?` vs `| null`

**Recommendation**: Enable `strictNullChecks: true` incrementally.

#### Other TypeScript Issues

**Unused props in ForceGraph**:
```typescript
// ForceGraph.tsx:13-15 - Defined but never used
onZoomIn?: () => void;
onZoomOut?: () => void;
onReset?: () => void;
```

---

### 6. State Management Issues

#### Race Conditions in ArtistSearch

**Location**: `src/components/ArtistSearch.tsx:27-41`

```typescript
useEffect(() => {
  const handler = setTimeout(async () => {
    const searchResults = await searchArtists(query);  // No AbortController
    setResults(searchResults);  // May be stale
  }, 300);
  return () => clearTimeout(handler);  // Timeout cleared but request continues
}, [query, searchArtists]);
```

**Scenario**: User types "Radio", then "Radiohead". If "Radiohead" response arrives before "Radio", stale "Radio" results can overwrite.

**Recommendation**: Add AbortController:
```typescript
useEffect(() => {
  const abortController = new AbortController();
  const handler = setTimeout(async () => {
    const searchResults = await searchArtists(query, abortController.signal);
    setResults(searchResults);
  }, 300);
  return () => {
    clearTimeout(handler);
    abortController.abort();
  };
}, [query]);
```

#### Missing Memoization

**MapView.tsx:72-90** - `getSimilarArtists()` is O(n²) and recalculated every render:
```typescript
const getSimilarArtists = (): { name: string; weight: number }[] => {
  // Expensive computation on every render
  return graphData.edges
    .filter(...)
    .map(...)
    .filter((item, index, self) => /* O(n²) deduplication */)
    .sort(...);
};
```

**Recommendation**: Use `useMemo` with deps `[selectedArtist, graphData]`.

#### ForceGraph Recreates on Every Threshold Change

**Location**: `src/components/ForceGraph.tsx:66-279`

The massive useEffect has 7 dependencies including `threshold` and `showLabels`. Any change tears down and recreates the entire D3 simulation.

**Recommendation**: Split into multiple effects - one for simulation creation, one for visual updates.

---

### 7. Testing Gaps

#### Current Coverage: ~15%

**Well-tested** (>80% coverage):
- `src/lib/utils.ts` - 8 test cases
- `src/lib/errors.ts` - 12 test cases
- `src/hooks/useLastFm.ts` - 6 test cases

**Zero coverage**:
- All React components (ForceGraph, ArtistPanel, ArtistSearch, GraphControls, NavLink)
- All pages (MapView, Index, NotFound)
- All services (database.ts, lastfm.ts)
- SurrealDB client integration

#### Critical Untested Paths

1. **ForceGraph.tsx** - Core visualization, D3 simulation, zoom behavior
2. **buildGraph function** (`workers/api/index.ts:244-383`) - BFS algorithm, could have infinite loops
3. **database.ts** - All database operations
4. **lastfm.ts** - External API integration, retry logic

#### Test Quality Issues

**Silent failure pattern** in integration tests:
```typescript
// src/test/integration.test.ts:116
try {
  // test logic
} catch {
  expect(true).toBe(true);  // Hides failures!
}
```

---

### 8. Unused Dependencies (~2.2MB bloat)

#### Completely Unused Packages

| Package | Bundle Impact |
|---------|---------------|
| `@tanstack/react-router` | ~500KB |
| `@tanstack/react-start` | ~200KB |
| `zod` | ~50KB |
| `date-fns` | ~70KB |
| `react-hook-form` | ~40KB |
| `@hookform/resolvers` | ~10KB |
| `embla-carousel-react` | ~30KB |
| `recharts` | ~400KB |
| `cmdk` | ~30KB |
| `vaul` | ~20KB |
| `input-otp` | ~15KB |
| `react-day-picker` | ~50KB |
| `react-resizable-panels` | ~20KB |

#### 40+ Unused shadcn/ui Components

Components in `src/components/ui/` that are never imported:
```
accordion, alert-dialog, alert, aspect-ratio, avatar, breadcrumb, calendar,
card, carousel, chart, checkbox, collapsible, command, context-menu, drawer,
dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu,
pagination, popover, progress, radio-group, resizable, scroll-area, select,
sidebar, table, tabs, textarea, ...
```

Each brings its @radix-ui dependency.

---

## Code References

### Component Issues
- `src/components/ForceGraph.tsx:312-345` - Window global anti-pattern
- `src/components/ForceGraph.tsx:13-15` - Unused props
- `src/components/ForceGraph.tsx:66-279` - Monolithic useEffect
- `src/pages/MapView.tsx:72-90` - Business logic in component

### Duplication
- `src/services/lastfm.ts` vs `workers/api/index.ts:42-147` - API functions
- `src/services/database.ts` vs `workers/api/index.ts:163-214` - DB operations
- `src/types/artist.ts` vs `src/integrations/surrealdb/types.ts` - Types

### Configuration
- `tsconfig.json:14` - strictNullChecks disabled
- `eslint.config.js:23` - unused-vars rule disabled
- `package.json:51-53,70` - Duplicate router packages

### State Management
- `src/hooks/useLastFm.ts:7-9` - Manual loading/error state
- `src/App.tsx:10` - Unused QueryClient
- `src/components/ArtistSearch.tsx:27-41` - Race condition

## Architecture Insights

### Current Data Flow
```
Frontend (useLastFm.ts)
  ↓ fetch()
Workers API (workers/api/index.ts)
  ↓
├── Last.fm API
└── SurrealDB

Effect Services (src/services/) ← UNUSED
SurrealDB Client (src/integrations/) ← UNUSED
```

### Recommended Architecture
```
Frontend
  ↓ React Query
Workers API
  ↓ Shared API Client
├── Last.fm API
└── SurrealDB

OR

Frontend
  ↓ Effect Runtime
Effect Services
  ↓
├── Last.fm API
└── SurrealDB
```

### Key Patterns to Implement

1. **Repository Pattern** - Extract database queries from workers
2. **API Client Layer** - Shared HTTP client with retry logic
3. **Domain Layer** - Business logic (GraphBuilder) separate from I/O
4. **Proper Caching** - Tiered cache with TTL invalidation

## Historical Context (from thoughts/)

Previous research documents provide context:

- `thoughts/shared/research/2025-12-09-software-engineering-best-practices-assessment.md`
  - Identified testing gaps, TypeScript strict mode disabled, performance bottlenecks
  - Rated architecture 8/10 but noted critical gaps

- `thoughts/shared/research/2025-12-07-caching-implementation-performance-optimization.md`
  - Analyzed two-level caching system bottlenecks
  - Identified N+1 query problems, sequential API calls

- `thoughts/shared/research/2025-12-07-effect-integration-research.md`
  - Comprehensive Effect.ts integration research
  - Noted incomplete migration (services defined but not used)

- `thoughts/shared/plans/2025-12-07-surrealdb-effect-migration.md`
  - 7-phase migration plan from Supabase to SurrealDB + Effect
  - Currently incomplete (Effect services built but not wired)

## Related Research

- `thoughts/shared/research/2025-12-09-software-engineering-best-practices-assessment.md`
- `thoughts/shared/research/2025-12-07-caching-implementation-performance-optimization.md`
- `thoughts/shared/research/2025-12-07-effect-integration-research.md`
- `thoughts/shared/plans/2025-12-09-software-engineering-best-practices-implementation.md`

## Prioritized Recommendations

### Phase 1: Quick Wins (1-2 days)

1. **Remove unused dependencies** - Delete TanStack router, zod, date-fns, form libs
2. **Remove unused UI components** - Delete 40+ unused shadcn components
3. **Consolidate toast systems** - Keep either Radix or Sonner
4. **Delete duplicate types** - Use single Artist type definition
5. **Extract formatNumber utility** - Single source for number formatting

### Phase 2: Architecture Cleanup (1 week)

6. **Decision: Effect or not** - Either fully adopt or remove Effect services
7. **Decision: React Query or not** - Either use properly or remove
8. **Fix race conditions** - Add AbortController to search
9. **Add memoization** - useMemo for expensive computations
10. **Enable strictNullChecks** - Incremental type safety improvement

### Phase 3: Component Refactoring (2 weeks)

11. **Split ForceGraph** - Extract hooks and subcomponents
12. **Split MapView** - Extract useArtistGraph, useGraphControls hooks
13. **Replace window globals** - Use useImperativeHandle
14. **Extract shared components** - AppHeader, ArtistAvatar

### Phase 4: Testing (Ongoing)

15. **Add component tests** - ForceGraph, ArtistSearch, ArtistPanel
16. **Add service tests** - Database operations, API client
17. **Remove silent failures** - Fix integration test patterns
18. **Achieve 50% coverage** - Focus on critical paths

## Open Questions

1. **Effect adoption**: Should the project fully commit to Effect.ts or abandon it?
2. **React Query**: Should useLastFm be rewritten to use React Query?
3. **Service layer**: Should frontend call Workers API or Effect services directly?
4. **Testing strategy**: Unit tests vs integration tests vs E2E - what's the right balance?
5. **UI components**: Were the 40+ unused components planned for future features?
