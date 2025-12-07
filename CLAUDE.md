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
├── src/                    # React components, hooks, pages, types
├── supabase/              # Edge Functions + database migrations
└── public/                # Static assets
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