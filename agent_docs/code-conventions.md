# Code Conventions

## Philosophy

This document describes **patterns to follow**, not rules to enforce. LLMs are in-context learners - they should examine existing code to understand the project's conventions. Use these patterns as guidance, but always check actual implementations for the most current practices.

## Component Patterns

### File Structure

- **Location**: `src/components/` for reusable components, `src/pages/` for route components
- **Naming**: PascalCase for components, kebab-case for files
- **Exports**: Named exports for components, default exports for pages

**Example from `ArtistSearch.tsx:14`:**

```typescript
export function ArtistSearch({ onSelect }: ArtistSearchProps) {
  // Implementation
}
```

**Example from `Index.tsx:6`:**

```typescript
export default function Index() {
  // Implementation
}
```

### Props Interface Pattern

Define TypeScript interfaces for component props near the component definition.

**Example from `ArtistSearch.tsx:8-12`:**

```typescript
interface ArtistSearchProps {
  onSelect: (artist: Artist) => void;
}
```

### Import Order

Follow this import order pattern seen in existing components:

1. **External libraries** (React, third-party)
2. **Internal types** (from `src/types/`)
3. **UI components** (from `src/components/ui/` or local)
4. **Custom hooks** (from `src/hooks/`)
5. **Utilities** (from `src/lib/`)

**Example from `ArtistSearch.tsx:1-6`:**

```typescript
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Artist } from '../types/artist';
import { Input } from './ui/input';
import { useLastFm } from '../hooks/useLastFm';
import { cn } from '../lib/utils';
```

### Styling Patterns

#### Tailwind CSS

Use Tailwind utility classes with the `cn()` utility for conditional classes.

**Example from `ArtistSearch.tsx:93`:**

```typescript
className={cn(
  "w-full",
  isLoading && "opacity-50 cursor-not-allowed"
)}
```

**Utility function in `src/lib/utils.ts:4-6`:**

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### CSS Variables

The project uses CSS custom properties for theming. Check `src/index.css:6-100` for available variables.

#### shadcn/ui Components

Use the pre-configured shadcn/ui components from `src/components/ui/`. These components follow consistent patterns and are already styled with the project's theme.

### State Management Patterns

#### Local State

Use React `useState` for component-local state.

**Example from `ArtistSearch.tsx:15-17`:**

```typescript
const [query, setQuery] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [artists, setArtists] = useState<Artist[]>([]);
```

#### URL State

Use React Router for shareable URL state.

**Example from `App.tsx:18-22`:**

```typescript
<Route path="/map/:artistName?" element={<MapView />} />
```

### Error Handling Patterns

#### Toast Notifications

Use the toast system for user feedback.

**Example from `MapView.tsx:44-53`:**

```typescript
const { toast } = useToast();
// ...
if (error) {
  toast({
    title: 'Error loading graph',
    description: error.message,
    variant: 'destructive',
  });
}
```

#### Loading States

Show loading indicators during async operations.

**Example from `ArtistSearch.tsx:106-108`:**

```typescript
{isLoading && (
  <div className="absolute right-3 top-3">
    <Loader2 className="h-4 w-4 animate-spin" />
  </div>
)}
```

#### Empty States

Handle empty data gracefully.

**Example from `ArtistPanel.tsx:15-25`:**

```typescript
if (!artist) {
  return (
    <div className="p-4 text-center text-muted-foreground">
      Select an artist to see details
    </div>
  )
}
```

## TypeScript Patterns

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

### Optional Properties

Use `?` for optional properties and `| null` for nullable types.

### Type Extensions

Use `extends` for type inheritance when appropriate.

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

```typescript
export function useLastFm(params: UseLastFmParams) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const program = Effect.gen(function* () {
      const service = yield* LastFmService;
      return yield* service.searchArtists(params.query);
    });

    Effect.runPromise(
      program.pipe(
        Effect.provide(LastFmServiceLive),
        Effect.provide(ConfigLive)
      )
    )
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [params.query]);

  return { data, isLoading, error };
}
```

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

## Hook Patterns

### Custom Hook Structure

Create custom hooks in `src/hooks/` for reusable logic.

**Example from `useLastFm.ts:7-92`:**

```typescript
export function useLastFm(params: UseLastFmParams) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Implementation
  return { data, isLoading, error };
}
```

### Utility Hooks

Create focused hooks for specific concerns (e.g., `use-mobile.tsx:5-19` for mobile detection).

## Graph Visualization Patterns

### D3.js Integration

Follow the patterns in `ForceGraph/index.tsx:19-314` for D3.js integration with React:

1. **Ref for DOM access**: `const svgRef = useRef<SVGSVGElement>(null)`
2. **Effect for setup**: `useEffect(() => { /* D3 setup */ }, [])`
3. **Cleanup on unmount**: `return () => { /* Cleanup */ }`
4. **Event handling**: Coordinate React and D3.js events

### ForceGraph Hooks

The ForceGraph component uses modular hooks:

- `useElementDimensions`: Track container dimensions
- `useGraphData`: Filter and process graph data
- `useD3Zoom`: Manage zoom behavior
- `useD3Simulation`: Manage force simulation (available but optional)

### Performance Optimization

- Stop simulation on cleanup
- Limit node count via BFS depth
- Filter edges by similarity threshold
- Use React memoization where appropriate

## Configuration Patterns

### Path Aliases

Use `@/` alias for `src/` imports as configured in `vite.config.ts:13-17`.

**Example**:

```typescript
import { Artist } from '@/types/artist';
import { useLastFm } from '@/hooks/useLastFm';
```

### Environment Variables

- Frontend: Use `import.meta.env` with `VITE_` prefix
- Access via ConfigService for type safety

### Build Configuration

- Check `vite.config.ts:1-19` for build settings
- Check `tailwind.config.ts:1-92` for styling configuration
- Check `tsconfig.json:4-16` for TypeScript settings

## Learning from Existing Code

When in doubt, examine these key files to understand patterns:

### Component Patterns

- `ArtistSearch.tsx:14-37` - Search component with debouncing
- `ForceGraph/index.tsx:19-314` - D3.js integration with React
- `MapView.tsx:19-53` - Page component with data fetching

### Hook Patterns

- `useLastFm.ts:7-92` - Effect service integration with state management
- `use-toast.ts:1-187` - Toast notification system

### Service Patterns

- `src/services/lastfm.ts:57-201` - Effect service implementation
- `src/services/graph.ts:28-192` - BFS graph algorithm
- `src/services/database.ts:7-163` - SurrealDB operations

### Type Patterns

- `src/types/artist.ts` - TypeScript interface definitions for Artist, GraphNode, GraphLink
- `src/lib/errors.ts` - Typed error classes (NetworkError, LastFmApiError, DatabaseError)

## ESLint Configuration

The project uses ESLint with specific rules. Check `eslint.config.js:1-27` for configuration:

- TypeScript + React rules
- React Hooks plugin enabled
- React Refresh plugin for fast refresh
- `@typescript-eslint/no-unused-vars` disabled (loose configuration)

Run `npm run lint` to check code quality.

## Important Notes

- **TypeScript strict mode is disabled** (`tsconfig.app.json:18`)
- **Path aliases**: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- **Effect for services**: Use Effect library for typed, composable operations
- **Database optional**: App works without SurrealDB using Last.fm directly
- **Testing**: Unit tests with Vitest, E2E tests with Playwright
- **Follow existing patterns** rather than memorizing rules