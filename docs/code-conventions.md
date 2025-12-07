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
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Artist } from '../types/artist'
import { Input } from './ui/input'
import { useLastFm } from '../hooks/useLastFm'
import { cn } from '../lib/utils'
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
  return twMerge(clsx(inputs))
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
const [query, setQuery] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [artists, setArtists] = useState<Artist[]>([])
```

#### Server State
Use React Query (TanStack Query) for server state management.

**Example from `MapView.tsx:26-42`:**
```typescript
const { data: graphData, isLoading, error } = useLastFm({
  action: 'graph',
  artist: artistName,
  depth: graphDepth,
})
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
const { toast } = useToast()
// ...
if (error) {
  toast({
    title: "Error loading graph",
    description: error.message,
    variant: "destructive",
  })
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
Place TypeScript interfaces in `src/types/` directory.

**Example from `src/types/artist.ts:1-38`:**
```typescript
export interface Artist {
  name: string
  mbid?: string
  url?: string
  image_small?: string
  image_medium?: string
  image_large?: string
  image_extralarge?: string
  listeners?: number
  playcount?: number
}
```

### Optional Properties
Use `?` for optional properties and `| null` for nullable types.

### Type Extensions
Use `extends` for type inheritance when appropriate.

### Generated Types
Supabase types are auto-generated in `src/integrations/supabase/types.ts:1-237`. Use these types for database interactions.

## Hook Patterns

### Custom Hook Structure
Create custom hooks in `src/hooks/` for reusable logic.

**Example from `useLastFm.ts:7-92`:**
```typescript
export function useLastFm(params: UseLastFmParams) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Implementation
  return { data, isLoading, error }
}
```

### API Integration Hooks
Use the `useLastFm` hook pattern for API integrations with error handling and loading states.

### Utility Hooks
Create focused hooks for specific concerns (e.g., `use-mobile.tsx:5-19` for mobile detection).

## Graph Visualization Patterns

### D3.js Integration
Follow the patterns in `ForceGraph.tsx:19-314` for D3.js integration with React:

1. **Ref for DOM access**: `const svgRef = useRef<SVGSVGElement>(null)`
2. **Effect for setup**: `useEffect(() => { /* D3 setup */ }, [])`
3. **Cleanup on unmount**: `return () => { /* Cleanup */ }`
4. **Event handling**: Coordinate React and D3.js events

### Performance Optimization
- Stop simulation on cleanup (`ForceGraph.tsx:247-250`)
- Limit node count via BFS depth
- Filter edges by similarity threshold
- Use React memoization where appropriate

## API Integration Patterns

### Edge Function Pattern
Follow the pattern in `supabase/functions/lastfm/index.ts:189-221`:

1. **CORS headers**: Define at top of file
2. **Action-based routing**: Switch statement on `action` parameter
3. **Error handling**: Try/catch with appropriate responses
4. **Caching**: Two-level cache (database + API)

### Hook Pattern for API Calls
Use the `useLastFm` hook pattern (`useLastFm.ts:7-92`):

1. **Parameters object**: Accepts action, query, artist, depth
2. **State management**: data, isLoading, error states
3. **Effect for fetching**: `useEffect` with cleanup
4. **Return object**: Consistent interface for consumers

## Database Patterns

### Migration Structure
Create migrations in `supabase/migrations/` following the existing pattern:

1. **Tables with constraints**: Primary keys, foreign keys, unique constraints
2. **Indexes for performance**: On commonly queried columns
3. **RLS policies**: For row-level security
4. **Timestamps**: `created_at` with timezone

### Type Safety
Use generated types from `src/integrations/supabase/types.ts:1-237` for database interactions.

## Configuration Patterns

### Path Aliases
Use `@/` alias for `src/` imports as configured in `vite.config.ts:13-17`.

**Example**:
```typescript
import { Artist } from '@/types/artist'
import { useLastFm } from '@/hooks/useLastFm'
```

### Environment Variables
- Frontend: Use `import.meta.env` with `VITE_` prefix
- Edge Function: Use `Deno.env.get()` for environment variables

### Build Configuration
- Check `vite.config.ts:1-19` for build settings
- Check `tailwind.config.ts:1-92` for styling configuration
- Check `tsconfig.json:4-16` for TypeScript settings

## Learning from Existing Code

When in doubt, examine these key files to understand patterns:

### Component Patterns
- `ArtistSearch.tsx:14-37` - Search component with debouncing
- `ForceGraph.tsx:19-314` - D3.js integration with React
- `MapView.tsx:19-53` - Page component with data fetching

### Hook Patterns
- `useLastFm.ts:7-92` - API integration with state management
- `use-toast.ts:1-187` - Toast notification system

### API Patterns
- `supabase/functions/lastfm/index.ts:122-187` - BFS graph algorithm
- `supabase/functions/lastfm/index.ts:88-120` - Two-level caching

### Type Patterns
- `src/types/artist.ts:1-38` - TypeScript interface definitions
- `src/integrations/supabase/types.ts:1-237` - Generated database types

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
- **Component tagging**: `lovable-tagger` plugin active in dev mode
- **No automated tests** - rely on manual testing and ESLint
- **Follow existing patterns** rather than memorizing rules