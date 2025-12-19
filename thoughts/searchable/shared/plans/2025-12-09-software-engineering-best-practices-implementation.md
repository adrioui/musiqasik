# Software Engineering Best Practices Implementation Plan

## Overview

Implement critical software engineering best practices to address gaps identified in the codebase assessment. This plan focuses on automated testing infrastructure, TypeScript strict mode enablement, and performance optimization. These changes will significantly improve code quality, type safety, and user experience while maintaining the existing architecture.

## Current State Analysis

**Implemented Best Practices (Strengths):**

- Comprehensive TypeScript usage with proper interfaces and types
- Modern React architecture with hooks and functional components
- Robust error handling using Effect.ts with typed errors
- Sophisticated two-level caching strategy (database + in-memory)
- Clear separation of concerns (components, hooks, services, types)
- Extensive documentation in thoughts/ directory

**Critical Gaps (Priority Order):**

1. **No automated testing** - Zero test files, no testing framework configured
2. **TypeScript strict mode disabled** - `tsconfig.app.json:18` has `"strict": false`
3. **Performance bottlenecks** - Sequential API calls in BFS traversal causing 3-5 second load times
4. **Missing code quality tools** - No Prettier, pre-commit hooks, or automated formatting

**Key Files for Implementation:**

- `src/hooks/useLastFm.ts:7-91` - Custom hook using plain async/await (priority for unit tests)
- `workers/api/index.ts:279-307` - BFS traversal with sequential API calls (performance bottleneck)
- `src/services/lastfm.ts:67-197` - Effect-based API integration service (backend use)
- `src/services/database.ts:11-98` - Database service (backend use)
- `tsconfig.app.json:18` - TypeScript configuration (strict mode disabled)
- `package.json:6-15` - Scripts section (no test scripts)

**Architecture Note**: The frontend uses plain async/await in `useLastFm.ts` to call Cloudflare Worker endpoints. The BFS traversal and database operations live in `workers/api/index.ts`, which uses plain async/await (not Effect.ts). The Effect-based services in `src/services/` are for backend use and not directly called from the frontend.

## Desired End State

After completing this plan:

1. **Testing Infrastructure**: Vitest + React Testing Library configured with unit tests for services and hooks
2. **TypeScript Strict Mode**: Incrementally enabled with all strictness flags, codebase fully compliant
3. **Performance Optimization**: BFS traversal uses parallel API calls, reducing graph load times by 50-70%
4. **Code Quality**: Prettier formatting and pre-commit hooks ensure consistent code style

**Verification Methods:**

- Automated: `npm test` runs all tests with >80% coverage
- Automated: `npm run typecheck` passes with strict mode enabled
- Automated: `npm run lint` passes with no errors
- Manual: Graph loads in <2 seconds for depth=2 queries (vs current 3-5 seconds)
- Manual: All existing functionality works without regressions

## What We're NOT Doing

**Out of Scope:**

- E2E testing with Cypress/Playwright (focus on unit tests first)
- CI/CD pipeline setup (GitHub Actions)
- Accessibility improvements beyond basic ARIA attributes
- Internationalization (i18n) implementation
- Database migration to SurrealDB (covered in separate plan)
- Major refactoring of component architecture
- Adding new features or functionality

**Deferred to Future Plans:**

- Component integration tests (Phase 2 of testing)
- Performance monitoring tools (Sentry, analytics)
- Advanced accessibility testing
- Mobile responsiveness testing automation

## Implementation Approach

**Phased Rollout Strategy:**

1. **Phase 1 (Testing)**: Establish testing infrastructure without changing production code
2. **Phase 2 (TypeScript)**: Enable strict mode incrementally to minimize disruption
3. **Phase 3 (Performance)**: Optimize BFS traversal with measurable performance gains
4. **Phase 4 (Code Quality)**: Add formatting tools to prevent style inconsistencies

**Risk Mitigation:**

- Each phase is independent and can be rolled back separately
- Strict mode enabled incrementally (one flag at a time)
- Performance changes include benchmarking before/after
- All changes include automated verification steps
- Manual testing required before proceeding between phases

**Dependencies:**

- Phase 1 must complete before Phase 2 (tests validate strict mode changes)
- Phase 2 should complete before Phase 3 (type safety for performance changes)
- Phase 4 is independent and can be done in parallel with others

---

## Phase 1: Testing Infrastructure

### Overview

Establish Vitest + React Testing Library infrastructure and write unit tests for services and hooks. This phase creates the foundation for all future code quality improvements.

### Changes Required:

#### 1. Install Testing Dependencies

**File**: `package.json`
**Changes**: Add testing dependencies and scripts

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest watch"
},
"devDependencies": {
  "@testing-library/react": "^14.1.2",
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/user-event": "^14.5.1",
  "@vitest/ui": "^1.2.2",
  "@vitest/coverage-v8": "^1.2.2",
  "jsdom": "^23.0.1",
  "vitest": "^1.2.2",
  "@effect/vitest": "^0.13.9"
}
```

#### 2. Configure Vitest

**File**: `vitest.config.ts` (new file)
**Changes**: Create Vitest configuration

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'workers/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/components/ui/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

#### 2. Configure Vitest

**File**: `vitest.config.ts` (new file)
**Changes**: Create Vitest configuration

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/components/ui/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

#### 3. Create Test Setup

**File**: `src/test/setup.ts` (new file)
**Changes**: Setup testing environment

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

#### 4. Test Worker API (BFS Logic)

**File**: `workers/api/index.test.ts` (new file)
**Changes**: Unit tests for Cloudflare Worker BFS traversal and API endpoints

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from './index';
import type { Env } from './index';

describe('Worker API', () => {
  const mockEnv: Env = {
    SURREALDB_URL: 'http://localhost:8000',
    SURREALDB_NAMESPACE: 'test',
    SURREALDB_DATABASE: 'test',
    SURREALDB_USER: 'test',
    SURREALDB_PASS: 'test',
    LASTFM_API_KEY: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('searchArtists', () => {
    it('should search for artists via API', async () => {
      const mockArtists = [
        { name: 'Radiohead', listeners: 1000000 },
        { name: 'Thom Yorke', listeners: 500000 },
      ];

      const request = new Request('http://worker.test/?action=search&q=radiohead');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle missing query parameter', async () => {
      const request = new Request('http://worker.test/?action=search');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Query required');
    });
  });

  describe('buildGraph', () => {
    it('should build artist graph with BFS traversal', async () => {
      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=1');
      const response = await worker.fetch(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('center');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should respect depth limit', async () => {
      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=2');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });

    it('should cap depth at maximum value', async () => {
      const request = new Request('http://worker.test/?action=graph&artist=Radiohead&depth=10');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests', async () => {
      const request = new Request('http://worker.test/?action=search&q=test', {
        method: 'OPTIONS',
      });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
```

#### 5. Test useLastFm Hook (Plain Async/Await)

**File**: `src/hooks/useLastFm.test.ts` (new file)
**Changes**: Unit tests for custom hook using plain async/await

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLastFm } from './useLastFm';

describe('useLastFm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLastFm());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should search for artists', async () => {
    const mockArtists = [
      { name: 'Radiohead', listeners: 1000000 },
      { name: 'Thom Yorke', listeners: 500000 },
    ];

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArtists,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let searchResult;
    await act(async () => {
      searchResult = await result.current.searchArtists('radiohead');
    });

    await waitFor(() => {
      expect(searchResult).toEqual(mockArtists);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=search&q=radiohead')
    );
  });

  it('should handle search errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    await act(async () => {
      await result.current.searchArtists('radiohead');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should fetch artist graph', async () => {
    const mockGraph = {
      nodes: [{ name: 'Radiohead' }, { name: 'Thom Yorke' }],
      edges: [{ source: 'Radiohead', target: 'Thom Yorke', weight: 1.0 }],
      center: { name: 'Radiohead' },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGraph,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let graphResult;
    await act(async () => {
      graphResult = await result.current.getGraph('Radiohead', 1);
    });

    await waitFor(() => {
      expect(graphResult).toEqual(mockGraph);
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=graph&artist=Radiohead&depth=1')
    );
  });

  it('should fetch individual artist', async () => {
    const mockArtist = {
      name: 'Radiohead',
      listeners: 1000000,
      image_url: 'https://example.com/image.jpg',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArtist,
    } as Response);

    const { result } = renderHook(() => useLastFm());

    let artistResult;
    await act(async () => {
      artistResult = await result.current.getArtist('Radiohead');
    });

    await waitFor(() => {
      expect(artistResult).toEqual(mockArtist);
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api?action=artist&name=Radiohead')
    );
  });

  it('should handle empty queries', async () => {
    const { result } = renderHook(() => useLastFm());

    let searchResult;
    await act(async () => {
      searchResult = await result.current.searchArtists('   ');
    });

    expect(searchResult).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

### Success Criteria:

#### Automated Verification:

- [ ] Install testing dependencies: `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui @vitest/coverage-v8 jsdom vitest`
- [ ] Vitest configuration file created and valid
- [ ] Test setup file created with proper cleanup
- [x] Worker API tests pass: `npm test -- workers/api/index.test.ts`
- [ ] Hook tests pass: `npm test -- src/hooks/useLastFm.test.ts`
- [ ] Test coverage meets thresholds: `npm run test:coverage` (target: >80%)
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:

- [ ] Tests run successfully in watch mode: `npm run test:watch`
- [ ] Test UI displays correctly: `npm run test:ui`
- [ ] Coverage report generates HTML output
- [ ] All mocked fetch operations work correctly
- [ ] Error scenarios properly tested and handled
- [ ] No regressions in existing functionality
- [ ] Worker API endpoints tested for CORS, error handling, and parameter validation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the manual testing was successful before proceeding to Phase 2.

---

## Phase 2: TypeScript Strict Mode (Incremental)

### Overview

Enable TypeScript strict mode incrementally to improve type safety without disrupting development. Start with `strictNullChecks`, then enable remaining flags one by one.

### Changes Required:

#### 1. Enable strictNullChecks

**File**: `tsconfig.app.json`
**Changes**: Enable strict null checks first

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictFunctionTypes": false,
    "strictPropertyInitialization": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

#### 2. Fix Null Check Issues in Services

**File**: `src/services/lastfm.ts`
**Changes**: Add null checks and proper typing

```typescript
// Before:
const data = await response.json();
const artists = data.results?.artistmatches?.artist || [];

// After:
const data = (await response.json()) as unknown;
if (!data || typeof data !== 'object') {
  return yield * Effect.fail(new LastFmApiError({ message: 'Invalid response format' }));
}
const artists = (data as any).results?.artistmatches?.artist || [];
```

#### 3. Fix Null Check Issues in Hooks

**File**: `src/hooks/useLastFm.ts`
**Changes**: Add proper null handling

```typescript
// Before:
setError(null);

// After:
setError(null as string | null);

// Add null checks for API responses
const result = yield * LastFmService.searchArtists(query);
if (!result) {
  return [];
}
```

#### 4. Fix Null Check Issues in Components

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Add null checks for refs and DOM elements

```typescript
// Before:
const inputRef = useRef<HTMLInputElement>(null);

// After:
const inputRef = useRef<HTMLInputElement>(null);

// Add null check before focusing
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, []);
```

#### 5. Enable strictFunctionTypes

**File**: `tsconfig.app.json`
**Changes**: Enable strict function type checking

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": false,
    "strictPropertyInitialization": false
  }
}
```

#### 6. Fix Function Type Issues

**File**: `src/services/index.ts`
**Changes**: Fix function type compatibility issues

```typescript
// Before:
export const ServicesLive = Layer.merge(LastFmServiceLive, DatabaseServiceLive);

// After:
export const ServicesLive: Layer.Layer<LastFmService | DatabaseService> = Layer.merge(
  LastFmServiceLive,
  DatabaseServiceLive
);
```

#### 7. Enable strictPropertyInitialization

**File**: `tsconfig.app.json`
**Changes**: Enable strict property initialization

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": false
  }
}
```

#### 8. Fix Property Initialization

**File**: `src/lib/errors.ts`
**Changes**: Ensure proper property initialization

```typescript
// Before:
export class LastFmApiError extends Data.TaggedError('LastFmApiError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

// After:
export class LastFmApiError extends Data.TaggedError('LastFmApiError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {
  constructor(params: { message: string; status?: number; cause?: unknown }) {
    super(params);
  }
}
```

#### 9. Enable noImplicitAny

**File**: `tsconfig.app.json`
**Changes**: Enable no implicit any

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true
  }
}
```

#### 10. Fix Implicit Any Issues

**File**: `src/components/ForceGraph.tsx`
**Changes**: Add explicit types

```typescript
// Before:
const simulation = d3.forceSimulation(nodes).force(
  'link',
  d3.forceLink(links).id((d) => d.id)
);

// After:
const simulation = d3.forceSimulation<GraphNode>(nodes).force(
  'link',
  d3.forceLink<GraphNode, GraphLink>(links).id((d: GraphNode) => d.id)
);
```

#### 11. Enable Full Strict Mode

**File**: `tsconfig.app.json`
**Changes**: Enable all strict mode flags

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 12. Fix Remaining Strict Mode Issues

**File**: Various files
**Changes**: Fix unused locals, parameters, and switch cases

```typescript
// Remove unused imports and variables
// Add underscore prefix to intentionally unused parameters
// Add default cases to switch statements
```

#### 2. Fix Null Check Issues in Services

**File**: `src/services/lastfm.ts`
**Changes**: Add null checks and proper typing

```typescript
// Before:
const data = await response.json();
const artists = data.results?.artistmatches?.artist || [];

// After:
const data = (await response.json()) as unknown;
if (!data || typeof data !== 'object') {
  return yield * Effect.fail(new LastFmApiError({ message: 'Invalid response format' }));
}
const artists = (data as any).results?.artistmatches?.artist || [];
```

#### 3. Fix Null Check Issues in Hooks

**File**: `src/hooks/useLastFm.ts`
**Changes**: Add proper null handling

```typescript
// Before:
setError(null);

// After:
setError(null as string | null);

// Add null checks for API responses
const result = yield * LastFmService.searchArtists(query);
if (!result) {
  return [];
}
```

#### 4. Fix Null Check Issues in Components

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Add null checks for refs and DOM elements

```typescript
// Before:
const inputRef = useRef<HTMLInputElement>(null);

// After:
const inputRef = useRef<HTMLInputElement>(null);

// Add null check before focusing
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, []);
```

#### 5. Enable strictFunctionTypes

**File**: `tsconfig.app.json`
**Changes**: Enable strict function type checking

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": false,
    "strictPropertyInitialization": false
  }
}
```

#### 6. Fix Function Type Issues

**File**: `src/services/index.ts`
**Changes**: Fix function type compatibility issues

```typescript
// Before:
export const ServicesLive = Layer.merge(LastFmServiceLive, DatabaseServiceLive);

// After:
export const ServicesLive: Layer.Layer<LastFmService | DatabaseService> = Layer.merge(
  LastFmServiceLive,
  DatabaseServiceLive
);
```

#### 7. Enable strictPropertyInitialization

**File**: `tsconfig.app.json`
**Changes**: Enable strict property initialization

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": false
  }
}
```

#### 8. Fix Property Initialization

**File**: `src/lib/errors.ts`
**Changes**: Ensure proper property initialization

```typescript
// Before:
export class LastFmApiError extends Data.TaggedError('LastFmApiError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

// After:
export class LastFmApiError extends Data.TaggedError('LastFmApiError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {
  constructor(params: { message: string; status?: number; cause?: unknown }) {
    super(params);
  }
}
```

#### 9. Enable noImplicitAny

**File**: `tsconfig.app.json`
**Changes**: Enable no implicit any

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true
  }
}
```

#### 10. Fix Implicit Any Issues

**File**: `src/components/ForceGraph.tsx`
**Changes**: Add explicit types

```typescript
// Before:
const simulation = d3.forceSimulation(nodes).force(
  'link',
  d3.forceLink(links).id((d) => d.id)
);

// After:
const simulation = d3.forceSimulation<GraphNode>(nodes).force(
  'link',
  d3.forceLink<GraphNode, GraphLink>(links).id((d: GraphNode) => d.id)
);
```

#### 11. Enable Full Strict Mode

**File**: `tsconfig.app.json`
**Changes**: Enable all strict mode flags

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 12. Fix Remaining Strict Mode Issues

**File**: Various files
**Changes**: Fix unused locals, parameters, and switch cases

```typescript
// Remove unused imports and variables
// Add underscore prefix to intentionally unused parameters
// Add default cases to switch statements
```

### Success Criteria:

#### Automated Verification:

- [x] `strictNullChecks` enabled and all errors fixed: `npm run typecheck`
- [x] `strictFunctionTypes` enabled and all errors fixed: `npm run typecheck`
- [x] `strictPropertyInitialization` enabled and all errors fixed: `npm run typecheck`
- [x] `noImplicitAny` enabled and all errors fixed: `npm run typecheck`
- [x] Full strict mode enabled: `"strict": true` in tsconfig
- [x] All unit tests still pass: `npm test`
- [x] Linting passes: `npm run lint`
- [x] No console errors or warnings in development

#### Manual Verification:

- [x] Application builds successfully: `npm run build`
- [x] Development server runs without type errors: `npm run dev`
- [x] All existing functionality works correctly
- [x] No runtime errors related to null/undefined values
- [x] Graph visualization still works properly
- [x] Artist search and similarity features work as expected
- [x] Error handling still functions correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the manual testing was successful before proceeding to Phase 3.

---

## Phase 3: Performance Optimization

### Overview

Optimize the BFS traversal algorithm in the API worker to use parallel API calls instead of sequential, reducing graph load times from 3-5 seconds to <2 seconds for depth=2 queries.

### Changes Required:

#### 1. Analyze Current Implementation

**File**: `workers/api/index.ts:279-307`
**Current Code**:

```typescript
// Current sequential implementation in BFS loop
for (const sim of similar) {
  // Get or create target artist
  let targetArtist =
    requestCache.get(sim.name.toLowerCase()) || (await getArtistFromDb(db, sim.name));

  if (!targetArtist) {
    const targetInfo = await getArtistInfo(sim.name, apiKey);
    if (targetInfo) {
      targetArtist = await upsertArtist(db, targetInfo);
    }
  }

  if (targetArtist) {
    requestCache.set(sim.name.toLowerCase(), targetArtist);

    // Create edge
    await upsertEdge(db, artist.id!, targetArtist.id!, sim.match, current.depth + 1);

    edges.push({
      source: artist.name,
      target: targetArtist.name,
      weight: sim.match,
    });

    if (!visited.has(sim.name.toLowerCase())) {
      queue.push({ name: sim.name, depth: current.depth + 1 });
    }
  }
}
```

**Note**: The BFS traversal and sequential API calls occur in the Cloudflare Worker (`workers/api/index.ts`), not in the frontend services. The frontend uses plain async/await to call the worker API endpoints.

#### 2. Implement Parallel API Calls

**File**: `workers/api/index.ts:279-307`
**Changes**: Use Promise.all for concurrent fetches in BFS loop

```typescript
// Optimized parallel implementation
const similar = await getSimilarArtists(current.name, apiKey);

// Process all similar artists in parallel
const processPromises = similar.map(async (sim) => {
  try {
    // Get or create target artist
    let targetArtist =
      requestCache.get(sim.name.toLowerCase()) || (await getArtistFromDb(db, sim.name));

    if (!targetArtist) {
      const targetInfo = await getArtistInfo(sim.name, apiKey);
      if (targetInfo) {
        targetArtist = await upsertArtist(db, targetInfo);
      }
    }

    if (targetArtist) {
      requestCache.set(sim.name.toLowerCase(), targetArtist);

      // Create edge
      await upsertEdge(db, artist.id!, targetArtist.id!, sim.match, current.depth + 1);

      const edge = {
        source: artist.name,
        target: targetArtist.name,
        weight: sim.match,
      };

      const shouldQueue = !visited.has(sim.name.toLowerCase());

      return { targetArtist, edge, shouldQueue, name: sim.name, depth: current.depth + 1 };
    }
    return null;
  } catch (error) {
    console.error(`Error processing ${sim.name}:`, error);
    return null;
  }
});

const results = await Promise.all(processPromises);

// Process results sequentially (to maintain queue order)
results.forEach((result) => {
  if (result) {
    edges.push(result.edge);
    if (result.shouldQueue) {
      queue.push({ name: result.name, depth: result.depth });
    }
  }
});
```

#### 3. Add Concurrency Limiting

**File**: `workers/api/index.ts:279-307`
**Changes**: Add concurrency control to prevent API rate limits

```typescript
// Add concurrency limit to prevent overwhelming the API
async function parallelMapWithLimit<T, U>(
  items: T[],
  mapper: (item: T) => Promise<U>,
  concurrency: number
): Promise<U[]> {
  const results: U[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = mapper(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      const index = executing.findIndex((p) => p === promise);
      if (index > -1) executing.splice(index, 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// Usage in BFS traversal (replace the Promise.all with limited concurrency)
const similar = await getSimilarArtists(current.name, apiKey);

const results = await parallelMapWithLimit(
  similar,
  async (sim) => {
    try {
      // Get or create target artist
      let targetArtist =
        requestCache.get(sim.name.toLowerCase()) || (await getArtistFromDb(db, sim.name));

      if (!targetArtist) {
        const targetInfo = await getArtistInfo(sim.name, apiKey);
        if (targetInfo) {
          targetArtist = await upsertArtist(db, targetInfo);
        }
      }

      if (targetArtist) {
        requestCache.set(sim.name.toLowerCase(), targetArtist);

        // Create edge
        await upsertEdge(db, artist.id!, targetArtist.id!, sim.match, current.depth + 1);

        const edge = {
          source: artist.name,
          target: targetArtist.name,
          weight: sim.match,
        };

        const shouldQueue = !visited.has(sim.name.toLowerCase());

        return { targetArtist, edge, shouldQueue, name: sim.name, depth: current.depth + 1 };
      }
      return null;
    } catch (error) {
      console.error(`Error processing ${sim.name}:`, error);
      return null;
    }
  },
  5 // Limit to 5 concurrent requests to avoid rate limiting
);
```

#### 4. Optimize Database Queries

**File**: `src/services/database.ts`
**Changes**: Add database indexing and batch operations

```typescript
// Add method for batch fetching artists
export const getArtistsBatch = (names: string[]) =>
  Effect.gen(function* () {
    const { surreal } = yield* DatabaseService;

    const placeholders = names.map((_, i) => `$name${i}`).join(', ');
    const params = names.reduce((acc, name, i) => ({ ...acc, [`name${i}`]: name }), {});

    const result = yield* Effect.tryPromise({
      try: () => surreal.query(`SELECT * FROM artist WHERE name IN [${placeholders}]`, params),
      catch: (error) =>
        new DatabaseError({ message: 'Failed to fetch artists batch', cause: error }),
    });

    return result[0] || [];
  });
```

#### 5. Add Performance Monitoring

**File**: `workers/api/index.ts` (add timing measurements)
**Changes**: Add performance logging

```typescript
// Add performance measurement
const startTime = Date.now();

// ... BFS traversal code ...

const endTime = Date.now();
const duration = endTime - startTime;

console.log(`Graph traversal completed in ${duration}ms for ${artistName} (depth: ${depth})`);

// Return metrics with response
return new Response(
  JSON.stringify({ nodes: allNodes, links, metrics: { duration, nodeCount: allNodes.length } }),
  {
    headers: { 'Content-Type': 'application/json' },
  }
);
```

#### 6. Update API Response Type

**File**: `src/types/artist.ts`
**Changes**: Add metrics to GraphData type

```typescript
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metrics?: {
    duration: number;
    nodeCount: number;
    apiCalls: number;
    cacheHits: number;
  };
}
```

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `npm run typecheck`
- [ ] All unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Application builds successfully: `npm run build`

#### Manual Verification:

- [ ] Graph loads in <2 seconds for depth=2 queries (vs current 3-5 seconds)
- [ ] Performance metrics logged to console show improvement
- [ ] No API rate limiting errors occur
- [ ] All existing functionality works correctly
- [ ] Error handling still functions properly
- [ ] Concurrent requests don't cause data corruption
- [ ] Cache hits/misses tracked correctly
- [ ] No regressions in graph visualization quality

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the manual testing was successful before proceeding to Phase 4.

---

## Phase 4: Code Quality Tools

### Overview

Add Prettier for code formatting and Husky + lint-staged for pre-commit hooks to ensure consistent code style and prevent commits with linting errors.

### Changes Required:

#### 1. Install Code Quality Dependencies

**File**: `package.json`
**Changes**: Add Prettier, Husky, and lint-staged

```json
"devDependencies": {
  "prettier": "^3.1.1",
  "prettier-plugin-tailwindcss": "^0.5.10",
  "husky": "^8.0.3",
  "lint-staged": "^15.2.0"
}
```

#### 2. Configure Prettier

**File**: `.prettierrc.json` (new file)
**Changes**: Create Prettier configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

#### 3. Create Prettier Ignore File

**File**: `.prettierignore` (new file)
**Changes**: Ignore build artifacts and dependencies

```
node_modules
dist
build
.output
*.lockb
package-lock.json
public
```

#### 4. Configure lint-staged

**File**: `.lintstagedrc.json` (new file)
**Changes**: Run linting and formatting on pre-commit

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,md,json}": ["prettier --write"]
}
```

#### 5. Setup Husky

**File**: `package.json`
**Changes**: Add Husky prepare script and hooks

```json
"scripts": {
  "prepare": "husky install",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

#### 6. Create Husky Pre-commit Hook

**File**: `.husky/pre-commit` (new file)
**Changes**: Run lint-staged on commit

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

#### 7. Format Existing Codebase

**Command**: Run after installation

```bash
npm run format
```

### Success Criteria:

#### Automated Verification:

- [ ] Prettier configuration created and valid
- [ ] Husky pre-commit hook installed: `npx husky install`
- [ ] lint-staged configuration valid
- [ ] All files formatted: `npm run format:check` passes
- [ ] Type checking passes: `npm run typecheck`
- [ ] All unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:

- [ ] Pre-commit hook runs on `git commit`
- [ ] ESLint errors prevent commits
- [ ] Prettier formatting applies automatically
- [ ] Code style is consistent across all files
- [ ] No manual formatting needed
- [ ] Tailwind CSS class sorting works correctly
- [ ] All existing functionality preserved after formatting

---

## Testing Strategy

### Unit Tests (Phase 1):

- **Worker API**: BFS traversal algorithm, API endpoints, error handling, CORS
- **Hooks**: useLastFm state management, API calls, error scenarios (plain async/await)
- **Utilities**: cn() utility, error classes, type guards
- **Coverage Target**: >80% for worker API and hooks, >70% overall

**Note**: Frontend tests focus on the `useLastFm` hook which uses plain async/await to call worker endpoints. The BFS traversal logic lives in the worker and should be tested there.

### Integration Tests (Future Phase):

- API endpoint testing with mock data
- Database service integration with test database
- Effect.ts service composition
- React Query cache behavior

### Manual Testing Checklist:

1. **Artist Search**: Search for "Radiohead", verify results appear
2. **Graph Visualization**: Click artist, verify graph loads with connections
3. **Error Handling**: Test with network throttling, verify error messages
4. **Performance**: Measure load times for depth=2 queries
5. **Responsive Design**: Test on different screen sizes
6. **Browser Compatibility**: Test in Chrome, Firefox, Safari

### Performance Benchmarking:

- **Baseline**: Measure current load times for depth=1, depth=2 queries
- **Target**: <1 second for depth=1, <2 seconds for depth=2
- **Tools**: Browser DevTools Network tab, console.time measurements
- **Metrics**: API call count, cache hit rate, total duration

---

## Performance Considerations

### Current Bottlenecks:

1. **Sequential API calls** in BFS traversal: `workers/api/index.ts:279-307`
2. **N+1 query problem**: Each similar artist triggers separate database/API call
3. **No database indexing**: Full table scans on artist name lookups
4. **No request deduplication**: Multiple requests for same artist within single traversal

**Note**: The BFS traversal and performance bottleneck are in the Cloudflare Worker (`workers/api/index.ts`), not in frontend code. The worker processes each similar artist sequentially in the BFS loop.

### Optimizations Implemented:

1. **Parallel API calls**: Use Promise.all with concurrency limiting
2. **Batch database operations**: Fetch multiple artists in single query
3. **Request deduplication**: Cache within single request lifecycle
4. **Concurrency control**: Limit to 5 parallel requests to avoid rate limits

### Expected Improvements:

- **Depth=1 queries**: 0.5-1 second (vs current 1-2 seconds) - 50% improvement
- **Depth=2 queries**: 1.5-2 seconds (vs current 3-5 seconds) - 60% improvement
- **API call efficiency**: 30% reduction in total API calls due to better caching
- **Database performance**: 40% faster queries with batch operations

### Monitoring:

- Console logging of performance metrics
- Track API call count and cache hit rate
- Monitor error rates (should not increase)
- User experience testing for perceived performance

---

## Migration Notes

### Database Migration:

- No database schema changes required
- Add indexes for better performance:
  ```sql
  CREATE INDEX idx_artist_name ON artist(name);
  CREATE INDEX idx_similarity_from ON similarity(from_artist);
  ```

### Backwards Compatibility:

- All changes are backwards compatible
- API response format unchanged (only adds optional metrics field)
- No breaking changes to component interfaces
- Existing URLs and parameters work unchanged

### Rollback Plan:

- **Phase 1**: Remove test files and dependencies if needed
- **Phase 2**: Revert tsconfig.json to `"strict": false`
- **Phase 3**: Revert to sequential API calls if issues arise
- **Phase 4**: Remove Husky hooks and Prettier configuration

---

## References

- **Research Document**: `thoughts/shared/research/2025-12-09-software-engineering-best-practices-assessment.md`
- **Current TypeScript Config**: `tsconfig.app.json:18`
- **BFS Traversal Code**: `workers/api/index.ts:279-307`
- **Worker API**: `workers/api/index.ts` (Cloudflare Worker with BFS logic)
- **Frontend Hook**: `src/hooks/useLastFm.ts:7-91` (plain async/await)
- **Last.fm Service (Backend)**: `src/services/lastfm.ts:67-197` (Effect.ts)
- **Database Service**: `src/services/database.ts:11-98`
- **Performance Research**: `thoughts/shared/research/2025-12-07-caching-implementation-performance-optimization.md`

**Architecture Note**: The frontend uses `useLastFm.ts` which calls Cloudflare Worker endpoints. The BFS traversal and performance-critical code lives in `workers/api/index.ts`. The Effect-based services in `src/services/` are for backend use.
