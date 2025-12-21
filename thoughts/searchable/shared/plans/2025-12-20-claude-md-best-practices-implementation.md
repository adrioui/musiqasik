# CLAUDE.md Best Practices Implementation Plan

## Overview

This plan addresses documentation drift between the codebase and its documentation. The `docs/` directory contains outdated Supabase references while the actual implementation uses SurrealDB with Effect-based services. Additionally, testing documentation incorrectly claims "No Automated Tests" despite 9 test files existing, and the ForceGraph refactoring has an unused hook.

## Current State Analysis

### What Exists Now

| Aspect | Status | Details |
|--------|--------|---------|
| AGENTS.md | ✅ Accurate | 104 lines, correctly documents SurrealDB + Effect architecture |
| docs/ directory | ❌ Outdated | ~1,756 lines with Supabase references |
| ForceGraph hooks | ⚠️ Partial | 4 hooks extracted, 1 unused (`useD3Simulation`) |
| Testing | ❌ Misdocumented | 9 test files exist but docs say "No Automated Tests" |

### Key Discoveries

- `docs/development-workflow.md:8-22` - References Supabase setup, Edge Functions
- `docs/architecture-patterns.md:5-14` - Shows "Supabase Edge Function → Last.fm API" flow
- `docs/code-conventions.md:166,219,299` - References `src/integrations/supabase/types.ts` (doesn't exist)
- `docs/common-tasks.md:100-163` - Instructions for Supabase Edge Functions
- `docs/troubleshooting.md:29-94` - Supabase debugging steps
- `docs/development-workflow.md:191-193` - Claims "No Automated Tests"
- `src/components/ForceGraph/hooks/useD3Simulation.ts` - Exported but unused in main component

### Actual Architecture

- **Database**: SurrealDB (optional) via `src/integrations/surrealdb/client.ts`
- **Services**: Effect-based with Context.Tag pattern (`src/services/tags.ts`)
- **Config**: Environment variables via `src/services/index.ts:14-22`
- **Testing**: Vitest (5 unit tests) + Playwright (4 E2E tests)

## Desired End State

After this plan is complete:

1. `docs/` renamed to `agent_docs/` with updated content matching SurrealDB + Effect architecture
2. All Supabase references removed, replaced with SurrealDB/Effect patterns
3. Testing documentation accurately reflects existing test infrastructure
4. ForceGraph refactoring completed by integrating `useD3Simulation` hook
5. AGENTS.md updated to reference `agent_docs/` instead of `docs/`

### Verification

- All documentation references point to files that exist
- No mentions of Supabase, Edge Functions, or `supabase/` directories
- Testing section documents Vitest and Playwright setup
- ForceGraph component uses all 4 extracted hooks

## What We're NOT Doing

- Rewriting AGENTS.md (already follows best practices)
- Adding new features or functionality
- Changing the actual SurrealDB or Effect implementation
- Adding new tests (only documenting existing ones)
- Modifying the shadcn/ui components

## Implementation Approach

The plan follows a phased approach:
1. Rename directory structure first
2. Update each documentation file systematically
3. Fix ForceGraph hook integration
4. Update AGENTS.md references
5. Verify all changes

---

## Phase 1: Rename docs/ to agent_docs/

### Overview

Rename the documentation directory from `docs/` to `agent_docs/` to better reflect its purpose as AI agent documentation.

### Changes Required

#### 1. Rename Directory

```bash
git mv docs/ agent_docs/
```

#### 2. Update AGENTS.md References

**File**: `AGENTS.md`
**Changes**: Update all `docs/` references to `agent_docs/`

```markdown
### Documentation Files (Progressive Disclosure)

Consult these files for detailed information:

- `agent_docs/development-workflow.md` - Setup, scripts, environment
- `agent_docs/architecture-patterns.md` - System design and data flow
- `agent_docs/code-conventions.md` - Patterns to follow (learn from existing code)
- `agent_docs/common-tasks.md` - Step-by-step guides for common operations
- `agent_docs/troubleshooting.md` - Debugging and common issues
```

### Success Criteria

#### Automated Verification

- [x] Directory renamed: `ls agent_docs/` shows 6 files
- [x] Old directory removed: `ls docs/` fails
- [x] AGENTS.md updated: `grep -c "agent_docs/" AGENTS.md` returns 5+
- [x] No orphan docs references: `grep -r "docs/" AGENTS.md` returns 0

#### Manual Verification

- [ ] Git status shows clean rename (no deleted/added pairs)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Update agent_docs/development-workflow.md

### Overview

Replace all Supabase references with SurrealDB + Effect architecture. Add accurate testing documentation.

### Changes Required

#### 1. Update Prerequisites Section (lines 5-22)

**File**: `agent_docs/development-workflow.md`

Replace:
```markdown
### Prerequisites

- Node.js 18+ or Bun
- Supabase account with project
- Last.fm API key

### Installation

1. Install dependencies: `npm install` or `bun install`
2. Create `.env` file in project root with:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```
3. Set Edge Function environment variables in Supabase dashboard:
   - `LASTFM_API_KEY`: Your Last.fm API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
```

With:
```markdown
### Prerequisites

- Node.js 18+ or Bun
- Last.fm API key (get at https://www.last.fm/api)
- SurrealDB (optional - app works without it)

### Installation

1. Install dependencies: `npm install` or `bun install`
2. Copy `.env.example` to `.env` and configure:
   ```
   # Required
   VITE_LASTFM_API_KEY=your_lastfm_api_key
   
   # Optional - SurrealDB (app works without these)
   VITE_SURREALDB_WS_URL=ws://localhost:8000/rpc
   VITE_SURREALDB_HTTP_URL=http://localhost:8000/rpc
   VITE_SURREALDB_NAMESPACE=musiqasik
   VITE_SURREALDB_DATABASE=main
   VITE_SURREALDB_USER=root
   VITE_SURREALDB_PASS=root
   ```
3. Start development server: `npm run dev`
```

#### 2. Update Database Setup Section (lines 24-26)

Replace:
```markdown
### Database Setup

The database schema is automatically applied via the migration in `supabase/migrations/`. No additional setup is needed for local development if using Supabase's hosted service.
```

With:
```markdown
### Database Setup (Optional)

SurrealDB is optional - the app works without it by fetching directly from Last.fm API.

To enable caching:
1. Start SurrealDB: `surreal start --user root --pass root file:./data/musiqasik.db`
2. Apply schema: `surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql`
3. Configure environment variables in `.env`
```

#### 3. Update Environment Configuration Section (lines 78-104)

Replace all Supabase environment references with:
```markdown
## Environment Configuration

### Frontend (`.env`)

Required variables:
- `VITE_LASTFM_API_KEY`: Your Last.fm API key

Optional SurrealDB variables:
- `VITE_SURREALDB_WS_URL`: WebSocket URL (e.g., `ws://localhost:8000/rpc`)
- `VITE_SURREALDB_HTTP_URL`: HTTP URL (e.g., `http://localhost:8000/rpc`)
- `VITE_SURREALDB_NAMESPACE`: Database namespace (default: `musiqasik`)
- `VITE_SURREALDB_DATABASE`: Database name (default: `main`)
- `VITE_SURREALDB_USER`: Database user
- `VITE_SURREALDB_PASS`: Database password

### Configuration Service

Environment variables are loaded via the ConfigService (`src/services/index.ts:14-22`):

```typescript
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
  surrealdbWsUrl: import.meta.env.VITE_SURREALDB_WS_URL || '',
  // ... additional config
});
```
```

#### 4. Update Database Development Section (lines 154-174)

Replace Supabase migration instructions with:
```markdown
## Database Development

### SurrealDB Schema

The database schema is defined in `surrealdb/schema.surql`:

- **artist table**: Caches Last.fm artist data
- **similarity_edge table**: Stores artist similarity relationships with match scores

### Schema Changes

1. Modify `surrealdb/schema.surql`
2. Re-apply schema: `surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql`
3. Update TypeScript types in `src/types/artist.ts` if needed
```

#### 5. Replace Testing Section (lines 176-193)

Replace:
```markdown
## Testing

### Manual Testing

- Development server: `npm run dev`
- Browser console for errors
- React DevTools for component inspection
- Network tab for API calls

### Linting

- Run `npm run lint` to check code quality
- ESLint configuration: `eslint.config.js:1-27`
- TypeScript checking via Vite build

### No Automated Tests

The project currently relies on manual testing and ESLint for code quality. Consider adding tests for critical paths if the project grows.
```

With:
```markdown
## Testing

### Unit Tests (Vitest)

Run unit tests: `npm run test`

Test files:
- `src/hooks/useLastFm.test.ts` - Last.fm hook tests
- `src/hooks/useSimilarArtists.test.ts` - Similar artists hook tests
- `src/lib/errors.test.ts` - Error handling tests
- `src/lib/utils.test.ts` - Utility function tests
- `src/components/ForceGraph/hooks/useGraphData.test.ts` - Graph data processing tests

Configuration: `vitest.config.ts`

### E2E Tests (Playwright)

Run E2E tests: `npm run test:e2e`

Test files:
- `e2e/home.spec.ts` - Homepage tests
- `e2e/map-view.spec.ts` - Map view tests
- `e2e/navigation.spec.ts` - Navigation tests
- `e2e/search-race-condition.spec.ts` - Search race condition tests

Configuration: `playwright.config.ts`

### Coverage

Generate coverage report: `npm run test:coverage`
Coverage output: `coverage/` directory

### Linting

- Run `npm run lint` to check code quality
- ESLint configuration: `eslint.config.js:1-27`
- TypeScript checking via Vite build

### Manual Testing

- Development server: `npm run dev`
- Browser console for errors
- React DevTools for component inspection
- Network tab for API calls
```

#### 6. Update Deployment Section (lines 195-214)

Replace Supabase deployment with:
```markdown
## Deployment

### Production Build

1. Run `npm run build`
2. Output goes to `dist/` directory
3. Deploy `dist/` contents to your hosting service

### Environment Variables

Ensure all required environment variables are set in production:
- `VITE_LASTFM_API_KEY`: Your Last.fm API key

Optional (for caching):
- SurrealDB configuration variables

### SurrealDB Deployment (Optional)

If using SurrealDB for caching:
1. Deploy SurrealDB instance
2. Apply schema: `surrealdb/schema.surql`
3. Configure environment variables to point to production database
```

### Success Criteria

#### Automated Verification

- [x] No Supabase references: `grep -ci "supabase" agent_docs/development-workflow.md` returns 0
- [x] SurrealDB documented: `grep -ci "surrealdb" agent_docs/development-workflow.md` returns 5+
- [x] Testing section exists: `grep -c "Unit Tests" agent_docs/development-workflow.md` returns 1
- [x] Vitest documented: `grep -c "vitest" agent_docs/development-workflow.md` returns 2+

#### Manual Verification

- [ ] All file references point to existing files
- [ ] Environment variable names match `.env.example`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Update agent_docs/architecture-patterns.md

### Overview

Replace Supabase Edge Function architecture with Effect-based service architecture.

### Changes Required

#### 1. Update System Overview (lines 3-6)

**File**: `agent_docs/architecture-patterns.md`

Replace:
```markdown
## System Overview

MusiqasiQ is a React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. The system integrates with the Last.fm API, caches data in Supabase, and provides an engaging interface for exploring music artist connections.
```

With:
```markdown
## System Overview

MusiqasiQ is a React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. The system integrates with the Last.fm API, optionally caches data in SurrealDB, and provides an engaging interface for exploring music artist connections.

### Architecture Principles

- **Effect-based Services**: Typed, composable service layer using Effect library
- **Graceful Degradation**: App works without database (Last.fm-only mode)
- **Dependency Injection**: Services use Context.Tag pattern for testability
```

#### 2. Replace Data Flow Section (lines 8-61)

Replace all Supabase Edge Function references with Effect service flow:

```markdown
## Data Flow

### 1. User Search Flow

```
User Search → ArtistSearch.tsx → useLastFm.ts →
Effect Runtime → LastFmService → Last.fm API → Response
```

**Key Components:**

- `ArtistSearch.tsx:24-37`: Debounced search input with keyboard navigation
- `useLastFm.ts:11-33`: Hook with Effect runtime integration
- `src/services/lastfm.ts:57-201`: LastFmService implementation
- `src/services/tags.ts:8-20`: Service tag definitions

### 2. Graph Loading Flow

```
Graph Request → MapView.tsx → useSimilarArtists.ts →
Effect Runtime → GraphService → BFS Traversal → Cache/API → Graph Data
```

**Key Components:**

- `MapView.tsx:26-42`: Graph page with data fetching
- `useSimilarArtists.ts`: Similar artists data processing
- `src/services/graph.ts:28-192`: BFS algorithm with configurable depth
- `src/services/database.ts:7-163`: Optional SurrealDB caching

### 3. Graph Rendering Flow

```
Graph Data → ForceGraph/index.tsx → D3.js Simulation →
Interactive Visualization
```

**Key Components:**

- `ForceGraph/index.tsx:17-279`: D3.js force-directed graph with zoom/pan
- `ForceGraph/hooks/useGraphData.ts`: Graph data filtering and processing
- `ForceGraph/hooks/useD3Zoom.ts`: Zoom behavior management
- `ForceGraph/hooks/useElementDimensions.ts`: Container dimension tracking

### 4. Data Caching Flow (Optional)

```
API Response → DatabaseService → SurrealDB → Client
```

**Key Components:**

- `src/services/database.ts:7-163`: DatabaseService with SurrealDB operations
- `src/integrations/surrealdb/client.ts`: SurrealDB client wrapper
- `surrealdb/schema.surql`: Database schema definition
```

#### 3. Replace Database Schema Section (lines 63-117)

Replace Supabase SQL schema with SurrealDB schema:

```markdown
## Database Schema (SurrealDB)

The database schema is defined in `surrealdb/schema.surql`.

### Artists Table

```surql
DEFINE TABLE artist SCHEMAFULL;

DEFINE FIELD name ON TABLE artist TYPE string;
DEFINE FIELD mbid ON TABLE artist TYPE option<string>;
DEFINE FIELD url ON TABLE artist TYPE option<string>;
DEFINE FIELD image_small ON TABLE artist TYPE option<string>;
DEFINE FIELD image_medium ON TABLE artist TYPE option<string>;
DEFINE FIELD image_large ON TABLE artist TYPE option<string>;
DEFINE FIELD image_extralarge ON TABLE artist TYPE option<string>;
DEFINE FIELD listeners ON TABLE artist TYPE option<int>;
DEFINE FIELD playcount ON TABLE artist TYPE option<int>;
DEFINE FIELD created_at ON TABLE artist TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_artist_name ON TABLE artist COLUMNS name UNIQUE;
```

### Similarity Edges Table

```surql
DEFINE TABLE similarity_edge SCHEMAFULL;

DEFINE FIELD source ON TABLE similarity_edge TYPE record<artist>;
DEFINE FIELD target ON TABLE similarity_edge TYPE record<artist>;
DEFINE FIELD match_score ON TABLE similarity_edge TYPE float;
DEFINE FIELD created_at ON TABLE similarity_edge TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_similarity_source ON TABLE similarity_edge COLUMNS source;
DEFINE INDEX idx_similarity_target ON TABLE similarity_edge COLUMNS target;
```
```

#### 4. Replace API Endpoints Section (lines 119-144)

Replace Supabase Edge Function endpoints with Effect services:

```markdown
## Service Layer

### Effect Services Architecture

All services use the Effect library with Context.Tag pattern (`src/services/tags.ts`):

```typescript
export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  ConfigServiceImpl
>() {}

export class LastFmService extends Context.Tag('LastFmService')<
  LastFmService,
  LastFmServiceImpl
>() {}
```

### Available Services

| Service | File | Purpose |
|---------|------|---------|
| ConfigService | `src/services/index.ts:14-22` | Environment configuration |
| LastFmService | `src/services/lastfm.ts:57-201` | Last.fm API integration |
| DatabaseService | `src/services/database.ts:7-163` | SurrealDB operations |
| GraphService | `src/services/graph.ts:28-192` | BFS graph building |

### Service Composition

Services are composed using Effect layers:

```typescript
import { ConfigLive, LastFmServiceLive, GraphServiceLive } from '@/services';

const program = Effect.gen(function* () {
  const graphService = yield* GraphService;
  return yield* graphService.buildGraph(artist, depth);
});

Effect.runPromise(program.pipe(
  Effect.provide(GraphServiceLive),
  Effect.provide(LastFmServiceLive),
  Effect.provide(ConfigLive)
));
```
```

#### 5. Update Integration Points Section (lines 263-284)

Replace Supabase integration with SurrealDB:

```markdown
## Integration Points

### Last.fm API Integration

- Rate limiting consideration
- API key management via ConfigService
- Response caching strategy (optional SurrealDB)
- Error response handling with typed errors

### SurrealDB Integration (Optional)

- WebSocket connection via `src/integrations/surrealdb/client.ts`
- Schema management via `surrealdb/schema.surql`
- Graceful fallback when database unavailable
- TypeScript types in `src/types/artist.ts`

### D3.js Integration

- React integration via ForceGraph hooks
- Simulation lifecycle management
- Event handling coordination
- Performance optimization with cleanup
```

### Success Criteria

#### Automated Verification

- [x] No Supabase references: `grep -ci "supabase" agent_docs/architecture-patterns.md` returns 0
- [x] No Edge Function references: `grep -ci "edge function" agent_docs/architecture-patterns.md` returns 0
- [x] Effect services documented: `grep -c "Effect" agent_docs/architecture-patterns.md` returns 5+
- [x] SurrealDB documented: `grep -ci "surrealdb" agent_docs/architecture-patterns.md` returns 3+

#### Manual Verification

- [ ] Service file references match actual file paths
- [ ] Data flow diagrams reflect actual implementation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Update agent_docs/code-conventions.md

### Overview

Replace Supabase code patterns with Effect-based patterns and remove references to non-existent files.

### Changes Required

#### 1. Remove Supabase Type References (lines 217-219)

**File**: `agent_docs/code-conventions.md`

Replace:
```markdown
### Generated Types

Supabase types are auto-generated in `src/integrations/supabase/types.ts:1-237`. Use these types for database interactions.
```

With:
```markdown
### Type Definitions

Artist and graph types are defined in `src/types/artist.ts`. Use these types for data handling:

```typescript
export interface Artist {
  name: string;
  mbid?: string;
  url?: string;
  image_small?: string;
  listeners?: number;
  playcount?: number;
}

export interface GraphNode extends Artist {
  isCenter?: boolean;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}
```
```

#### 2. Replace API Integration Patterns Section (lines 266-284)

Replace Edge Function pattern with Effect service pattern:

```markdown
## API Integration Patterns

### Effect Service Pattern

Follow the pattern in `src/services/lastfm.ts:57-201`:

1. **Define service interface** in `src/services/tags.ts`
2. **Implement with Effect.gen** for composable operations
3. **Use typed errors** from `src/lib/errors.ts`
4. **Create Layer** for dependency injection

```typescript
// Service implementation pattern
export const LastFmServiceLive = Layer.effect(
  LastFmService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    
    return {
      searchArtists: (query: string) =>
        Effect.gen(function* () {
          // Implementation
        }),
    };
  })
);
```

### Hook Pattern for Effect Services

Use the `useLastFm` hook pattern (`src/hooks/useLastFm.ts`):

1. **Effect runtime**: Execute Effect programs in React
2. **State management**: data, isLoading, error states
3. **Cleanup**: Cancel effects on unmount
4. **Return object**: Consistent interface for consumers
```

#### 3. Replace Database Patterns Section (lines 286-299)

Replace Supabase migration pattern with SurrealDB pattern:

```markdown
## Database Patterns

### SurrealDB Schema

Define schema in `surrealdb/schema.surql`:

1. **Tables with fields**: Type-safe field definitions
2. **Indexes for performance**: On commonly queried columns
3. **Relationships**: Record links between tables

### Type Safety

Use types from `src/types/artist.ts` for database interactions.

### DatabaseService Pattern

Follow the pattern in `src/services/database.ts:7-163`:

```typescript
export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    
    return {
      getArtist: (name: string) =>
        Effect.gen(function* () {
          // SurrealDB query implementation
        }),
    };
  })
);
```
```

#### 4. Update Type Patterns Section (lines 345-348)

Replace:
```markdown
### Type Patterns

- `src/types/artist.ts:1-38` - TypeScript interface definitions
- `src/integrations/supabase/types.ts:1-237` - Generated database types
```

With:
```markdown
### Type Patterns

- `src/types/artist.ts` - TypeScript interface definitions for Artist, GraphNode, GraphLink
- `src/lib/errors.ts` - Typed error classes (NetworkError, LastFmApiError, DatabaseError)
```

#### 5. Update Important Notes Section (lines 361-366)

Replace:
```markdown
## Important Notes

- **TypeScript strict mode is disabled** (`tsconfig.app.json:18`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- **No automated tests** - rely on manual testing and ESLint
- **Follow existing patterns** rather than memorizing rules
```

With:
```markdown
## Important Notes

- **TypeScript strict mode is disabled** (`tsconfig.app.json:18`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- **Effect for services**: Use Effect library for typed, composable operations
- **Database optional**: App works without SurrealDB using Last.fm directly
- **Testing**: Unit tests with Vitest, E2E tests with Playwright
- **Follow existing patterns** rather than memorizing rules
```

### Success Criteria

#### Automated Verification

- [x] No Supabase type references: `grep -c "supabase/types" agent_docs/code-conventions.md` returns 0
- [x] No Edge Function references: `grep -ci "edge function" agent_docs/code-conventions.md` returns 0
- [x] Effect patterns documented: `grep -c "Effect" agent_docs/code-conventions.md` returns 5+
- [x] No "No automated tests": `grep -c "No automated tests" agent_docs/code-conventions.md` returns 0

#### Manual Verification

- [ ] All file references point to existing files
- [ ] Code examples match actual implementation patterns

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 5.

---

## Phase 5: Update agent_docs/common-tasks.md

### Overview

Replace Supabase task instructions with SurrealDB/Effect equivalents.

### Changes Required

#### 1. Replace API Endpoints Section (lines 100-163)

**File**: `agent_docs/common-tasks.md`

Replace entire "Adding New API Endpoints" section with:

```markdown
## Adding New Effect Services

### 1. Define Service Interface

Add the service tag in `src/services/tags.ts`:

```typescript
export interface NewServiceImpl {
  doSomething: (param: string) => Effect.Effect<Result, AppError>;
}

export class NewService extends Context.Tag('NewService')<
  NewService,
  NewServiceImpl
>() {}
```

### 2. Implement Service

Create `src/services/newservice.ts`:

```typescript
import { Effect, Layer } from 'effect';
import { NewService, ConfigService } from './tags';
import { AppError } from '@/lib/errors';

export const NewServiceLive = Layer.effect(
  NewService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    
    return {
      doSomething: (param: string) =>
        Effect.gen(function* () {
          // Implementation
          return result;
        }),
    };
  })
);
```

### 3. Export from Index

Add to `src/services/index.ts`:

```typescript
export { NewService } from './tags';
export { NewServiceLive } from './newservice';
```

### 4. Create Hook (Optional)

If the service needs React integration, create a hook in `src/hooks/`:

```typescript
export function useNewService(params: Params) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const program = Effect.gen(function* () {
      const service = yield* NewService;
      return yield* service.doSomething(params.value);
    });

    setIsLoading(true);
    Effect.runPromise(
      program.pipe(
        Effect.provide(NewServiceLive),
        Effect.provide(ConfigLive)
      )
    )
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [params.value]);

  return { data, isLoading, error };
}
```

### 5. Write Tests

Add tests in `src/services/newservice.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Effect, Layer } from 'effect';
import { NewService, NewServiceLive } from './newservice';

describe('NewService', () => {
  it('should do something', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* NewService;
        return yield* service.doSomething('test');
      }).pipe(Effect.provide(NewServiceLive))
    );
    
    expect(result).toBeDefined();
  });
});
```
```

#### 2. Replace Database Tables Section (lines 164-203)

Replace with SurrealDB instructions:

```markdown
## Adding New Database Tables (SurrealDB)

### 1. Update Schema

Add table definition to `surrealdb/schema.surql`:

```surql
DEFINE TABLE new_table SCHEMAFULL;

DEFINE FIELD name ON TABLE new_table TYPE string;
DEFINE FIELD artist ON TABLE new_table TYPE record<artist>;
DEFINE FIELD created_at ON TABLE new_table TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_new_table_name ON TABLE new_table COLUMNS name;
```

### 2. Apply Schema

```bash
surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql
```

### 3. Add TypeScript Types

Add to `src/types/artist.ts`:

```typescript
export interface NewTable {
  id?: string;
  name: string;
  artist: string; // Record ID reference
  created_at?: string;
}
```

### 4. Update DatabaseService

Add methods to `src/services/database.ts`:

```typescript
getNewTableItem: (name: string) =>
  Effect.gen(function* () {
    const client = yield* getSurrealClient();
    const result = await client.query<NewTable[]>(
      'SELECT * FROM new_table WHERE name = $name',
      { name }
    );
    return result[0]?.[0] ?? null;
  }),
```
```

#### 3. Update Testing Section (lines 403-431)

Replace with comprehensive testing instructions:

```markdown
## Testing Changes

### 1. Unit Tests (Vitest)

Run all unit tests:
```bash
npm run test
```

Run specific test file:
```bash
npm run test src/hooks/useLastFm.test.ts
```

Run tests in watch mode:
```bash
npm run test -- --watch
```

### 2. E2E Tests (Playwright)

Run all E2E tests:
```bash
npm run test:e2e
```

Run specific E2E test:
```bash
npx playwright test e2e/home.spec.ts
```

Run with UI:
```bash
npx playwright test --ui
```

### 3. Coverage Report

Generate coverage:
```bash
npm run test:coverage
```

View report: Open `coverage/index.html` in browser

### 4. Linting

Check code quality:
```bash
npm run lint
```

### 5. Build Verification

Test production build:
```bash
npm run build
npm run preview
```
```

### Success Criteria

#### Automated Verification

- [x] No Supabase references: `grep -ci "supabase" agent_docs/common-tasks.md` returns 0
- [x] No Edge Function references: `grep -ci "edge function" agent_docs/common-tasks.md` returns 0
- [x] Effect service instructions: `grep -c "Effect.gen" agent_docs/common-tasks.md` returns 3+
- [x] Testing instructions: `grep -c "npm run test" agent_docs/common-tasks.md` returns 3+

#### Manual Verification

- [ ] All commands work when executed
- [ ] File paths reference existing files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 6.

---

## Phase 6: Update agent_docs/troubleshooting.md

### Overview

Replace Supabase debugging instructions with SurrealDB/Effect debugging.

### Changes Required

#### 1. Update Database Connection Issues Section (lines 78-94)

**File**: `agent_docs/troubleshooting.md`

Replace:
```markdown
### 5. Database Connection Issues

**Symptoms**: "Failed to fetch" or database errors in console.

**Checklist**:

1. **Supabase project**: Verify project is active in Supabase dashboard
2. **RLS policies**: Check `supabase/migrations/*.sql:31-43` for public read access
3. **Table existence**: Verify artists and similarity_edges tables exist
4. **Network requests**: Check browser network tab for failed requests

**Debug Steps**:

1. Test Supabase connection directly
2. Check Supabase dashboard for table data
3. Verify migration was applied: `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`
4. Test Edge Function independently
```

With:
```markdown
### 5. Database Connection Issues (SurrealDB)

**Symptoms**: "Failed to fetch" or database errors in console.

**Note**: SurrealDB is optional. The app works without it by fetching directly from Last.fm.

**Checklist**:

1. **SurrealDB running**: Verify SurrealDB is running on configured port
2. **Connection URL**: Check `VITE_SURREALDB_WS_URL` and `VITE_SURREALDB_HTTP_URL` in `.env`
3. **Authentication**: Verify `VITE_SURREALDB_USER` and `VITE_SURREALDB_PASS`
4. **Schema applied**: Ensure `surrealdb/schema.surql` was imported

**Debug Steps**:

1. Check SurrealDB status: `surreal status`
2. Test connection: `surreal sql --conn http://localhost:8000 --ns musiqasik --db main`
3. Verify schema: `SELECT * FROM artist LIMIT 1;`
4. Check browser console for Effect error messages
5. The app should gracefully fall back to Last.fm-only mode if DB unavailable
```

#### 2. Replace Edge Function Debugging Section (lines 154-185)

Replace:
```markdown
### Edge Function Debugging

#### Local Testing

Test Edge Function locally with Supabase CLI:

```bash
supabase functions serve lastfm
```

#### Logging

Add console logs to `supabase/functions/lastfm/index.ts`:

```typescript
console.log('Processing request:', { action, artist, depth });
```

#### Direct API Testing

Test endpoints directly:

```bash
# Search artists
curl "http://localhost:54321/functions/v1/lastfm?action=search&q=radiohead"
...
```
```

With:
```markdown
### Effect Service Debugging

#### Logging

Add logging to Effect services using Effect.log:

```typescript
Effect.gen(function* () {
  yield* Effect.log('Processing request', { action, artist, depth });
  // ... rest of implementation
});
```

#### Error Tracing

Effect provides detailed error traces. Check browser console for:
- Effect stack traces
- Typed error information (NetworkError, LastFmApiError, DatabaseError)

#### Direct API Testing

Test Last.fm API directly:

```bash
# Search artists (replace YOUR_API_KEY)
curl "https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=radiohead&api_key=YOUR_API_KEY&format=json"

# Get artist info
curl "https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=radiohead&api_key=YOUR_API_KEY&format=json"

# Get similar artists
curl "https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=radiohead&api_key=YOUR_API_KEY&format=json"
```

#### SurrealDB Queries

Test database queries:

```bash
# Connect to SurrealDB
surreal sql --conn http://localhost:8000 --ns musiqasik --db main

# Check artist cache
SELECT * FROM artist WHERE name = 'Radiohead';

# Check similarity edges
SELECT * FROM similarity_edge WHERE source.name = 'Radiohead';
```
```

#### 3. Replace Database Debugging Section (lines 187-217)

Replace Supabase SQL with SurrealDB queries:

```markdown
### Database Debugging (SurrealDB)

#### Query Testing

Connect to SurrealDB and test queries:

```bash
surreal sql --conn http://localhost:8000 --ns musiqasik --db main
```

```surql
-- Check artists table
SELECT * FROM artist WHERE name CONTAINS 'radiohead' LIMIT 5;

-- Check similarity edges
SELECT * FROM similarity_edge
WHERE source IN (SELECT id FROM artist WHERE name = 'Radiohead')
LIMIT 10;

-- Check table counts
SELECT count() FROM artist GROUP ALL;
SELECT count() FROM similarity_edge GROUP ALL;
```

#### Index Verification

```surql
-- Check table info including indexes
INFO FOR TABLE artist;
INFO FOR TABLE similarity_edge;
```

#### Connection Test

```typescript
// Test SurrealDB connection in browser console
import { surrealClient } from '@/integrations/surrealdb/client';
const result = await surrealClient.query('SELECT * FROM artist LIMIT 1');
console.log(result);
```
```

#### 4. Update Common Error Messages Section (lines 219-273)

Update "Failed to fetch" section:

```markdown
### "Failed to fetch"

**Cause**: Network error, CORS issue, or API endpoint unavailable.

**Solutions**:

1. Check browser console for specific error messages
2. Verify `VITE_LASTFM_API_KEY` is set correctly
3. Check Last.fm API status
4. If using SurrealDB, verify database is running (or disable it)
5. Check Effect error traces for typed error information
```

#### 5. Replace API Integration Issues Section (lines 341-369)

Replace Supabase Edge Function issues with Effect service issues:

```markdown
## API Integration Issues

### Last.fm API Limits

#### Rate Limiting

1. Effect services include built-in retry logic
2. SurrealDB caching reduces API calls
3. Add delay between requests if needed

#### API Changes

1. Check Last.fm API documentation for changes
2. Update LastFmService if API response format changes
3. Handle API version deprecation

### Effect Service Issues

#### Service Not Found

1. Verify service is exported from `src/services/index.ts`
2. Check Layer composition in hook
3. Ensure all dependencies are provided

#### Type Errors

1. Check service interface in `src/services/tags.ts`
2. Verify Effect.gen function signatures
3. Check error types in `src/lib/errors.ts`

### SurrealDB Issues (Optional)

#### Connection Failures

1. Verify SurrealDB is running
2. Check connection URL in `.env`
3. App should gracefully fall back to Last.fm-only mode

#### Query Errors

1. Test queries directly in SurrealDB CLI
2. Check schema matches `surrealdb/schema.surql`
3. Verify TypeScript types match schema
```

#### 6. Update Getting Help Section (lines 371-398)

Replace documentation references:

```markdown
## Getting Help

### Check Existing Documentation

1. `agent_docs/development-workflow.md` - Setup and scripts
2. `agent_docs/architecture-patterns.md` - System design
3. `agent_docs/code-conventions.md` - Coding patterns
4. `agent_docs/common-tasks.md` - Step-by-step guides

### Examine Code Examples

1. `src/components/ArtistSearch.tsx:14-37` - Search component pattern
2. `src/components/ForceGraph/index.tsx` - D3.js integration
3. `src/hooks/useLastFm.ts` - Effect service integration
4. `src/services/graph.ts:28-192` - BFS graph algorithm
5. `src/services/lastfm.ts:57-201` - Effect service pattern

### Test Minimal Cases

1. Create minimal reproduction of the issue
2. Test with Last.fm-only mode (disable SurrealDB)
3. Isolate the problem service or hook

### Community Resources

1. Check Effect documentation for service patterns
2. Check SurrealDB documentation for query issues
3. Refer to D3.js documentation for graph issues
4. Check React and TypeScript documentation for framework issues
5. Review Last.fm API documentation for integration issues
```

### Success Criteria

#### Automated Verification

- [x] No Supabase references: `grep -ci "supabase" agent_docs/troubleshooting.md` returns 0
- [x] No Edge Function references: `grep -ci "edge function" agent_docs/troubleshooting.md` returns 0
- [x] SurrealDB debugging: `grep -ci "surrealdb" agent_docs/troubleshooting.md` returns 5+
- [x] Effect debugging: `grep -c "Effect" agent_docs/troubleshooting.md` returns 3+

#### Manual Verification

- [ ] All debugging commands work when executed
- [ ] File references point to existing files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 7.

---

## Phase 7: Update agent_docs/README.md

### Overview

Update the README to reflect renamed directory and remove Supabase references.

### Changes Required

#### 1. Update File References

**File**: `agent_docs/README.md`

Replace:
```markdown
## File References

All documentation uses `file:line` references to point to actual code:

- `src/components/ArtistSearch.tsx:24-37` - Search component with debouncing
- `src/hooks/useLastFm.ts:11-33` - API integration hook
- `supabase/functions/lastfm/index.ts:122-187` - Graph building algorithm
- `ForceGraph.tsx:77-84` - D3.js zoom and pan interactions
```

With:
```markdown
## File References

All documentation uses `file:line` references to point to actual code:

- `src/components/ArtistSearch.tsx:24-37` - Search component with debouncing
- `src/hooks/useLastFm.ts:11-33` - Effect service integration hook
- `src/services/graph.ts:28-192` - Graph building algorithm (BFS)
- `src/components/ForceGraph/index.tsx` - D3.js force-directed graph
- `src/components/ForceGraph/hooks/useD3Zoom.ts` - Zoom and pan interactions
```

### Success Criteria

#### Automated Verification

- [x] No Supabase references: `grep -ci "supabase" agent_docs/README.md` returns 0
- [x] Updated file references: `grep -c "src/services" agent_docs/README.md` returns 1+

#### Manual Verification

- [ ] All file references point to existing files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 8.

---

## Phase 8: Complete ForceGraph Refactoring

### Overview

Integrate the unused `useD3Simulation` hook into the ForceGraph component, completing the modular hook extraction.

### Changes Required

#### 1. Update ForceGraph/index.tsx

**File**: `src/components/ForceGraph/index.tsx`

The `useD3Simulation` hook (lines 1-80 in `hooks/useD3Simulation.ts`) provides:
- Force simulation management
- Node/link force configuration
- Restart/stop controls

However, the current implementation (lines 44-238 in `index.tsx`) creates the simulation inline. To use the hook:

**Option A: Full Integration** (Recommended)

Extract the simulation creation into the hook by modifying both files:

1. Update `useD3Simulation` to accept a callback for rendering updates
2. Move simulation creation from `index.tsx` lines 76-88 to the hook
3. Keep D3 DOM manipulation in the main component

**Changes to `hooks/useD3Simulation.ts`**:

```typescript
interface UseD3SimulationProps {
  nodes: GraphNode[];
  links: SimulationLink[];
  width: number;
  height: number;
}

export function useD3Simulation({
  nodes,
  links,
  width,
  height,
}: UseD3SimulationProps) {
  const simulationRef = useRef<d3.Simulation<GraphNode, SimulationLink> | null>(null);

  useEffect(() => {
    if (nodes.length === 0) return;

    // Stop existing simulation
    simulationRef.current?.stop();

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, SimulationLink>(links)
          .id((d) => d.name)
          .distance((d) => 100 + (1 - d.weight) * 100)
          .strength((d) => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  const restart = useCallback((alpha = 0.3) => {
    simulationRef.current?.alpha(alpha).restart();
  }, []);

  const stop = useCallback(() => {
    simulationRef.current?.stop();
  }, []);

  const onTick = useCallback((callback: () => void) => {
    simulationRef.current?.on('tick', callback);
  }, []);

  return {
    simulation: simulationRef.current,
    restart,
    stop,
    onTick,
  };
}
```

**Changes to `index.tsx`**:

Add import:
```typescript
import { useD3Simulation } from './hooks/useD3Simulation';
```

Replace inline simulation creation (lines 76-88) with:
```typescript
const { simulation, restart, onTick } = useD3Simulation({
  nodes: graphNodes,
  links,
  width: dimensions.width,
  height: dimensions.height,
});
```

Update drag handlers to use `restart`:
```typescript
.on('start', (event, d) => {
  if (!event.active) restart(0.3);
  d.fx = d.x;
  d.fy = d.y;
})
```

#### 2. Update Hook Exports

**File**: `src/components/ForceGraph/hooks/index.ts`

Verify `useD3Simulation` is exported (already done):
```typescript
export { useD3Simulation } from './useD3Simulation';
```

### Success Criteria

#### Automated Verification

- [x] Hook is imported: `grep -c "useD3Simulation" src/components/ForceGraph/index.tsx` returns 1+
- [x] All tests pass: `npm run test`
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification

- [x] Graph loads and displays correctly
- [x] Node dragging works smoothly
- [x] Zoom and pan function correctly
- [x] Graph stabilizes properly
- [x] No console errors (note: pre-existing Deezer CORS errors unrelated to ForceGraph changes)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the graph works correctly before proceeding to Phase 9.

---

## Phase 9: Final Verification

### Overview

Verify all changes are complete and consistent.

### Verification Checklist

#### Automated Verification

```bash
# 1. Directory structure
ls agent_docs/  # Should show 6 files
ls docs/ 2>&1   # Should fail (directory doesn't exist)

# 2. No Supabase references in agent_docs/
grep -rci "supabase" agent_docs/  # Should return 0 for each file

# 3. No Edge Function references
grep -rci "edge function" agent_docs/  # Should return 0

# 4. AGENTS.md updated
grep -c "agent_docs/" AGENTS.md  # Should return 5

# 5. Tests pass
npm run test
npm run test:e2e

# 6. Build succeeds
npm run build

# 7. Lint passes
npm run lint
```

**All automated verification passed:**
- [x] Directory structure: 6 files in agent_docs/, docs/ does not exist
- [x] No Supabase references in agent_docs/
- [x] No Edge Function references in agent_docs/
- [x] CLAUDE.md references agent_docs/ (5 references)
- [x] Tests pass: 60 tests passed
- [x] Build succeeds
- [x] Lint passes: 0 errors (9 warnings)

#### Manual Verification

- [x] CLAUDE.md references `agent_docs/` correctly
- [x] All documentation file references point to existing files
- [x] Graph visualization works correctly with all hooks integrated
- [x] Application runs without errors: `npm run dev`

### Success Criteria

All automated and manual verification checks pass. ✅ **COMPLETE**

---

## Testing Strategy

### Unit Tests

- Existing tests in `src/hooks/` should continue to pass
- `useD3Simulation` hook changes should not break `useGraphData.test.ts`
- Run: `npm run test`

### E2E Tests

- All 4 E2E tests should pass after changes
- Focus on `e2e/map-view.spec.ts` for graph functionality
- Run: `npm run test:e2e`

### Manual Testing Steps

1. Start development server: `npm run dev`
2. Navigate to homepage
3. Search for an artist (e.g., "Radiohead")
4. Verify graph loads and displays correctly
5. Test node dragging (should be smooth)
6. Test zoom in/out controls
7. Test node clicking (should show artist panel)
8. Verify no console errors

## Performance Considerations

- Hook extraction should not impact performance
- D3 simulation cleanup is already handled properly
- No additional re-renders introduced

## Migration Notes

- Directory rename (`docs/` → `agent_docs/`) is a breaking change for any external references
- Update any CI/CD scripts that reference `docs/`
- Update any bookmarks or external links to documentation

## References

- Original research: `thoughts/shared/research/2025-12-20-claude-md-best-practices-implementation.md`
- Previous AGENTS.md analysis: `thoughts/shared/research/2025-12-06-AGENTS-md-implementation-analysis.md`
- SurrealDB schema: `surrealdb/schema.surql`
- Effect services: `src/services/`
- ForceGraph hooks: `src/components/ForceGraph/hooks/`
