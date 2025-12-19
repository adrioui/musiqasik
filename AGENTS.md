# MusiqasiQ - Agent Documentation

## What is MusiqasiQ?

A React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. Integrates with Last.fm API, optionally caches data in SurrealDB, and provides an engaging interface for exploring music artist connections.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + D3.js
- **Services**: Effect library for typed, composable service architecture
- **Database**: SurrealDB (optional - app works without it using Last.fm directly)
- **State**: React hooks for local state, Effect runtime for service operations
- **Routing**: React Router DOM

## Project Structure

```
musiqasik/
├── src/
│   ├── components/         # React components
│   │   ├── ForceGraph/     # D3.js graph visualization (refactored into hooks)
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # React hooks (useLastFm, useSimilarArtists, etc.)
│   ├── services/           # Effect services (LastFm, Database, Graph, Config)
│   ├── integrations/       # SurrealDB client
│   ├── lib/                # Utilities and error types
│   ├── pages/              # Route pages
│   └── types/              # TypeScript type definitions
├── e2e/                    # Playwright E2E tests
└── public/                 # Static assets
```

## Getting Started

1. **Setup**: Copy `.env.example` to `.env` and add your Last.fm API key
2. **Development**: `npm run dev` starts server on port 8080
3. **Building**: `npm run build` for production
4. **Testing**: `npm run test` for unit tests, `npm run test:e2e` for E2E tests
5. **Linting**: `npm run lint` runs ESLint

## Architecture Overview

- **Data Flow**: Search → useLastFm hook → Effect runtime → LastFmService → Last.fm API → Graph
- **Graph Visualization**: D3.js force simulation with modular hooks (`ForceGraph/hooks/`)
- **Caching**: Optional SurrealDB caching with BFS traversal in GraphService
- **State**: URL params for shareable graphs, React hooks for UI state
- **Service Layer**: Effect-based services with proper dependency injection

### Key Services (in `src/services/`)

- **ConfigService**: Environment configuration (API keys, DB URLs)
- **LastFmService**: Last.fm API integration (search, artist info, similar artists)
- **DatabaseService**: SurrealDB operations (artist caching, edge storage)
- **GraphService**: BFS graph building algorithm

## How to Work on This Project

### Before Starting

- Read relevant documentation files based on your task
- Study existing code patterns in similar components/files
- Check `package.json` for available scripts

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
3. **Use Effect for services**: Services use Effect library for composable, typed operations
4. **Style with Tailwind**: Use `cn()` utility for conditional classes (`src/lib/utils.ts`)
5. **Handle errors**: AppError types in `src/lib/errors.ts`, toast notifications for user feedback
6. **Write tests**: Unit tests with Vitest, E2E tests with Playwright

### Important Notes

- **TypeScript strict mode is disabled** (`tsconfig.app.json`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts`)
- **Environment variables**: Must be prefixed with `VITE_` for client-side access
- **Database optional**: App works without SurrealDB using Last.fm directly

## Testing

- **Unit tests**: `npm run test` - Tests for hooks, utilities, and services
- **E2E tests**: `npm run test:e2e` - Playwright tests for user flows
- **Coverage**: `npm run test:coverage` - Generate coverage report

## Related Files

- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - Linting rules
- `vitest.config.ts` - Test configuration
- `playwright.config.ts` - E2E test configuration