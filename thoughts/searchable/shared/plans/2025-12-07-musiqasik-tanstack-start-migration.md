# MusiqasiQ TanStack Start Migration Plan

**Status**: 🚫 **BLOCKED** - Version Compatibility Issues  
**Date**: 2025-12-07  
**Last Updated**: 2025-12-07

**Note**: Code samples in this document are **blueprints**, not copy-paste final code. Always align with the current TanStack Start API and local types when implementing.

## Critical Blockers

### Version Incompatibility Issue

The TanStack Start migration is currently **blocked** due to fundamental version misalignment in the TanStack ecosystem. Attempted solutions (version pinning, npm overrides) have failed.

**Core Problem**: TanStack Start v1.120.20 depends on multiple internal packages with different release cycles:

- `@tanstack/start-config@1.120.20` depends on:
  - `@tanstack/react-start-plugin@1.131.50` (newer)
  - `@tanstack/start-plugin-core@1.131.50` (newer)
  - `@tanstack/router-plugin@1.131.50` (newer)
- npm resolves `@tanstack/router-generator` to v1.140.0 (latest)
- These versions have **breaking API changes** and incompatible exports

**Error Encountered**:

```
SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'CONSTANTS'
SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'Generator'
```

**Known Issues**:

- https://github.com/TanStack/router/issues/4380
- https://github.com/TanStack/router/issues/4190

**Impact**: This is a known issue in the TanStack ecosystem. The framework is in rapid development with frequent breaking changes between packages.

### Decision Required

Before proceeding with this migration plan, **choose one of the following paths**:

**Option A: Pause Migration** ⭐ **RECOMMENDED**

- Monitor TanStack Start releases for stable version alignment
- Check TanStack Discord/GitHub for working version combinations
- Keep current Vite SPA architecture
- Revisit migration in 2-3 months when ecosystem stabilizes

**Option B: Attempt Workaround**

- Clone official TanStack Start example: https://github.com/TanStack/router/tree/main/examples/react/start-basic
- Copy exact `package.json` dependencies from working example
- Incrementally add project dependencies
- Test at each step
- **Risk**: High - may encounter additional breaking changes

**Option C: Alternative Framework**

- **Remix** - Mature, stable SSR framework
- **Next.js** - Well-established with Cloudflare adapter
- **Astro** - Good for content-heavy sites with React islands
- **Impact**: Requires different migration plan

**Option D: Enhanced Vite SPA**

- Keep current Vite React SPA architecture
- Add client-side URL state management manually
- Use React Query more extensively for caching
- Deploy to Cloudflare Pages (static) instead of Workers
- **Impact**: No SSR, but avoids framework instability

**Recommendation**: **Option A (Pause)** - The TanStack ecosystem is too unstable for production migration at this time. The version fragmentation makes reliable dependency resolution impossible.

## Overview

Migrate MusiqasiQ from Vite React SPA to TanStack Start architecture with Cloudflare deployment, preserving Supabase PostgreSQL backend. This big bang migration will transform the application from client-only to isomorphic execution, enabling SSR, streaming, and type-safe server functions while maintaining the existing UI and functionality.

**Migration Scope**: Complete rewrite of routing, data layer, and server integration while preserving UI components and visual design.

## Current State Analysis

### Architecture

- **Frontend**: Vite React SPA with React Router DOM v6
- **Routing**: Code-based routing in `src/App.tsx:19-22` with 3 routes
- **Data Fetching**: Custom `useLastFm` hook (`src/hooks/useLastFm.ts:7-92`) with `useState`/`useCallback`
- **State Management**: Local component state, minimal React Query usage
- **Server Layer**: Supabase Edge Function (`supabase/functions/lastfm/index.ts:37-269`) with caching
- **UI State**: Depth, threshold, showLabels stored in React state (not URL)

### Key Constraints

- Must maintain Supabase PostgreSQL database schema
- Must preserve D3.js graph visualization functionality
- Must maintain shadcn/ui component library
- Must support Cloudflare Workers runtime (no Node.js APIs)

### Key Discoveries

- React Query is configured but not actively used for data fetching
- All API calls go through single Edge Function endpoint
- UI controls (depth, threshold, showLabels) are not URL-shareable
- Artist names are URL-encoded but other state is lost on refresh
- No authentication or protected routes

## Desired End State

### Architecture

- **Framework**: TanStack Start with file-based routing
- **Deployment**: Cloudflare Workers with edge runtime
- **Data Layer**: Route loaders with React Query integration
- **Server Functions**: Type-safe RPCs replacing Edge Function
- **State Management**: URL-driven state for UI controls
- **Performance**: SSR for initial load, streaming for non-critical data

### Verification Criteria

- All routes work with proper SSR and hydration
- Artist search, graph visualization, and controls function identically
- URL contains all UI state (depth, threshold, showLabels)
- Deep linking to specific graph views works
- Build succeeds for Cloudflare Workers
- Performance metrics improve (FCP, LCP)

## What We're NOT Doing

- **Database Migration**: Keeping Supabase PostgreSQL, only changing access layer
- **UI Redesign**: Preserving all existing components and visual design
- **Feature Additions**: No new features beyond migration requirements
- **Authentication**: No auth system implementation (remains public)
- **Testing Infrastructure**: No automated tests (manual verification only)

## Implementation Approach

**⚠️ IMPORTANT**: This migration plan is **on hold** until TanStack Start version compatibility issues are resolved. See "Critical Blockers" section above.

Big bang migration with 6 phases:

1. Infrastructure setup and configuration
2. File-based routing with URL state management
3. Server functions migration from Edge Function
4. Data layer with route loaders and React Query
5. UI component updates for Suspense and error handling
6. Cloudflare deployment and performance optimization

**Migration Strategy**: This will be done on a feature branch (`tanstack-start-migration`). The existing Vite SPA on `main` branch remains the production deployment until all phases pass verification.

**Branch Strategy**:

- **Feature branch**: Flip scripts to Vinxi (`dev/build/start/preview`) when ready to test TanStack Start
- **Main branch**: Keep Vite SPA scripts until migration is complete and verified
- **Production**: Deploy TanStack Start to Cloudflare Workers from feature branch first, then merge to main

**Rollback Plan**:

- Keep original Vite SPA in `main` branch as permanent fallback option
- Deploy TanStack Start to preview environment first (e.g., `preview.musiqasik.com`)
- Monitor for 24 hours before production cutover
- Quick rollback via Cloudflare dashboard or git revert if issues arise
- Vite SPA can be redeployed to original hosting if needed

## Phase 1: Infrastructure Setup

### Overview

Set up TanStack Start project structure, configure Cloudflare adapter, and establish Supabase client for edge runtime.

### Changes Required

**⚠️ WARNING**: The package versions below are **NOT compatible** due to TanStack ecosystem version fragmentation. These versions will cause runtime import errors. See "Critical Blockers" section.

#### 1.1 Package Dependencies

**File**: `package.json`
**Changes**: Add TanStack Start dependencies alongside existing ones. Keep current versions of `@tanstack/react-query` (^5.83.0) and `@supabase/supabase-js` (^2.86.2).

````json
{
  "dependencies": {
    "@tanstack/react-router": "^1.87.0",
    "@tanstack/router-plugin": "^1.87.0",
    "@tanstack/start": "^1.87.0",
    "vinxi": "^0.4.3"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "^0.1.0"
  }
}

**CRITICAL**: These version numbers are **placeholders**. Due to TanStack Start's internal dependency version mismatches, you MUST:
1. Find a working version combination from official examples
2. Use exact versions (not ranges) to prevent npm from resolving incompatible versions
3. Test `npm install` and `npm run dev` immediately after installing
4. Be prepared to adjust versions multiple times

**DO NOT** proceed to Phase 2 until Phase 1 automated verification passes without errors.

**Note**: Existing dependencies `@tanstack/react-query` (^5.83.0), `@supabase/supabase-js` (^2.86.2), and `zod` (^3.25.76) are already installed and should be kept at their current versions.

#### 1.2 Vite Configuration
**File**: `vite.config.ts`
**Changes**: Update Vite config to work with TanStack Start. The main Cloudflare configuration will be in `app.config.ts` (Phase 6), so keep this minimal.

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
````

**Note**: Full Cloudflare Workers configuration will be handled in `app.config.ts` during Phase 6. Follow the official TanStack Start + Cloudflare example for the latest recommended setup.

#### 1.3 Cloudflare Configuration

**File**: `wrangler.toml` (new)
**Changes**: Create Cloudflare Workers configuration

```toml
name = "musiqasik"
main = "./.output/server/index.mjs"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = "./public"

[env.production.vars]
SUPABASE_URL = ""
SUPABASE_ANON_KEY = ""
LASTFM_API_KEY = ""
```

**Note**: Environment variable access patterns (`process.env` vs `env` bindings) should follow the official TanStack Start + Cloudflare example for the version being used. The `process.env` usage in this document is **pseudocode** and may need adjustment based on the current recommended approach. With `nodejs_compat`, `process.env` should work, but verify the recommended pattern.

**Security**: Server functions must never expose `SUPABASE_SERVICE_ROLE_KEY` to the client bundle. If Option B is adopted in the future, ensure service role key access remains server-only.

#### 1.4 Supabase Client for Edge Runtime

**File**: `src/lib/supabase.ts` (new)
**Changes**: Create edge-compatible Supabase client. **Important**: This uses the anon key for read-only access. For write operations (caching), you'll need a server-only client with service role key.

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // No localStorage in edge runtime
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'musiqasik-tanstack-start',
    },
  },
});
```

**Decision**: **Option A** is locked in for this migration. The Supabase Edge Function will remain as the write/cache layer. TanStack server functions will call the Edge Function HTTP endpoint directly, not re-implement BFS + caching logic.

**Option B** (migrating BFS logic fully into TanStack server functions) is explicitly **out of scope** for this plan and should be considered in a future refactor after the TanStack Start migration is complete and stable.

#### 1.5 Application Root

**File**: `src/routes/__root.tsx` (new)
**Changes**: Create root route with providers

```typescript
import { createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { Meta, Scripts, Outlet } from '@tanstack/start'
import appCss from '@/index.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'MusiqasiQ - Artist Similarity Explorer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

#### 1.6 Router Creation and Context Wiring

**File**: `src/main.tsx` (modified) or app entrypoint
**Changes**: Create router with queryClient in context

```typescript
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/query-client';

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

**Note**: The `queryClient` should come from context (passed to router), not imported directly in loaders. Loaders should destructure `context: { queryClient }` from their arguments.

### Success Criteria

#### Automated Verification:

- [ ] Dependencies install: `npm install`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint`

**⚠️ CRITICAL**: The first automated verification (`npm install`) is where version compatibility issues will appear. If you see errors like:

- `SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'CONSTANTS'`
- `SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'Generator'`

**STOP IMMEDIATELY** and revisit the "Critical Blockers" section. Do not proceed to manual verification until these errors are resolved.

#### Manual Verification:

- [ ] Development server starts: `npm run dev`
- [ ] Root route renders without errors
- [ ] Cloudflare build preview succeeds
- [ ] Supabase client connects in edge runtime

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: File-Based Routing & URL State

### Overview

Migrate from code-based routing to TanStack Start file-based routing. Implement URL state management for UI controls (depth, threshold, showLabels).

### Changes Required

#### 2.1 Home Route

**File**: `src/routes/index.tsx` (new)
**Changes**: Migrate Index page to file-based route

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ArtistSearch } from '@/components/ArtistSearch'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            MusiqasiQ
          </h1>
          <p className="text-xl text-slate-300">
            Explore artist connections through interactive similarity graphs
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          <ArtistSearch />
        </div>
      </div>
    </div>
  )
}
```

#### 2.2 Artist Map Route with URL State

**File**: `src/routes/artist/$artistName.tsx` (new)
**Changes**: Migrate MapView with URL state for controls

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { MapView } from '@/pages/MapView'

// URL state schema for UI controls
const searchSchema = z.object({
  depth: z.coerce.number().int().min(1).max(3).default(1),
  threshold: z.coerce.number().min(0).max(100).default(0),
  showLabels: z.coerce.boolean().default(true),
})

export const Route = createFileRoute('/artist/$artistName')({
  validateSearch: searchSchema,
  beforeLoad: ({ params }) => {
    // Validate artist name parameter
    if (!params.artistName || params.artistName.trim() === '') {
      throw redirect({ to: '/' })
    }
  },
  component: ArtistMapComponent,
})

function ArtistMapComponent() {
  const { artistName } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Update URL when controls change
  const updateControls = (updates: Partial<z.infer<typeof searchSchema>>) => {
    navigate({
      search: {
        ...search,
        ...updates,
      },
    })
  }

  return (
    <MapView
      artistName={decodeURIComponent(artistName)}
      depth={search.depth}
      threshold={search.threshold}
      showLabels={search.showLabels}
      onControlsChange={updateControls}
    />
  )
}
```

#### 2.3 Not Found Route

**File**: `src/routes/not-found.tsx` (new)
**Changes**: Migrate 404 page

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/not-found')({
  component: NotFoundComponent,
})

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Artist not found in the musical universe
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Return to Search
        </Link>
      </div>
    </div>
  )
}
```

#### 2.4 Catch-All Route

**File**: `src/routes/$.tsx` (new)
**Changes**: Redirect all unmatched routes to not-found

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/$')({
  loader: () => {
    throw redirect({ to: '/not-found' });
  },
});
```

#### 2.5 Update MapView Component

**File**: `src/pages/MapView.tsx`
**Changes**: Accept controls as props instead of managing state internally

```typescript
interface MapViewProps {
  artistName: string;
  depth: number;
  threshold: number;
  showLabels: boolean;
  onControlsChange: (updates: { depth?: number; threshold?: number; showLabels?: boolean }) => void;
}

export function MapView({
  artistName,
  depth,
  threshold,
  showLabels,
  onControlsChange,
}: MapViewProps) {
  // Remove local state for depth, threshold, showLabels
  // Use props instead

  const handleDepthChange = (newDepth: number) => {
    onControlsChange({ depth: newDepth });
  };

  const handleThresholdChange = (newThreshold: number) => {
    onControlsChange({ threshold: newThreshold });
  };

  const handleShowLabelsChange = (show: boolean) => {
    onControlsChange({ showLabels: show });
  };

  // Rest of component uses props instead of state
}
```

### Success Criteria

#### Automated Verification:

- [ ] Route tree generates: `npm run dev` (check console for route generation)
- [ ] Type checking passes: `npm run typecheck`
- [ ] No unused imports: `npm run lint`

#### Manual Verification:

- [ ] Home route `/` renders search interface
- [ ] Artist route `/artist/:name` renders graph
- [ ] URL parameters update when controls change
- [ ] Deep linking works (e.g., `/artist/The%20Beatles?depth=2&threshold=50&showLabels=true`)
- [ ] Invalid routes redirect to `/not-found`
- [ ] Browser back/forward navigation works correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Server Functions Migration

### Overview

Create TanStack Start server functions that provide type-safe RPCs for search, graph, and artist endpoints by calling the existing Supabase Edge Function over HTTP (**Option A**). The Supabase Edge Function remains the source of truth for BFS traversal and database caching.

### Changes Required

#### 3.1 Server Function Utilities

**File**: `src/lib/server-utils.ts` (new)
**Changes**: Create shared server function utilities

```typescript
import { createServerFn } from '@tanstack/start';

// Environment variable validation and function URL construction
export function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set');
  }
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/lastfm`;
  return { FUNCTION_URL };
}

// Error handling wrapper
export function createApiServerFn<TInput, TOutput>(handler: (input: TInput) => Promise<TOutput>) {
  return createServerFn({ method: 'POST' }).handler(handler);
}

// Helper to call Supabase Edge Function over HTTP
export async function callEdgeFunction<TOutput>(path: string): Promise<TOutput> {
  const { FUNCTION_URL } = getEnv();
  const response = await fetch(`${FUNCTION_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Edge function error: ${response.status}`);
  }

  return response.json() as Promise<TOutput>;
}
```

#### 3.2 Artist Search Server Function

**File**: `src/lib/server/search-artists.ts` (new)
**Changes**: Migrate search functionality

```typescript
import { z } from 'zod';
import { createApiServerFn, callEdgeFunction } from './server-utils';

const searchInputSchema = z.object({
  query: z.string().min(1).max(100),
});

export type SearchArtistsInput = z.infer<typeof searchInputSchema>;

export const searchArtists = createApiServerFn<SearchArtistsInput, Artist[]>(async ({ query }) => {
  const encodedQuery = encodeURIComponent(query.trim());

  // Delegate to existing Supabase Edge Function (Option A)
  return callEdgeFunction<Artist[]>(`?action=search&q=${encodedQuery}`);
}).inputValidator(searchInputSchema);
```

#### 3.3 Graph Data Server Function

**File**: `src/lib/server/get-graph.ts` (new)
**Changes**: Wrap existing Supabase Edge Function graph endpoint (BFS + caching)

```typescript
import { z } from 'zod';
import { createApiServerFn, callEdgeFunction } from './server-utils';

const graphInputSchema = z.object({
  artistName: z.string().min(1),
  depth: z.coerce.number().int().min(1).max(3).default(1),
});

export type GetGraphInput = z.infer<typeof graphInputSchema>;

export const getGraph = createApiServerFn<GetGraphInput, GraphData>(
  async ({ artistName, depth }) => {
    const encodedArtist = encodeURIComponent(artistName.trim());

    // Delegate BFS traversal and caching to Supabase Edge Function (Option A)
    return callEdgeFunction<GraphData>(`?action=graph&artist=${encodedArtist}&depth=${depth}`);
  }
).inputValidator(graphInputSchema);
```

#### 3.4 Artist Info Server Function

**File**: `src/lib/server/get-artist.ts` (new)
**Changes**: Migrate artist details endpoint

```typescript
import { z } from 'zod';
import { createApiServerFn, callEdgeFunction } from './server-utils';

const artistInputSchema = z.object({
  name: z.string().min(1),
});

export type GetArtistInput = z.infer<typeof artistInputSchema>;

export const getArtist = createApiServerFn<GetArtistInput, Artist | null>(async ({ name }) => {
  const encodedName = encodeURIComponent(name.trim());

  const artist = await callEdgeFunction<Artist | null>(`?action=artist&name=${encodedName}`);

  if (!artist) {
    throw new Error(`Artist not found: ${name}`);
  }

  return artist;
}).inputValidator(artistInputSchema);
```

### Success Criteria

#### Automated Verification:

- [ ] Server functions compile: `npm run build`
- [ ] Type checking passes: `npm run typecheck`
- [ ] No linting errors: `npm run lint`

#### Manual Verification:

- [ ] Server functions appear in build output
- [ ] Environment variables load correctly
- [ ] Functions can be called from client code
- [ ] Error handling works for invalid inputs
- [ ] Supabase Edge Function responds correctly for search, graph, and artist actions when called from server functions

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Data Layer with Route Loaders

### Overview

Implement route loaders that use React Query with server functions. Add Suspense boundaries for loading states.

### Changes Required

#### 4.1 Query Client Configuration

**File**: `src/lib/query-client.ts` (new)
**Changes**: Configure React Query for SSR/hydration

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
```

#### 4.2 Query Options

**File**: `src/lib/queries.ts` (new)
**Changes**: Create query options for server functions

```typescript
import { queryOptions } from '@tanstack/react-query';
import { searchArtists, getGraph, getArtist } from './server';
import type { SearchArtistsInput, GetGraphInput, GetArtistInput } from './server';

export const artistsQueries = {
  search: (input: SearchArtistsInput) =>
    queryOptions({
      queryKey: ['artists', 'search', input.query],
      queryFn: () => searchArtists(input),
      enabled: input.query.length >= 2,
    }),

  graph: (input: GetGraphInput) =>
    queryOptions({
      queryKey: ['artists', 'graph', input.artistName, input.depth],
      queryFn: () => getGraph(input),
    }),

  detail: (input: GetArtistInput) =>
    queryOptions({
      queryKey: ['artists', 'detail', input.name],
      queryFn: () => getArtist(input),
    }),
};
```

#### 4.3 Home Route Loader

**File**: `src/routes/index.tsx`
**Changes**: Add loader for initial data

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  loader: ({ context }) => {
    // Preload any initial data if needed
    // const { queryClient } = context
    return {};
  },
  component: HomeComponent,
});
```

**Note**: Loaders should destructure `context: { queryClient }` from arguments, not import `queryClient` directly. This ensures the same QueryClient instance is used across server and client.

#### 4.4 Artist Map Route Loader

**File**: `src/routes/artist/$artistName.tsx`
**Changes**: Add loader that fetches graph data

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';
import { queryClient } from '@/lib/query-client';
import { artistsQueries } from '@/lib/queries';

export const Route = createFileRoute('/artist/$artistName')({
  validateSearch: searchSchema,
  loader: async ({ params, context: { queryClient }, location }) => {
    const search = searchSchema.parse(location.search);

    // Preload graph data
    await queryClient.ensureQueryData(
      artistsQueries.graph({
        artistName: decodeURIComponent(params.artistName),
        depth: search.depth,
      })
    );

    return {
      artistName: params.artistName,
      search,
    };
  },
  beforeLoad: ({ params }) => {
    if (!params.artistName || params.artistName.trim() === '') {
      throw redirect({ to: '/' });
    }
  },
  component: ArtistMapComponent,
});
```

#### 4.5 Update MapView Component for Suspense

**File**: `src/pages/MapView.tsx`
**Changes**: Use useSuspenseQuery and add Suspense boundary

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { artistsQueries } from '@/lib/queries';
import { Route } from '@/routes/artist/$artistName';

export function MapView({
  artistName,
  depth,
  threshold,
  showLabels,
  onControlsChange,
}: MapViewProps) {
  const { data: graphData } = useSuspenseQuery(artistsQueries.graph({ artistName, depth }));

  // Component uses graphData directly (no loading state needed)
  // Suspense boundary handles loading
}
```

#### 4.6 Add Suspense Boundary

**File**: `src/routes/artist/$artistName.tsx`
**Changes**: Wrap component in Suspense

```typescript
import { Suspense } from 'react'
import { MapViewSkeleton } from '@/components/MapViewSkeleton'

function ArtistMapComponent() {
  const { artistName } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateControls = (updates: Partial<z.infer<typeof searchSchema>>) => {
    navigate({
      search: {
        ...search,
        ...updates,
      },
    })
  }

  return (
    <Suspense fallback={<MapViewSkeleton />}>
      <MapView
        artistName={decodeURIComponent(artistName)}
        depth={search.depth}
        threshold={search.threshold}
        showLabels={search.showLabels}
        onControlsChange={updateControls}
      />
    </Suspense>
  )
}
```

### Success Criteria

#### Automated Verification:

- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint`

#### Manual Verification:

- [ ] Route loader executes on server during SSR
- [ ] Data is available immediately (no loading spinner on initial load)
- [ ] Suspense fallback shows during navigation
- [ ] React Query cache hydrates correctly
- [ ] No duplicate API calls on hydration

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: UI Component Updates

### Overview

Update UI components to work with new data layer. Add error boundaries and improve loading states.

### Changes Required

#### 5.1 Artist Search Component Update

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Use React Query instead of custom hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { artistsQueries } from '@/lib/queries';
import { useNavigate } from '@tanstack/react-router';

export function ArtistSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useQuery({
    ...artistsQueries.search({ query }),
    enabled: query.length >= 2,
  });

  const handleArtistSelect = (artist: Artist) => {
    navigate({
      to: '/artist/$artistName',
      params: { artistName: encodeURIComponent(artist.name) },
    });
  };

  // Rest of component remains similar
}
```

#### 5.2 Error Boundary

**File**: `src/components/ErrorBoundary.tsx` (new)
**Changes**: Create error boundary for route errors

```typescript
import { Component, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 text-red-400">
              Something went wrong
            </h1>
            <p className="text-slate-300 mb-8">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Return to Search
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

#### 5.3 Update Root Route with Error Boundary

**File**: `src/routes/__root.tsx`
**Changes**: Add error boundary to root

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  )
}
```

#### 5.4 Loading Skeletons

**File**: `src/components/MapViewSkeleton.tsx` (new)
**Changes**: Create skeleton for map view loading state

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function MapViewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="w-80 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>

          {/* Graph area skeleton */}
          <div className="flex-1">
            <Skeleton className="h-96 w-full rounded-lg" />
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Success Criteria

#### Automated Verification:

- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint`

#### Manual Verification:

- [ ] Artist search works with debouncing
- [ ] Search results display correctly
- [ ] Error boundary catches and displays errors
- [ ] Loading skeletons appear during navigation
- [ ] All UI controls function correctly
- [ ] No visual regressions from original design

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Cloudflare Deployment & Optimization

### Overview

Configure Cloudflare deployment, optimize for edge runtime, and verify production build.

### Changes Required

#### 6.1 Build Configuration

**File**: `app.config.ts` (new)
**Changes**: Create TanStack Start app config. This becomes the source of truth for TanStack Start + Cloudflare configuration.

```typescript
import { defineConfig } from '@tanstack/start/config';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  vite: {
    plugins: [
      cloudflare({
        wrangler: {
          configPath: './wrangler.toml',
        },
      }),
    ],
  },
  server: {
    preset: 'cloudflare-workers',
  },
});
```

**Note**: This configuration supersedes the Vite config for TanStack Start-specific settings. Keep `vite.config.ts` minimal (as defined in Phase 1.2) and maintain all Cloudflare/TanStack configuration here.

#### 6.2 Environment Variables

**File**: `.dev.vars` (new)
**Changes**: Local development environment variables

```bash
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
LASTFM_API_KEY="your-lastfm-api-key"
```

#### 6.3 Build Scripts

**File**: `package.json`
**Changes**: Update build scripts for TanStack Start

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start",
    "preview": "vinxi preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

#### 6.4 Performance Optimization

**File**: `src/lib/query-client.ts`
**Changes**: Optimize React Query for edge runtime

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1, // Single retry for network hiccups
    },
  },
});
```

#### 6.5 SEO Optimization

**File**: `src/routes/artist/$artistName.tsx`
**Changes**: Add SEO meta tags

```typescript
export const Route = createFileRoute('/artist/$artistName')({
  head: ({ params }) => ({
    meta: [
      {
        title: `${decodeURIComponent(params.artistName)} - Artist Connections | MusiqasiQ`,
      },
      {
        name: 'description',
        content: `Explore musical connections and similar artists to ${decodeURIComponent(params.artistName)}`,
      },
      {
        property: 'og:title',
        content: `${decodeURIComponent(params.artistName)} - Artist Connections`,
      },
      {
        property: 'og:description',
        content: `Interactive similarity graph for ${decodeURIComponent(params.artistName)}`,
      },
    ],
  }),
  // ... rest of route config
});
```

### Success Criteria

#### Automated Verification:

- [ ] Development build succeeds: `npm run build`
- [ ] Production build succeeds: `npm run build -- --mode production`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Build output is under Cloudflare Workers size limit (10MB)

#### Manual Verification:

- [ ] Application deploys to Cloudflare Workers
- [ ] All routes work in production
- [ ] Performance metrics improve (FCP, LCP)
- [ ] Deep linking works in production
- [ ] No console errors in production
- [ ] Mobile responsiveness maintained

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests

- **Not implemented**: Project has no testing infrastructure
- **Manual verification**: All functionality tested manually

### Integration Tests

- **API Integration**: Verify server functions call Last.fm API correctly
- **Database Integration**: Verify Supabase caching works
- **Routing Integration**: Verify all navigation paths work

### Manual Testing Checklist

#### Core Functionality

- [ ] Artist search with autocomplete works
- [ ] Search results display artist images and info
- [ ] Clicking artist navigates to graph view
- [ ] Graph renders with D3.js force simulation
- [ ] Nodes are clickable to select artists
- [ ] Graph controls (depth, threshold, labels) work
- [ ] Controls update URL parameters
- [ ] Deep linking loads correct graph state
- [ ] Browser back/forward navigation works
- [ ] 404 page shows for invalid routes

#### Performance

- [ ] Initial page load shows content quickly (SSR)
- [ ] No loading spinners on initial render
- [ ] Graph interactions are smooth
- [ ] No memory leaks on navigation
- [ ] Bundle size is reasonable

#### Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Invalid artist names redirect to home
- [ ] API errors are caught and displayed
- [ ] Error boundary catches unexpected errors

#### Mobile

- [ ] Responsive design works on mobile
- [ ] Touch interactions work
- [ ] Graph is usable on small screens

### Performance Benchmarks

**Before Migration** (Current SPA):

- Time to Interactive: ~3-5 seconds
- First Contentful Paint: ~2-3 seconds
- Bundle Size: ~500KB

**After Migration** (Target):

- Time to Interactive: ~1-2 seconds
- First Contentful Paint: ~0.5-1 seconds
- Bundle Size: ~400KB (with code splitting)

## Performance Considerations

### Optimizations Implemented

1. **SSR**: Server renders initial HTML with data
2. **Code Splitting**: Routes split by default in TanStack Start
3. **React Query**: Intelligent caching prevents refetching
4. **URL State**: Shareable URLs reduce duplicate searches
5. **Edge Runtime**: Cloudflare Workers for low latency

### Bundle Size Management

- Monitor bundle size during build
- Lazy load heavy dependencies (D3.js)
- Tree-shake unused shadcn/ui components
- Optimize images and assets

### Runtime Performance

- Debounced search to prevent excessive API calls
- Graph depth limited to 3 hops (configurable)
- Database caching reduces external API calls
- React Query stale-while-revalidate strategy

## Migration Notes

### Database Compatibility

- Supabase PostgreSQL schema remains unchanged
- Existing data migration not required
- New server functions use same queries as Edge Function

### Environment Variables

- `VITE_SUPABASE_URL` → `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`
- `VITE_LASTFM_API_KEY` → `LASTFM_API_KEY`
- Add to Cloudflare dashboard and local `.dev.vars`

### Breaking Changes

- URL structure remains the same (`/artist/:name`)
- UI controls now in URL query parameters
- No breaking API changes for users
- Internal architecture completely changed

### Rollback Plan

- Keep original Vite SPA in separate branch
- Deploy to preview environment first
- Monitor for 24 hours before production cutover
- Quick rollback via Cloudflare dashboard if issues arise

## References

- **Original Implementation**: `src/hooks/useLastFm.ts:7-92`
- **Edge Function**: `supabase/functions/lastfm/index.ts:37-269`
- **Current Routing**: `src/App.tsx:19-22`
- **MapView Component**: `src/pages/MapView.tsx:1-164`
- **TanStack Start Docs**: https://tanstack.com/start
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **TanStack Router**: https://tanstack.com/router
- **TanStack Query**: https://tanstack.com/query
- **Blockers Document**: `thoughts/shared/plans/2025-12-07-tanstack-start-migration-blockers.md`

## Abandonment Checklist

If the TanStack Start migration is abandoned due to ongoing version compatibility issues, ensure the following cleanup:

### Files to Review/Remove

- [ ] `app.config.ts` - TanStack Start configuration
- [ ] `wrangler.toml` - Cloudflare Workers configuration
- [ ] `.dev.vars` - Local environment variables (gitignored)
- [ ] `src/routes/__root.tsx` - Root route
- [ ] `src/routes/index.tsx` - Home route
- [ ] `src/routes/artist/$artistName.tsx` - Artist route
- [ ] `src/routes/not-found.tsx` - 404 route
- [ ] `src/routes/$.tsx` - Catch-all route
- [ ] `src/router.tsx` - Router configuration
- [ ] `src/client.tsx` - Client entry point
- [ ] `src/ssr.tsx` - SSR entry point
- [ ] `src/lib/supabase.ts` - Edge runtime Supabase client
- [ ] `src/lib/query-client.ts` - React Query client
- [ ] `src/lib/queries.ts` - Query options
- [ ] `src/lib/server-utils.ts` - Server function utilities
- [ ] `src/lib/server/` - All server function files
- [ ] `src/components/ErrorBoundary.tsx` - Error boundary
- [ ] `src/components/MapViewSkeleton.tsx` - Loading skeleton

### Package.json Changes to Revert

- [ ] Remove TanStack Start dependencies
- [ ] Revert scripts from Vinxi to Vite
- [ ] Remove npm overrides (if added)
- [ ] Keep `@tanstack/react-query` if using in Vite SPA

### Branch Cleanup

- [ ] Delete `tanstack-start-migration` feature branch
- [ ] Keep `main` branch with working Vite SPA
- [ ] Update documentation to reflect abandonment

### Alternative Path Forward

If abandoning TanStack Start, consider:

1. **Enhanced Vite SPA** (Option D from Critical Blockers)
2. **Remix** - Stable SSR framework with Cloudflare support
3. **Next.js** - Mature ecosystem with Cloudflare adapter
4. **Wait 3-6 months** and re-evaluate TanStack Start stability
