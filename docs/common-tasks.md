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

## Adding New API Endpoints

### 1. Extend Edge Function

Add a new case in the switch statement in `supabase/functions/lastfm/index.ts:196-213`:

```typescript
case 'new-action':
  const result = await handleNewAction(params);
  return new Response(JSON.stringify(result), { headers });
```

### 2. Implement Handler Function

Add the handler function above the main handler:

```typescript
async function handleNewAction(params: any) {
  // Implementation
  return { success: true, data: result };
}
```

### 3. Update TypeScript Types

If needed, add types in `src/types/artist.ts:1-38`:

```typescript
export interface NewActionResponse {
  success: boolean;
  data: NewDataType;
}
```

### 4. Update API Hook

Add the new action to `src/hooks/useLastFm.ts:61-83`:

```typescript
export function useLastFm(params: UseLastFmParams) {
  // ...

  const fetchData = useCallback(async () => {
    // ...
    switch (action) {
      case 'new-action':
        // Handle new action
        break;
      // ...
    }
  }, [action, query, artist, depth]);

  // ...
}
```

### 5. Test the Endpoint

Test with curl or in the browser:

```bash
curl "http://localhost:54321/functions/v1/lastfm?action=new-action&param=value"
```

## Adding New Database Tables

### 1. Create Migration File

Create a new file in `supabase/migrations/` with timestamp prefix:

**Example**: `supabase/migrations/20251207_new_table.sql`

### 2. Define Table Schema

Follow the pattern from existing migration:

```sql
-- Create new table
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for performance
CREATE INDEX idx_new_table_artist_id ON new_table(artist_id);
CREATE INDEX idx_new_table_name ON new_table(name);

-- Enable Row Level Security
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Public read access (guest-only app)
CREATE POLICY "Allow public read access on new_table" ON new_table
  FOR SELECT USING (true);
```

### 3. Update TypeScript Types

Generate new types by running Supabase type generation or manually update `src/integrations/supabase/types.ts:1-237`.

### 4. Test the Migration

Apply the migration and verify the table works correctly.

## Adding New UI Components (shadcn/ui)

### 1. Use shadcn/ui CLI

If shadcn/ui is configured, use its CLI to add components:

```bash
npx shadcn-ui@latest add button
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

Study `ForceGraph.tsx:19-314` to understand:

- D3.js force simulation setup
- Zoom and pan interactions
- Node and edge rendering
- Event handling

### 2. Common Modifications

#### Change Node Styling

Modify the node rendering in `ForceGraph.tsx:209-233`:

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

Add event handlers in `ForceGraph.tsx:136-151`:

```typescript
node.call(drag(simulation)).on('click', (event, d) => {
  // New click handler
  console.log('Node clicked:', d);
});
```

#### Modify Graph Layout

Adjust force simulation parameters in `ForceGraph.tsx:106-114`:

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

- Stop simulation on cleanup (`ForceGraph.tsx:247-250`)
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

Extend the BFS algorithm in `supabase/functions/lastfm/index.ts:122-187` if needed.

### 3. State Integration

Connect new features to existing state management in `MapView.tsx:19-53`.

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

### 2. Edge Function Environment Variables

Add to Supabase dashboard under Edge Function environment variables.

Access in Edge Function:

```typescript
const value = Deno.env.get('NEW_VARIABLE');
```

### 3. TypeScript Support

Add type definitions if needed in `src/vite-env.d.ts`.

## Testing Changes

### 1. Manual Testing

- Start dev server: `npm run dev`
- Test feature in browser
- Check console for errors
- Verify functionality works as expected

### 2. Linting

Run ESLint to check code quality:

```bash
npm run lint
```

### 3. Build Verification

Test production build:

```bash
npm run build
npm run preview
```

### 4. Edge Function Testing

Test locally with Supabase CLI or deploy and test in browser.

## Deployment Checklist

Before deploying changes:

1. **Run linter**: `npm run lint`
2. **Build test**: `npm run build`
3. **Preview test**: `npm run preview`
4. **Database migrations**: Apply if schema changed
5. **Edge Function**: Deploy if logic changed
6. **Environment variables**: Verify all required variables are set
7. **Browser testing**: Test in different browsers if needed

## Common Pitfalls

### 1. Missing Dependencies

Always check `package.json` for required dependencies before adding new imports.

### 2. TypeScript Errors

Run type checking if available, or rely on IDE TypeScript support.

### 3. CORS Issues

Verify CORS headers in `supabase/functions/lastfm/index.ts:3-6` if making cross-origin requests.

### 4. State Management

Ensure proper cleanup of state and event listeners to prevent memory leaks.

### 5. Performance Issues

- Limit graph depth to prevent excessive API calls
- Clean up D3.js simulations on unmount
- Use React memoization for expensive calculations
- Implement debouncing for search inputs
