# AGENTS.md Optimization Implementation Plan

## Overview

Optimize the MusiqasiQ AGENTS.md file to strictly follow HumanLayer's "Writing a Good Claude.md" principles, reducing it from 266 lines to ~60 lines while improving agent effectiveness through better organization, progressive disclosure, and focus on universally applicable information.

## Current State Analysis

**Current AGENTS.md**: 266 lines with comprehensive but verbose documentation
**Strengths**: Good WHAT/WHY/HOW coverage, uses file references, under 300 lines
**Areas for Improvement**:

- Contains code style guidelines that should be removed (LLMs learn from patterns)
- Mixes universal and task-specific information
- Could be more concise (aim for ~60 lines like HumanLayer's example)
- Lacks clear progressive disclosure structure

**Key Discoveries**:

- The codebase follows consistent patterns: named exports, TypeScript interfaces, Tailwind CSS (`src/components/ArtistSearch.tsx:14`)
- Development workflow is well-defined with npm scripts (`package.json:6-12`)
- Architecture uses React + TypeScript + Vite + Supabase + D3.js stack
- No automated testing - relies on manual testing and ESLint (`eslint.config.js:1-27`)
- Uses progressive disclosure with file:line references already (`AGENTS.md:93-96`)

## Desired End State

A concise AGENTS.md file (~60 lines) that:

1. **Onboards agents effectively** with WHAT, WHY, HOW framework
2. **Uses progressive disclosure** - points to separate documentation files for detailed information
3. **Contains only universally applicable information** needed in every session
4. **Removes code style guidelines** - relies on existing code patterns and ESLint
5. **Improves agent performance** by reducing instruction count and focusing on relevant context

### Verification Criteria:

- AGENTS.md file reduced to 60-80 lines
- Separate documentation files created for detailed topics
- All code style guidelines removed from AGENTS.md
- File references use `file:line` format consistently
- Development workflow remains clear and actionable

## What We're NOT Doing

- **NOT** creating comprehensive style guides (use existing code patterns)
- **NOT** documenting every possible command (use progressive disclosure)
- **NOT** including task-specific instructions (keep universally applicable)
- **NOT** auto-generating documentation (manual, thoughtful creation)
- **NOT** adding testing frameworks (project doesn't have automated tests)

## Implementation Approach

**Strategy**: Refactor AGENTS.md into a concise onboarding document that points to separate, detailed documentation files for specific topics.

**Key Principles from HumanLayer**:

1. **Less is more** - Aim for ~60 lines, remove non-universal instructions
2. **Progressive disclosure** - Create `docs/` directory with topic-specific files
3. **LLMs learn from patterns** - Remove style guidelines, trust agents to follow existing code
4. **Universal applicability** - Only include what's needed in every session
5. **High leverage** - Carefully craft each line for maximum impact

## Phase 1: Create Progressive Disclosure Documentation Structure

### Overview

Create separate documentation files for detailed topics that can be referenced from the main AGENTS.md file.

### Changes Required:

#### 1. Create `docs/` directory structure

**File**: `docs/README.md`
**Changes**: Create directory structure and README explaining the documentation system

```markdown
# MusiqasiQ Documentation

This directory contains detailed documentation organized by topic. The main `AGENTS.md` file provides high-level onboarding, while these files offer deep dives into specific areas.

## Available Documentation

- `development-workflow.md` - Setup, scripts, and development processes
- `architecture-patterns.md` - System architecture and data flow
- `code-conventions.md` - Coding patterns and conventions (learn from existing code)
- `common-tasks.md` - Step-by-step guides for common operations
- `troubleshooting.md` - Common issues and debugging approaches

## Usage

When working on the project:

1. Read `AGENTS.md` first for essential onboarding
2. Consult relevant documentation files as needed
3. Follow existing code patterns in the codebase
```

#### 2. Create `docs/development-workflow.md`

**File**: `docs/development-workflow.md`
**Changes**: Extract development workflow details from current AGENTS.md

```markdown
# Development Workflow

## Setup

1. Install dependencies: `npm install` or `bun install`
2. Create `.env` file with Supabase variables
3. Set Edge Function environment variables in Supabase dashboard

## Available Scripts

- `npm run dev` - Start dev server on port 8080
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Development Server

- Port: 8080, Host: all interfaces (`::`)
- Hot reload enabled
- `lovable-tagger` plugin in development mode

## Environment Configuration

**Frontend (`.env`)**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Supabase Edge Function** (set in dashboard):

- `LASTFM_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
```

#### 3. Create `docs/architecture-patterns.md`

**File**: `docs/architecture-patterns.md`
**Changes**: Extract architecture details from current AGENTS.md

```markdown
# Architecture Patterns

## Data Flow

1. User Search → `ArtistSearch.tsx:24-37` → `useLastFm.ts:11-33` → Edge Function → Last.fm API
2. Graph Loading → `MapView.tsx:26-42` → `useLastFm.ts:35-59` → Edge Function with BFS traversal
3. Graph Rendering → `ForceGraph.tsx:64-251` → D3.js force simulation
4. Data Caching → `supabase/functions/lastfm/index.ts:88-120` → PostgreSQL tables

## Database Schema

- `artists` table: Caches Last.fm artist data (`supabase/migrations/*.sql:5-17`)
- `similarity_edges` table: Stores artist similarity relationships (`sql:20-28`)
- Indexes optimized for name searches and edge lookups (`sql:46-49`)
- RLS Policies: Public read access for guest-only app (`sql:31-43`)

## API Endpoints (Edge Function)

- `GET ?action=search&q={query}` - Search artists (`index.ts:196-200`)
- `GET ?action=graph&artist={name}&depth={1-3}` - Get similarity graph (`index.ts:202-207`)
- `GET ?action=artist&name={name}` - Get artist details (`index.ts:209-213`)

## Key Implementation Details

- **Graph Visualization**: D3.js force simulation with zoom/pan (`ForceGraph.tsx:77-84`)
- **Graph Building**: BFS traversal with depth limit (max 3 hops) (`index.ts:122-187`)
- **State Management**: React Query for server state, React hooks for local state
- **Caching**: Two-level cache (database + API) with match scores as DECIMAL(5,4)
```

#### 4. Create `docs/code-conventions.md`

**File**: `docs/code-conventions.md`
**Changes**: Document patterns to follow (not rules to enforce)

```markdown
# Code Conventions

## Patterns to Follow

**Component Structure**: Named exports with TypeScript interfaces (`src/components/ArtistSearch.tsx:14`)
**Import Order**: External libs → internal types → UI components → hooks → utilities
**Styling**: Tailwind utility classes with `cn()` for conditional merging (`src/lib/utils.ts:4-6`)
**Error Handling**: Toast notifications with loading states and empty state handling

## Learn From Existing Code

- **Components**: Look at `ArtistSearch.tsx:14-37` for search patterns
- **Hooks**: Study `useLastFm.ts:7-92` for API integration patterns
- **Pages**: Reference `MapView.tsx:19-53` for page structure
- **Types**: Use `artist.ts:1-38` as a template for type definitions

## Configuration Files

- `vite.config.ts:13-17` - Path aliases (`@/` → `./src/`)
- `tailwind.config.ts:15-88` - Theme extensions
- `tsconfig.json:4-16` - TypeScript configuration (strict mode disabled)
- `eslint.config.js:1-27` - Linting rules
```

#### 5. Create `docs/common-tasks.md`

**File**: `docs/common-tasks.md`
**Changes**: Extract step-by-step guides from current AGENTS.md

```markdown
# Common Tasks

## Adding New Components

1. Create in `src/components/` with PascalCase naming
2. Export as named export (not default)
3. Use TypeScript interfaces for props
4. Follow existing patterns in `ArtistSearch.tsx:14-37`
5. Use `cn()` utility for conditional classes (`src/lib/utils.ts:4-6`)

## Adding New Pages

1. Create in `src/pages/` with PascalCase naming
2. Add route in `src/App.tsx:18-22`
3. Use default export for page components
4. Follow layout patterns from `Index.tsx:6-45`

## Adding API Endpoints

1. Extend `supabase/functions/lastfm/index.ts`
2. Add action handler in switch statement (`index.ts:196-213`)
3. Update `src/hooks/useLastFm.ts:61-83` to expose new function
4. Add TypeScript types in `src/types/artist.ts:1-38` if needed

## Database Changes

1. Create new migration in `supabase/migrations/`
2. Use SQL format with constraints and indexes (see existing migration)
3. Update TypeScript types in `src/integrations/supabase/types.ts:1-237`
4. Test with local Supabase instance
```

#### 6. Create `docs/troubleshooting.md`

**File**: `docs/troubleshooting.md`
**Changes**: Extract troubleshooting information from current AGENTS.md

```markdown
# Troubleshooting

## Common Issues

1. **Missing environment variables**: Check `.env` file and Supabase dashboard
2. **CORS errors**: Verify Supabase Edge Function CORS headers (`index.ts:3-6`)
3. **Graph not loading**: Check Last.fm API key and network connectivity
4. **Type errors**: Run `npm run lint` to identify issues

## Debugging

- Check browser console for errors
- Verify Supabase Edge Function logs
- Test API endpoints directly: `curl "http://localhost:54321/functions/v1/lastfm?action=search&q=radiohead"`
- Use React DevTools for component inspection

## Performance Issues

- **Graph rendering slow**: Check node count (limited to 3-hop BFS depth)
- **API calls slow**: Two-level caching should help (`index.ts:88-120`)
- **Bundle size large**: Vite code splitting and tree-shaking enabled
```

### Success Criteria:

#### Automated Verification:

- [ ] Documentation files created: `docs/README.md`, `docs/development-workflow.md`, `docs/architecture-patterns.md`, `docs/code-conventions.md`, `docs/common-tasks.md`, `docs/troubleshooting.md`
- [ ] All files follow markdown formatting
- [ ] File references use correct `file:line` format
- [ ] No broken links between documentation files
- [ ] ESLint passes: `npm run lint`

#### Manual Verification:

- [ ] Documentation structure is logical and easy to navigate
- [ ] Each file focuses on a single topic area
- [ ] Information is accurate and up-to-date with current codebase
- [ ] File references point to correct locations in code
- [ ] No duplication of information across files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the documentation structure is correct before proceeding to Phase 2.

---

## Phase 2: Refactor AGENTS.md to ~60 Lines

### Overview

Rewrite the main AGENTS.md file to be concise (~60 lines) and focused on universal onboarding, using progressive disclosure to point to the new documentation files.

### Changes Required:

#### 1. Rewrite AGENTS.md with HumanLayer principles

**File**: `AGENTS.md`
**Changes**: Complete rewrite focusing on WHAT, WHY, HOW framework

```markdown
# MusiqasiQ - Agent Documentation

## What is MusiqasiQ?

A React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. Integrates with Last.fm API, caches data in Supabase, and provides an engaging interface for exploring music artist connections.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + D3.js
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: React Query for server state, React hooks for local state
- **Routing**: React Router DOM

## Project Structure
```

musiqasik/
├── src/ # React components, hooks, pages, types
├── supabase/ # Edge Functions + database migrations
└── public/ # Static assets

```

## Getting Started
1. **Setup**: See `docs/development-workflow.md#setup`
2. **Development**: `npm run dev` starts server on port 8080
3. **Building**: `npm run build` for production, `npm run build:dev` for development
4. **Linting**: `npm run lint` runs ESLint

## Architecture Overview
- **Data Flow**: Search → API hook → Edge Function → Last.fm API → Cache → Graph
- **Graph Visualization**: D3.js force simulation with zoom/pan (`ForceGraph.tsx:77-84`)
- **Caching**: Two-level (database + API) with BFS traversal (`index.ts:122-187`)
- **State**: URL params for shareable graphs, React Query for server data

## How to Work on This Project

### Before Starting
- Read relevant documentation files based on your task
- Study existing code patterns in similar components/files
- Check `package.json:6-12` for available scripts

### Documentation Files (Progressive Disclosure)
Consult these files for detailed information:
- `docs/development-workflow.md` - Setup, scripts, environment
- `docs/architecture-patterns.md` - System design and data flow
- `docs/code-conventions.md` - Patterns to follow (learn from existing code)
- `docs/common-tasks.md` - Step-by-step guides for common operations
- `docs/troubleshooting.md` - Debugging and common issues

### Key Principles
1. **Follow existing patterns**: Study similar components before creating new ones
2. **Use TypeScript**: Interfaces in `src/types/`, optional properties with `?`
3. **Style with Tailwind**: Use `cn()` utility for conditional classes (`src/lib/utils.ts:4-6`)
4. **Handle errors**: Toast notifications for user feedback
5. **Optimize performance**: Clean up D3.js simulations, limit graph depth to 3 hops

### Important Notes
- **TypeScript strict mode is disabled** (`tsconfig.app.json:18`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- **No automated tests** - rely on manual testing and ESLint
- **Component tagging**: `lovable-tagger` plugin active in dev mode

## Related Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - Linting rules
```

### Success Criteria:

#### Automated Verification:

- [ ] AGENTS.md file length: 60-80 lines
- [ ] All documentation file references are correct
- [ ] No broken links to `docs/` files
- [ ] ESLint passes: `npm run lint`
- [ ] Type checking passes: `npm run typecheck` (if available)
- [ ] File builds without errors: `npm run build:dev`

#### Manual Verification:

- [ ] AGENTS.md provides clear onboarding in < 2 minutes reading
- [ ] Progressive disclosure works - users know when to consult which docs
- [ ] All essential information preserved from original
- [ ] Code style guidelines removed (replaced with "follow existing patterns")
- [ ] File feels focused and universally applicable
- [ ] Navigation between AGENTS.md and docs/ files is intuitive

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the new AGENTS.md meets HumanLayer principles before proceeding to Phase 3.

---

## Phase 3: Update Related Documentation References

### Overview

Update any existing documentation references to point to the new structure and ensure consistency across the codebase.

### Changes Required:

#### 1. Update README.md references

**File**: `README.md`
**Changes**: Update any references to AGENTS.md to reflect the new structure

```markdown
## For AI Agents

See `AGENTS.md` for project onboarding and `docs/` directory for detailed documentation on specific topics.
```

#### 2. Update research document references

**File**: `thoughts/shared/research/2025-12-06-AGENTS-md-implementation-analysis.md`
**Changes**: Update analysis to reflect the new AGENTS.md structure

```markdown
## Updated Implementation

The AGENTS.md file has been optimized following HumanLayer principles:

- Reduced from 266 to ~60 lines
- Uses progressive disclosure with `docs/` directory
- Removed code style guidelines (rely on existing patterns)
- Focused on universally applicable information
```

#### 3. Verify all file:line references

**Changes**: Check that all `file:line` references in documentation are still accurate after any potential code changes

### Success Criteria:

#### Automated Verification:

- [ ] README.md updated with correct references
- [ ] Research document updated to reflect changes
- [ ] All `file:line` references in documentation are valid
- [ ] No broken internal links in markdown files
- [ ] ESLint passes: `npm run lint`

#### Manual Verification:

- [ ] README.md accurately describes the new documentation structure
- [ ] Research document provides accurate analysis of the changes
- [ ] All documentation is internally consistent
- [ ] File references point to correct code locations
- [ ] Navigation between all documentation files works correctly

---

## Testing Strategy

### Documentation Testing

1. **Readability Test**: Have someone unfamiliar with the project read AGENTS.md and complete a simple task
2. **Progressive Disclosure Test**: Verify users can find detailed information in `docs/` when needed
3. **Accuracy Test**: Check all `file:line` references against actual code
4. **Completeness Test**: Ensure no critical information was lost in the refactor

### Codebase Integration Testing

1. **Build Test**: Ensure documentation changes don't break build process
2. **Lint Test**: Verify markdown formatting and links
3. **Reference Test**: Check all documentation file paths exist

### Manual Testing Steps

1. Read the new AGENTS.md (should take < 2 minutes)
2. Try to complete a simple task (e.g., add a new component) using only the documentation
3. Navigate to relevant `docs/` files when detailed information is needed
4. Verify all file references work correctly
5. Check that code style guidelines are appropriately removed (agents should learn from patterns)

## Performance Considerations

### Documentation Performance

- **Faster onboarding**: Reduced from 266 to ~60 lines means less context window usage
- **Better relevance**: Universal information only means less irrelevant context
- **Progressive loading**: Detailed docs only loaded when needed

### Agent Performance Impact

- **Reduced instruction count**: Fewer instructions means better instruction-following
- **Focused context**: More relevant information in context window
- **Pattern learning**: Agents learn from code patterns rather than explicit rules

## Migration Notes

### Backward Compatibility

- Old AGENTS.md will be replaced - ensure no external references depend on specific line numbers
- Documentation structure changes may affect existing team members - communicate the change
- Progressive disclosure means some information moves from AGENTS.md to `docs/` files

### Training Considerations

- Team members need to understand the new documentation structure
- Agents may need adjustment period to use progressive disclosure effectively
- Consider adding a "What changed" section in AGENTS.md during transition

## References

- Original AGENTS.md: `AGENTS.md:1-266`
- HumanLayer article: https://www.humanlayer.dev/blog/writing-a-good-claude-md
- Research analysis: `thoughts/shared/research/2025-12-06-AGENTS-md-implementation-analysis.md`
- Current codebase patterns: `src/components/ArtistSearch.tsx:14-37`, `src/hooks/useLastFm.ts:7-92`, `supabase/functions/lastfm/index.ts:122-187`
