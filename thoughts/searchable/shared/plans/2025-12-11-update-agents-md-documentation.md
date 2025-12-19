# Update AGENTS.md Documentation Implementation Plan

## Overview

Update AGENTS.md to accurately reflect the current MusiqasiQ architecture, replacing outdated Supabase references with SurrealDB backend, documenting the Cloudflare Workers API layer, and adding all additional dependencies and project structure changes.

## Current State Analysis

**AGENTS.md currently claims:**
- Backend: Supabase (PostgreSQL + Edge Functions)
- Project structure: `src/`, `supabase/`, `public/`
- Tech stack: Missing Effect, TanStack libraries, Zod, and other key dependencies
- Data flow: References non-existent `index.ts:122-187` for caching

**Actual implementation:**
- Backend: SurrealDB with Cloudflare Workers API (`surrealdb/schema.surql`, `workers/api/index.ts`)
- Project structure: Additional directories `docs/`, `thoughts/`, `workers/`, `.opencode/`
- Tech stack: Includes Effect, TanStack Router/Start, Zod, 20+ Radix UI components
- Data flow: Cloudflare Worker → Last.fm API → SurrealDB → Frontend

**Key Discoveries:**
- SurrealDB schema uses graph relations for similarity edges (`surrealdb/schema.surql:23`)
- Cloudflare Worker implements BFS graph building with caching (`workers/api/index.ts:212-314`)
- Effect library used for error handling and functional programming (`workers/api/index.ts:1`)
- TanStack Start migration is underway (`package.json:47`)

## Desired End State

AGENTS.md accurately documents:
1. SurrealDB as the backend database with graph-based schema
2. Cloudflare Workers as the API layer
3. Complete tech stack including Effect, TanStack libraries, Zod, and Radix UI
4. Actual project structure with all directories
5. Correct data flow and architecture patterns
6. All available npm scripts including worker development commands

### Verification:
- All references to Supabase removed
- All references to SurrealDB and Cloudflare Workers added
- Project structure diagram matches actual filesystem
- Tech stack table matches package.json dependencies
- Architecture section reflects actual implementation

## What We're NOT Doing

- **NOT** reverting to Supabase or changing the backend technology
- **NOT** adding new features or functionality
- **NOT** modifying any source code files (only documentation)
- **NOT** updating other documentation files (they're already accurate)
- **NOT** adding automated tests (out of scope for this documentation update)

## Implementation Approach

Update AGENTS.md section by section to reflect the current architecture, using actual code references and file paths from the codebase. Maintain the existing documentation style and format while ensuring accuracy.

---

## Phase 1: Update Tech Stack Section

### Overview
Replace Supabase backend with SurrealDB and Cloudflare Workers, and add all missing dependencies to the tech stack documentation.

### Changes Required:

#### 1. Update Backend Technology
**File**: `AGENTS.md:8`
**Changes**: Replace "Supabase (PostgreSQL + Edge Functions)" with accurate backend stack

```markdown
- **Backend**: SurrealDB (graph database) + Cloudflare Workers (API layer)
```

#### 2. Add Missing Key Dependencies
**File**: `AGENTS.md:7-10`
**Changes**: Add Effect, TanStack libraries, Zod, and other critical dependencies

```markdown
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + D3.js
- **Backend**: SurrealDB (graph database) + Cloudflare Workers (API layer)
- **State**: React Query for server state, React hooks for local state
- **Routing**: React Router DOM + TanStack Router (migration in progress)
- **Functional Programming**: Effect for error handling and type-safe operations
- **Validation**: Zod for schema validation
- **UI Components**: 20+ Radix UI primitives for accessible components
- **Notifications**: Sonner for toast notifications
```

### Success Criteria:

#### Automated Verification:
- [x] File exists and is readable: `AGENTS.md`
- [x] No syntax errors in markdown
- [x] All package.json dependencies mentioned in research are documented

#### Manual Verification:
- [x] Tech stack section accurately reflects package.json dependencies
- [x] SurrealDB and Cloudflare Workers are clearly documented as backend
- [x] All major libraries (Effect, TanStack, Zod) are included
- [x] Documentation maintains consistent formatting with existing sections

**Implementation Note**: After completing this phase, verify that the tech stack matches the actual dependencies in package.json before proceeding.

---

## Phase 2: Update Project Structure and Architecture

### Overview
Update the project structure diagram and architecture overview to reflect the actual directories and data flow using SurrealDB and Cloudflare Workers.

### Changes Required:

#### 1. Update Project Structure Diagram
**File**: `AGENTS.md:12-18`
**Changes**: Replace outdated structure with actual directories

```markdown
## Project Structure
```
musiqasik/
├── src/                    # React components, hooks, pages, types
├── surrealdb/             # SurrealDB schema and migrations
├── workers/               # Cloudflare Workers API layer
├── docs/                  # Documentation files
├── thoughts/              # Planning and research notes
├── public/                # Static assets
└── .opencode/             # Agent command files
```
```

#### 2. Update Architecture Overview
**File**: `AGENTS.md:26-30`
**Changes**: Replace Supabase/Edge Function references with actual architecture

```markdown
## Architecture Overview
- **Data Flow**: Search → React Query hook → Cloudflare Worker → Last.fm API → SurrealDB Cache → Graph
- **Graph Visualization**: D3.js force simulation with zoom/pan (`ForceGraph.tsx:77-84`)
- **Caching**: Two-level caching (SurrealDB database + per-request cache) with BFS traversal (`workers/api/index.ts:212-314`)
- **State Management**: URL params for shareable graphs, React Query for server state, React hooks for local state
- **Database Schema**: Graph-based with artists table and similarity_edges relations (`surrealdb/schema.surql:1-34`)
```

#### 3. Add API Layer Details
**File**: `AGENTS.md` (new section after Architecture Overview)
**Changes**: Document the Cloudflare Workers API endpoints

```markdown
### API Endpoints (Cloudflare Workers)
- `GET /?action=search&q=<query>` - Search artists via Last.fm
- `GET /?action=artist&name=<name>` - Get artist info with SurrealDB caching
- `GET /?action=graph&artist=<name>&depth=<1-3>` - Build similarity graph using BFS
```

### Success Criteria:

#### Automated Verification:
- [x] All referenced files exist:
  - `surrealdb/schema.surql`
  - `workers/api/index.ts`
  - `src/components/ForceGraph.tsx`
- [x] No broken markdown code blocks

#### Manual Verification:
- [x] Project structure matches actual filesystem layout
- [x] Architecture diagram accurately represents data flow
- [x] File references point to correct line numbers
- [x] API endpoints are correctly documented
- [x] Database schema description matches `surrealdb/schema.surql`

**Implementation Note**: Verify that the BFS implementation in `workers/api/index.ts` matches the documented caching strategy before proceeding.

---

## Phase 3: Update Getting Started and Scripts

### Overview
Add Cloudflare Workers development commands and update the Getting Started section to reflect the full development workflow.

### Changes Required:

#### 1. Update Getting Started Steps
**File**: `AGENTS.md:20-24`
**Changes**: Add worker development setup and additional scripts

```markdown
## Getting Started
1. **Setup**: See `docs/development-workflow.md#setup`
2. **Frontend Development**: `npm run dev` starts Vite server on port 8080
3. **Worker Development**: `npm run dev:worker` starts Cloudflare Workers locally
4. **Building**: `npm run build` for production frontend, `npm run deploy:worker` for production API
5. **Linting**: `npm run lint` runs ESLint
6. **Type Checking**: `npm run typecheck` runs TypeScript compiler
```

#### 2. Add Environment Variables Section
**File**: `AGENTS.md` (new section)
**Changes**: Document required environment variables for Cloudflare Workers

```markdown
### Environment Variables
**Cloudflare Workers** (`workers/api/wrangler.toml`):
- `SURREALDB_URL` - SurrealDB instance URL
- `SURREALDB_NAMESPACE` - Database namespace (default: "musiqasik")
- `SURREALDB_DATABASE` - Database name (default: "main")
- `SURREALDB_USER` - Database username
- `SURREALDB_PASS` - Database password
- `LASTFM_API_KEY` - Last.fm API key for artist data
```

### Success Criteria:

#### Automated Verification:
- [x] All npm scripts from package.json are documented
- [x] Environment variable names match `workers/api/wrangler.toml`

#### Manual Verification:
- [x] Getting Started steps are clear and sequential
- [x] Worker development commands are properly documented
- [x] Environment variables section is complete and accurate
- [x] References to `docs/development-workflow.md` are maintained

**Implementation Note**: Test that `npm run dev:worker` command works as documented before proceeding.

---

## Phase 4: Update Key Principles and Additional Notes

### Overview
Add documentation for the Effect library, TanStack Start migration, and update any other technical notes that have changed.

### Changes Required:

#### 1. Add Effect Library Principle
**File**: `AGENTS.md:47-52`
**Changes**: Add principle for functional programming with Effect

```markdown
### Key Principles
1. **Follow existing patterns**: Study similar components before creating new ones
2. **Use TypeScript**: Interfaces in `src/types/`, optional properties with `?`
3. **Style with Tailwind**: Use `cn()` utility for conditional classes (`src/lib/utils.ts:4-6`)
4. **Handle errors**: Toast notifications for user feedback, Effect for type-safe error handling
5. **Optimize performance**: Clean up D3.js simulations, limit graph depth to 3 hops
6. **Functional programming**: Use Effect for error handling and async operations in API layer
```

#### 2. Update Additional Notes
**File**: `AGENTS.md:54-58`
**Changes**: Add notes about TanStack Start migration and other important details

```markdown
### Important Notes
- **TypeScript strict mode is disabled** (`tsconfig.app.json:18`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- **No automated tests** - rely on manual testing and ESLint
- **No development-only plugins configured**
- **TanStack Start migration**: Framework migration in progress (`@tanstack/react-start` in package.json)
- **Database**: SurrealDB uses graph relations for artist similarity (`surrealdb/schema.surql:23`)
- **API Caching**: Per-request cache in Cloudflare Workers (`workers/api/index.ts:16`)
```

#### 3. Update Related Files Section
**File**: `AGENTS.md:60-65`
**Changes**: Add Cloudflare and SurrealDB configuration files

```markdown
## Related Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - Linting rules
- `workers/api/wrangler.toml` - Cloudflare Workers configuration
- `surrealdb/schema.surql` - Database schema
```

### Success Criteria:

#### Automated Verification:
- [x] All referenced configuration files exist
- [x] No broken markdown formatting
- [x] File references use correct line numbers

#### Manual Verification:
- [x] Key Principles section includes all relevant patterns
- [x] Additional Notes cover TanStack Start migration status
- [x] Effect library usage is documented
- [x] Related Files section is comprehensive
- [x] All file:line references are accurate

**Implementation Note**: Verify that the TanStack Start migration status is accurately described by checking for any related configuration files or code patterns.

---

## Testing Strategy

### Documentation Review:
- [x] Read through entire updated AGENTS.md for consistency
- [x] Verify all file paths and line numbers are correct
- [x] Check that terminology is consistent throughout
- [x] Ensure no references to Supabase remain

### Cross-Reference Verification:
- [x] Compare tech stack against package.json dependencies
- [x] Compare project structure against actual filesystem
- [x] Compare architecture against actual code implementation
- [x] Verify all npm scripts are documented

### Manual Testing Steps:
1. **Follow Getting Started**: Attempt to set up development environment using only AGENTS.md
2. **Verify Commands**: Test that all documented npm scripts work as described
3. **Check Architecture**: Review architecture overview against actual code flow
4. **Validate Structure**: Compare project structure diagram with actual directories

## Performance Considerations

- No performance impact (documentation only)
- Ensure documentation doesn't become overly verbose
- Maintain balance between completeness and readability

## Migration Notes

- This is a documentation-only change
- No code migration or data migration required
- No impact on existing functionality
- Can be deployed independently of code changes

## References

- Original research: `thoughts/shared/research/2025-12-11-agents-md-alignment-assessment.md`
- Current AGENTS.md: `AGENTS.md`
- Package dependencies: `package.json:16-72`
- Cloudflare Worker: `workers/api/index.ts`
- SurrealDB schema: `surrealdb/schema.surql`
- Worker config: `workers/api/wrangler.toml`
