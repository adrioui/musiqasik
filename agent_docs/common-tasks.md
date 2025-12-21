# Common Tasks

## Adding New Components

### 1. Create Component File

Create a new file in `src/components/` with PascalCase naming.

**Example**: `src/components/NewComponent.tsx`

### 2. Define Component Structure

Follow the pattern from `ArtistSearch.tsx:14-37`:

```typescript
import { useState } from 'react'
import { ComponentProps } from '../types/component'
import { Button } from './ui/button'
import { useCustomHook } from '../hooks/useCustomHook'
import { cn } from '../lib/utils'

interface NewComponentProps {
  // Define props interface
  onAction: (data: any) => void
  className?: string
}

export function NewComponent({ onAction, className }: NewComponentProps) {
  const [state, setState] = useState('')
  const { data, isLoading } = useCustomHook()

  return (
    <div className={cn("p-4", className)}>
      {/* Component implementation */}
    </div>
  )
}
```

### 3. Key Patterns to Follow

- **Named exports** (not default exports) for components
- **TypeScript interfaces** for props near component definition
- **Import order**: external libs → internal types → UI components → hooks → utilities
- **Styling**: Use Tailwind classes with `cn()` utility for conditional classes
- **Error handling**: Include loading states and error boundaries

### 4. Add to Existing Structure

If the component is part of a feature, add it to the appropriate directory structure.

## Adding New Pages

### 1. Create Page File

Create a new file in `src/pages/` with PascalCase naming.

**Example**: `src/pages/NewPage.tsx`

### 2. Define Page Structure

Follow the pattern from `Index.tsx:6-45`:

```typescript
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCustomData } from '@/hooks/useCustomData'

export default function NewPage() {
  const { data, isLoading } = useCustomData()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">New Page</h1>
      {/* Page content */}
    </div>
  )
}
```

### 3. Add Route

Add the route in `src/App.tsx:18-22`:

```typescript
<Route path="/new-page" element={<NewPage />} />
```

### 4. Page Patterns

- **Default export** for page components
- **Container layout** with consistent spacing
- **Loading states** for async data
- **Error boundaries** for graceful failure

## Adding New Effect Services

### 1. Define Service Interface

Add the service tag in `src/services/tags.ts`:

```typescript
export interface NewServiceImpl {
  doSomething: (param: string) => Effect.Effect<Result, AppError>;
}

export class NewService extends Context.Tag('NewService')<NewService, NewServiceImpl>() {}
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
    Effect.runPromise(program.pipe(Effect.provide(NewServiceLive), Effect.provide(ConfigLive)))
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

## Adding New UI Components (shadcn/ui)

### 1. Use shadcn/ui CLI

If shadcn/ui is configured, use its CLI to add components:

```bash
bunx shadcn-ui@latest add button
```

### 2. Manual Addition

If not using CLI, copy from `src/components/ui/` patterns:

1. Check existing components for styling patterns
2. Use consistent Tailwind classes
3. Follow Radix UI accessibility patterns
4. Use `cn()` utility for conditional classes

### 3. Component Integration

Import and use like existing UI components:

```typescript
import { NewComponent } from '@/components/ui/new-component';
```

## Modifying Graph Visualization

### 1. Understand Current Implementation

Study `ForceGraph/index.tsx:19-314` to understand:

- D3.js force simulation setup
- Zoom and pan interactions
- Node and edge rendering
- Event handling

### 2. Common Modifications

#### Change Node Styling

Modify the node rendering in ForceGraph:

```typescript
// Change node appearance
node
  .append('circle')
  .attr('r', (d) => Math.sqrt(d.listeners || 1000) / 20)
  .attr('fill', '#3b82f6') // Change color
  .attr('stroke', '#1d4ed8')
  .attr('stroke-width', 2);
```

#### Add Node Interactions

Add event handlers:

```typescript
node.call(drag(simulation)).on('click', (event, d) => {
  // New click handler
  console.log('Node clicked:', d);
});
```

#### Modify Graph Layout

Adjust force simulation parameters:

```typescript
const simulation = d3
  .forceSimulation(nodes)
  .force(
    'link',
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance(100)
  )
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30));
```

### 3. Performance Considerations

- Stop simulation on cleanup
- Limit node count via BFS depth parameter
- Use React memoization for expensive calculations

## Adding New Graph Features

### 1. Graph Controls

Follow `GraphControls.tsx:1-45` pattern for adding controls:

```typescript
interface NewControlProps {
  value: number
  onChange: (value: number) => void
}

export function NewControl({ value, onChange }: NewControlProps) {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="new-control">New Control</Label>
      <Slider
        id="new-control"
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        className="w-[200px]"
      />
    </div>
  )
}
```

### 2. Graph Data Processing

Extend the BFS algorithm in `src/services/graph.ts:28-192` if needed.

### 3. State Integration

Connect new features to existing state management in `MapView.tsx:19-53`.

## Testing Changes

### 1. Unit Tests (Vitest)

Run all unit tests:

```bash
bun run test
```

Run specific test file:

```bash
bun run test src/hooks/useLastFm.test.ts
```

Run tests in watch mode:

```bash
bun run test -- --watch
```

### 2. E2E Tests (Playwright)

Run all E2E tests:

```bash
bun run test:e2e
```

Run specific E2E test:

```bash
bunx playwright test e2e/home.spec.ts
```

Run with UI:

```bash
bunx playwright test --ui
```

### 3. Coverage Report

Generate coverage:

```bash
bun run test:coverage
```

View report: Open `coverage/index.html` in browser

### 4. Linting

Check code quality:

```bash
bun run lint
```

### 5. Build Verification

Test production build:

```bash
bun run build
bun run preview
```

## Styling Changes

### 1. Tailwind Configuration

Modify `tailwind.config.ts:15-88` for theme changes:

```typescript
theme: {
  extend: {
    colors: {
      // Add new colors
      'new-color': '#ff6b6b',
    },
    // Extend other theme properties
  }
}
```

### 2. CSS Variables

Update CSS custom properties in `src/index.css:6-100`:

```css
:root {
  --new-color: #ff6b6b;
}
```

### 3. Component Styling

Use Tailwind classes with `cn()` utility:

```typescript
className={cn(
  "base-classes",
  condition && "conditional-classes",
  className // Allow parent to override
)}
```

## Environment Configuration Changes

### 1. Frontend Environment Variables

Add to `.env` file:

```env
VITE_NEW_VARIABLE=value
```

Access in code:

```typescript
const value = import.meta.env.VITE_NEW_VARIABLE;
```

### 2. Update ConfigService

Add to `src/services/index.ts`:

```typescript
export const ConfigLive = Layer.succeed(ConfigService, {
  // ... existing config
  newVariable: import.meta.env.VITE_NEW_VARIABLE || '',
});
```

### 3. TypeScript Support

Add type definitions if needed in `src/vite-env.d.ts`.

## Deployment Checklist

Before deploying changes:

1. **Run tests**: `bun run test`
2. **Run E2E tests**: `bun run test:e2e`
3. **Run linter**: `bun run lint`
4. **Build test**: `bun run build`
5. **Preview test**: `bun run preview`
6. **Database schema**: Apply if schema changed (SurrealDB)
7. **Environment variables**: Verify all required variables are set
8. **Browser testing**: Test in different browsers if needed

## Common Pitfalls

### 1. Missing Dependencies

Always check `package.json` for required dependencies before adding new imports.

### 2. TypeScript Errors

Run type checking if available, or rely on IDE TypeScript support.

### 3. Effect Service Errors

Ensure all service dependencies are provided in the Layer composition.

### 4. State Management

Ensure proper cleanup of state and event listeners to prevent memory leaks.

### 5. Performance Issues

- Limit graph depth to prevent excessive API calls
- Clean up D3.js simulations on unmount
- Use React memoization for expensive calculations
- Implement debouncing for search inputs
