# Codebase Cleanup: Unused Components and Dependencies

## Overview

Remove unused shadcn/ui components, npm dependencies, and dead code to reduce bundle size and maintenance burden. Also fix README.md documentation path references.

## Current State Analysis

Based on research in `thoughts/shared/research/2025-12-21-codebase-cleanup-and-documentation-best-practices.md`:

- **39 shadcn/ui components** exist, only **13 are used**
- **26 unused Radix packages** in dependencies
- **5 unused dev dependencies**
- **README.md has 6 broken path references** (`docs/` should be `agent_docs/`)
- **Dead code** in errors.ts, loader.ts, graph-service.ts, NavLink.tsx, use-mobile.tsx

### Key Discoveries:

- Components used: badge, button, input, label, slider, switch, toast, toaster, tooltip (+ sheet, separator, skeleton internally by sidebar which is unused)
- Radix packages to keep: `@radix-ui/react-label`, `@radix-ui/react-slider`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`
- `@testing-library/dom` is a peer dependency of `@testing-library/react` - keep it
- `resetWasmState` in loader.ts is used by tests - keep it

## Desired End State

After this plan is complete:
- Only 13 UI components remain in `src/components/ui/`
- Only 6 Radix packages remain in dependencies
- 4 dev dependencies removed
- README.md correctly references `agent_docs/` directory
- No unused exports in errors.ts, loader.ts, graph-service.ts
- NavLink.tsx and use-mobile.tsx removed
- All tests pass, build succeeds

## What We're NOT Doing

- Removing `hack/` directory (explicitly requested to keep)
- Consolidating CLAUDE.md and AGENTS.md (leave as-is)
- Removing `@testing-library/dom` (peer dependency)
- Removing error types that have test coverage (keep for future use)
- Removing `resetWasmState` (used in tests)

## Implementation Approach

Execute cleanup in phases to ensure each step is verifiable. Each phase should pass tests before proceeding.

---

## Phase 1: Remove Unused UI Components

### Overview

Remove 26 unused shadcn/ui component files and 2 unused hook/component files.

### Changes Required:

#### 1. Delete unused UI components

**Files to delete** (26 files):

```bash
rm src/components/ui/accordion.tsx
rm src/components/ui/alert-dialog.tsx
rm src/components/ui/alert.tsx
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/breadcrumb.tsx
rm src/components/ui/card.tsx
rm src/components/ui/checkbox.tsx
rm src/components/ui/collapsible.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/dialog.tsx
rm src/components/ui/dropdown-menu.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/pagination.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/progress.tsx
rm src/components/ui/radio-group.tsx
rm src/components/ui/scroll-area.tsx
rm src/components/ui/select.tsx
rm src/components/ui/separator.tsx
rm src/components/ui/sheet.tsx
rm src/components/ui/sidebar.tsx
rm src/components/ui/skeleton.tsx
rm src/components/ui/table.tsx
rm src/components/ui/tabs.tsx
rm src/components/ui/textarea.tsx
rm src/components/ui/toggle-group.tsx
rm src/components/ui/toggle.tsx
```

#### 2. Delete unused components and hooks

**Files to delete** (2 files):

```bash
rm src/components/NavLink.tsx
rm src/hooks/use-mobile.tsx
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Unit tests pass: `npm run test`
- [x] Build succeeds: `npm run build`

#### Manual Verification:

- [x] Application loads correctly at http://localhost:8080
- [x] Artist search works
- [x] Graph visualization renders
- [x] Toast notifications appear

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Remove Unused npm Dependencies

### Overview

Remove Radix packages corresponding to deleted components and unused dev dependencies.

### Changes Required:

#### 1. Remove unused Radix dependencies (20 packages)

**File**: `package.json`

Remove from `dependencies`:

```json
"@radix-ui/react-accordion": "^1.2.11",
"@radix-ui/react-alert-dialog": "^1.1.14",
"@radix-ui/react-aspect-ratio": "^1.1.7",
"@radix-ui/react-avatar": "^1.1.10",
"@radix-ui/react-checkbox": "^1.3.2",
"@radix-ui/react-collapsible": "^1.1.11",
"@radix-ui/react-context-menu": "^2.2.15",
"@radix-ui/react-dialog": "^1.1.14",
"@radix-ui/react-dropdown-menu": "^2.1.15",
"@radix-ui/react-hover-card": "^1.1.14",
"@radix-ui/react-menubar": "^1.1.15",
"@radix-ui/react-navigation-menu": "^1.2.13",
"@radix-ui/react-popover": "^1.1.14",
"@radix-ui/react-progress": "^1.1.7",
"@radix-ui/react-radio-group": "^1.3.7",
"@radix-ui/react-scroll-area": "^1.2.9",
"@radix-ui/react-select": "^2.2.5",
"@radix-ui/react-separator": "^1.1.7",
"@radix-ui/react-tabs": "^1.1.12",
"@radix-ui/react-toggle": "^1.1.9",
"@radix-ui/react-toggle-group": "^1.1.10",
```

**Keep these Radix packages** (6 packages):

```json
"@radix-ui/react-label": "^2.1.7",
"@radix-ui/react-slider": "^1.3.5",
"@radix-ui/react-slot": "^1.2.3",
"@radix-ui/react-switch": "^1.2.5",
"@radix-ui/react-toast": "^1.2.14",
"@radix-ui/react-tooltip": "^1.2.7",
```

#### 2. Remove unused dev dependencies (4 packages)

**File**: `package.json`

Remove from `devDependencies`:

```json
"@cloudflare/vite-plugin": "^1.0.0",
"@effect/vitest": "^0.13.9",
"@testing-library/jest-dom": "^6.9.1",
"@tailwindcss/typography": "^0.5.16",
```

**Note**: Keep `@testing-library/dom` as it's a peer dependency of `@testing-library/react`.

#### 3. Move @types/d3 to devDependencies

**File**: `package.json`

Move from `dependencies` to `devDependencies`:

```json
"@types/d3": "^7.4.3",
```

#### 4. Reinstall dependencies

```bash
npm install
```

### Success Criteria:

#### Automated Verification:

- [x] npm install succeeds without errors
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Unit tests pass: `npm run test`
- [x] Build succeeds: `npm run build`

#### Manual Verification:

- [x] Application functions correctly after dependency changes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Fix README.md Path References

### Overview

Update README.md to correctly reference `agent_docs/` instead of `docs/` for documentation files.

### Changes Required:

#### 1. Fix development workflow link

**File**: `README.md:46`

**Before**:
```markdown
See [Development Workflow](docs/development-workflow.md) for setup instructions.
```

**After**:
```markdown
See [Development Workflow](agent_docs/development-workflow.md) for setup instructions.
```

#### 2. Fix documentation section

**File**: `README.md:113-120`

**Before**:
```markdown
- **`docs/` directory** - Detailed documentation organized by topic:
  - `development-workflow.md` - Setup, scripts, and development processes
  - `architecture-patterns.md` - System design and data flow
  - `code-conventions.md` - Coding patterns and conventions
  - `common-tasks.md` - Step-by-step guides for common operations
  - `troubleshooting.md` - Common issues and debugging approaches

For AI agents working on this project, start with `AGENTS.md` and consult the `docs/` files as needed for specific topics.
```

**After**:
```markdown
- **`agent_docs/` directory** - Detailed documentation organized by topic:
  - `development-workflow.md` - Setup, scripts, and development processes
  - `architecture-patterns.md` - System design and data flow
  - `code-conventions.md` - Coding patterns and conventions
  - `common-tasks.md` - Step-by-step guides for common operations
  - `troubleshooting.md` - Common issues and debugging approaches

For AI agents working on this project, start with `AGENTS.md` and consult the `agent_docs/` files as needed for specific topics.
```

### Success Criteria:

#### Automated Verification:

- [x] All links in README.md point to existing files

#### Manual Verification:

- [x] Click each documentation link in README.md to verify they work

**Implementation Note**: This phase has no code impact, proceed to next phase after verification.

---

## Phase 4: Clean Up Unused Exports

### Overview

Remove unused exports from errors.ts, loader.ts, and graph-service.ts. Keep exports that are tested or may be useful.

### Changes Required:

#### 1. Remove unused exports from errors.ts

**File**: `src/lib/errors.ts`

Remove these exports (lines 20-34, 36-44):
- `ArtistNotFoundError` class
- `ValidationError` class  
- `handleUnknownError` function
- Remove them from `AppError` union type

**Note**: These are only used in tests. Also update `src/lib/errors.test.ts` to remove corresponding tests.

**After** (keep only used error types):

```typescript
import { Data } from 'effect';

export class LastFmApiError extends Data.TaggedError('LastFmApiError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  message: string;
  code?: string;
  cause?: unknown;
}> {}

export class NetworkError extends Data.TaggedError('NetworkError')<{
  message: string;
  cause?: unknown;
}> {}

export type AppError =
  | LastFmApiError
  | DatabaseError
  | NetworkError;
```

#### 2. Update errors.test.ts

**File**: `src/lib/errors.test.ts`

Remove test cases for:
- `ArtistNotFoundError`
- `ValidationError`
- `handleUnknownError`

#### 3. Remove unused exports from loader.ts

**File**: `src/wasm/loader.ts`

Remove `initWasmEffect` (lines 82-85):

```typescript
// DELETE THIS:
export const initWasmEffect = Effect.tryPromise({
  try: () => initWasm(),
  catch: (error) => new Error(`WASM initialization failed: ${error}`),
});
```

Also remove unused `Effect` import if no longer needed.

**Keep** `resetWasmState` as it's used in tests.

#### 4. Remove unused exports from graph-service.ts

**File**: `src/wasm/graph-service.ts`

Remove these unused exports:
- `ResolvedLink` interface (lines 33-37)
- `ResolvedGraph` interface (lines 44-47)
- `resolveLinks` function (lines 73-86)
- `processAndResolveGraph` function (lines 92-107)

**Keep**:
- `Edge`, `GraphNode`, `GraphLink`, `ProcessedGraph` interfaces
- `processGraphData` function
- `isWasmGraphAvailable` function

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Unit tests pass: `npm run test`
- [x] Build succeeds: `npm run build`

#### Manual Verification:

- [x] Application functions correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Fix package.json Script

### Overview

Remove or fix the invalid `start` script that references non-existent `.output/` directory.

### Changes Required:

#### 1. Remove invalid start script

**File**: `package.json:9`

**Before**:
```json
"start": "node .output/server/index.mjs",
```

**After**: Remove this line entirely (or replace with `"start": "npm run preview"` if a start script is desired).

### Success Criteria:

#### Automated Verification:

- [x] package.json is valid JSON
- [x] npm install succeeds

#### Manual Verification:

- [x] None required

---

## Testing Strategy

### Unit Tests:

- Run `npm run test` after each phase
- Verify no test failures from removed code
- Update tests that reference removed exports

### Integration Tests:

- Run `npm run build` to verify production build
- Run `npm run dev` to verify development server

### Manual Testing Steps:

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:8080
3. Search for an artist (e.g., "Radiohead")
4. Verify graph renders correctly
5. Test graph controls (depth slider, threshold slider, labels toggle)
6. Verify toast notifications work
7. Click on artist nodes to verify panel displays

## Performance Considerations

- **Bundle size reduction**: Removing ~26 UI components and 20+ Radix packages will significantly reduce bundle size
- **Faster npm install**: Fewer dependencies means faster CI/CD pipelines
- **Reduced maintenance**: Less code to maintain and update

## Migration Notes

- No data migration required
- No breaking changes to public API
- All changes are internal cleanup

## References

- Research document: `thoughts/shared/research/2025-12-21-codebase-cleanup-and-documentation-best-practices.md`
- Previous cleanup plan: `thoughts/shared/plans/2025-12-19-dependency-cleanup.md`
