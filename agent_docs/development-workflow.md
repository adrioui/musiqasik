# Development Workflow

## Setup

### Prerequisites

- Bun (install from https://bun.sh/)
- Last.fm API key (get at https://www.last.fm/api)
- SurrealDB (optional - app works without it)

### Installation

1. Install dependencies: `bun install`
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

3. Start development server: `bun run dev`

### Database Setup (Optional)

SurrealDB is optional - the app works without it by fetching directly from Last.fm API.

To enable caching:

1. Start SurrealDB: `surreal start --user root --pass root file:./data/musiqasik.db`
2. Apply schema: `surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql`
3. Configure environment variables in `.env`

## Available Scripts

### Development

- `bun run dev` - Start development server on port 8080
- `bun run build:dev` - Build for development mode
- `bun run preview` - Preview production build locally

### Production

- `bun run build` - Build for production (outputs to `dist/` directory)

### Code Quality

- `bun run lint` - Run ESLint with TypeScript and React rules

### Testing

- `bun run test` - Run unit tests with Vitest
- `bun run test:e2e` - Run E2E tests with Playwright
- `bun run test:coverage` - Generate test coverage report

### Development Server

- **Port**: 8080
- **Host**: All interfaces (`::`)
- **Hot Reload**: Enabled via Vite

## Build Configuration

### Vite Configuration (`vite.config.ts:1-19`)

- Uses SWC for fast React compilation
- Path aliases: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- Port 8080 with host `::` (all interfaces)

### TypeScript Configuration

- **Main config**: `tsconfig.json` with loose settings (strict mode disabled)
- **App config**: `tsconfig.app.json` for React application
- **Node config**: `tsconfig.node.json` for build tools
- Path aliases configured in all TypeScript configs

### Tailwind CSS (`tailwind.config.ts:1-92`)

- Custom theme with CSS variables
- Extended colors, font family, and animations
- Supports dark mode via CSS variables

### ESLint Configuration (`eslint.config.js:1-27`)

- TypeScript + React rules
- React Hooks plugin enabled
- React Refresh plugin for fast refresh
- `@typescript-eslint/no-unused-vars` disabled

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

## Development Practices

### Code Organization

- **Components**: `src/components/` with PascalCase naming
- **Hooks**: `src/hooks/` for custom React hooks
- **Pages**: `src/pages/` for route components
- **Types**: `src/types/` for TypeScript definitions
- **Services**: `src/services/` for Effect-based services
- **Utilities**: `src/lib/` for shared functions

### Import Order

Follow existing patterns in components:

1. External libraries
2. Internal types
3. UI components
4. Custom hooks
5. Utilities

Example from `ArtistSearch.tsx:1-6`:

```typescript
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Artist } from '../types/artist';
import { Input } from './ui/input';
import { useLastFm } from '../hooks/useLastFm';
import { cn } from '../lib/utils';
```

### Component Structure

Use named exports with TypeScript interfaces for props. Example from `ArtistSearch.tsx:14`:

```typescript
export function ArtistSearch({ onSelect }: ArtistSearchProps) {
  // Implementation
}
```

### Styling

- Use Tailwind utility classes
- Use `cn()` utility for conditional class merging (`src/lib/utils.ts:4-6`)
- Follow shadcn/ui component patterns
- Use CSS custom properties for theming (`src/index.css:6-100`)

## Database Development

### SurrealDB Schema

The database schema is defined in `surrealdb/schema.surql`:

- **artist table**: Caches Last.fm artist data
- **similarity_edge table**: Stores artist similarity relationships with match scores

### Schema Changes

1. Modify `surrealdb/schema.surql`
2. Re-apply schema: `surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql`
3. Update TypeScript types in `src/types/artist.ts` if needed

## Testing

### Unit Tests (Vitest)

Run unit tests: `bun run test`

Test files:

- `src/hooks/useLastFm.test.ts` - Last.fm hook tests
- `src/hooks/useSimilarArtists.test.ts` - Similar artists hook tests
- `src/lib/errors.test.ts` - Error handling tests
- `src/lib/utils.test.ts` - Utility function tests
- `src/components/ForceGraph/hooks/useGraphData.test.ts` - Graph data processing tests

Configuration: `vitest.config.ts`

### E2E Tests (Playwright)

Run E2E tests: `bun run test:e2e`

Test files:

- `e2e/home.spec.ts` - Homepage tests
- `e2e/map-view.spec.ts` - Map view tests
- `e2e/navigation.spec.ts` - Navigation tests
- `e2e/search-race-condition.spec.ts` - Search race condition tests

Configuration: `playwright.config.ts`

### Coverage

Generate coverage report: `bun run test:coverage`
Coverage output: `coverage/` directory

### Linting

- Run `bun run lint` to check code quality
- ESLint configuration: `eslint.config.js:1-27`
- TypeScript checking via Vite build

### Manual Testing

- Development server: `bun run dev`
- Browser console for errors
- React DevTools for component inspection
- Network tab for API calls

## Deployment

### Production Build

1. Run `bun run build`
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
