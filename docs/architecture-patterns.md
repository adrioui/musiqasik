# Architecture Patterns

## System Overview

MusiqasiQ is a React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. The system integrates with the Last.fm API, caches data in Supabase, and provides an engaging interface for exploring music artist connections.

## Data Flow

### 1. User Search Flow

```
User Search → ArtistSearch.tsx:24-37 → useLastFm.ts:11-33 →
Supabase Edge Function → Last.fm API → Cache → Response
```

**Key Components:**

- `ArtistSearch.tsx:24-37`: Debounced search input with keyboard navigation
- `useLastFm.ts:11-33`: API hook with error handling and loading states
- Edge Function: `supabase/functions/lastfm/index.ts:196-200` (search action)
- Caching: Two-level cache (database + memory) in `index.ts:88-120`

### 2. Graph Loading Flow

```
Graph Request → MapView.tsx:26-42 → useLastFm.ts:35-59 →
Edge Function → BFS Traversal → Cache/API → Graph Data
```

**Key Components:**

- `MapView.tsx:26-42`: Graph page with React Query integration
- `useLastFm.ts:35-59`: Graph data fetching with depth parameter
- BFS Algorithm: `index.ts:122-187` with configurable depth (max 3 hops)
- Caching: Similarity edges stored with match scores as DECIMAL(5,4)

### 3. Graph Rendering Flow

```
Graph Data → ForceGraph.tsx:64-251 → D3.js Simulation →
Interactive Visualization
```

**Key Components:**

- `ForceGraph.tsx:64-251`: D3.js force-directed graph with zoom/pan
- Node dragging with physics simulation (`ForceGraph.tsx:136-151`)
- Dynamic node sizing based on listener count (`ForceGraph.tsx:155`)
- Edge filtering by similarity threshold (`ForceGraph.tsx:35`)

### 4. Data Caching Flow

```
API Response → Database Cache → Memory Cache → Client
```

**Key Components:**

- Artist data upsert with conflict resolution (`index.ts:100-112`)
- Similarity edges stored with match scores (`index.ts:174-179`)
- Database indexes for performance (`supabase/migrations/*.sql:46-49`)

## Database Schema

### Artists Table (`supabase/migrations/*.sql:5-17`)

```sql
CREATE TABLE artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  mbid TEXT,
  url TEXT,
  image_small TEXT,
  image_medium TEXT,
  image_large TEXT,
  image_extralarge TEXT,
  listeners INTEGER,
  playcount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Similarity Edges Table (`sql:20-28`)

```sql
CREATE TABLE similarity_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  target_artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  match_score DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(source_artist_id, target_artist_id)
);
```

### Indexes for Performance (`sql:46-49`)

```sql
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_similarity_edges_source ON similarity_edges(source_artist_id);
CREATE INDEX idx_similarity_edges_target ON similarity_edges(target_artist_id);
```

### Row Level Security (`sql:31-43`)

```sql
-- Enable RLS
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_edges ENABLE ROW LEVEL SECURITY;

-- Public read access (guest-only app)
CREATE POLICY "Allow public read access on artists" ON artists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on similarity_edges" ON similarity_edges
  FOR SELECT USING (true);
```

## API Endpoints (Edge Function)

### Search Artists (`index.ts:196-200`)

```typescript
case 'search':
  const searchResults = await searchArtists(q);
  return new Response(JSON.stringify(searchResults), { headers });
```

### Get Similarity Graph (`index.ts:202-207`)

```typescript
case 'graph':
  const depth = parseInt(depthParam || '2');
  const graphData = await getArtistGraph(artist, depth);
  return new Response(JSON.stringify(graphData), { headers });
```

### Get Artist Details (`index.ts:209-213`)

```typescript
case 'artist':
  const artistData = await getArtistDetails(name);
  return new Response(JSON.stringify(artistData), { headers });
```

## Graph Building Algorithm

### BFS Traversal (`index.ts:122-187`)

The algorithm builds artist similarity graphs using breadth-first search:

1. **Start with seed artist**: Fetch or retrieve from cache
2. **Get similar artists**: From Last.fm API or cache
3. **Recurse with depth limit**: Max 3 hops to prevent infinite recursion
4. **Build graph structure**: Nodes (artists) and edges (similarities)
5. **Store in cache**: Both artists and similarity edges

**Key Implementation Details:**

- Depth limit: Configurable, max 3 hops
- Match scores: Stored as DECIMAL(5,4) for precision
- Caching: Two-level (database + API fallback)
- Error handling: Graceful degradation on API failures

## State Management

### Local State (React `useState`)

- UI state: Search queries, selected artists, graph controls
- Component state: Loading states, error messages, user interactions
- Example: `ArtistSearch.tsx:15-17` for search input state

### Server State (React Query)

- API data: Artist search results, graph data
- Caching: Automatic cache management with stale-while-revalidate
- Example: `MapView.tsx:26-42` for graph data fetching

### URL State (React Router)

- Shareable URLs: Artist name in route parameters
- Navigation state: Current view and selections
- Example: Route parameters for artist graphs

## Component Architecture

### Page Components (`src/pages/`)

- `Index.tsx:6-45`: Homepage with search and features
- `MapView.tsx:19-53`: Main graph visualization page
- `NotFound.tsx:1-15`: 404 error page

### Feature Components (`src/components/`)

- `ArtistSearch.tsx:14-37`: Search with debouncing and keyboard nav
- `ArtistPanel.tsx:1-45`: Artist details display
- `ForceGraph.tsx:19-314`: D3.js graph visualization
- `GraphControls.tsx:1-45`: Depth and threshold controls
- `NavLink.tsx:1-25`: Navigation component

### UI Components (`src/components/ui/`)

- 46+ shadcn/ui components (auto-generated)
- Consistent styling with Tailwind CSS
- Accessible Radix UI primitives

### Custom Hooks (`src/hooks/`)

- `useLastFm.ts:7-92`: Last.fm API integration with state management
- `use-toast.ts:1-187`: Toast notification system
- `use-mobile.tsx:5-19`: Mobile detection hook

## Performance Considerations

### Graph Rendering Optimization

- D3.js simulation stops on cleanup (`ForceGraph.tsx:247-250`)
- Node count limited by BFS depth (max 3 hops)
- Edge filtering by similarity threshold improves performance
- Virtual DOM reconciliation via React

### API Optimization

- Two-level caching reduces Last.fm API calls
- BFS depth limit prevents infinite recursion
- Database indexes optimize query performance
- Debounced search requests (`ArtistSearch.tsx:23-37`)

### Bundle Size Optimization

- Vite code splitting
- Tree-shaking enabled
- SWC for fast compilation
- Lazy loading potential for large components

### Memory Management

- Graph simulation cleanup on component unmount
- React Query cache management
- Efficient data structures for graph operations
- Proper event listener cleanup

## Error Handling

### User-Facing Errors

- Toast notifications for API errors (`MapView.tsx:44-53`)
- Loading states with spinners (`ArtistSearch.tsx:106-108`)
- Empty state handling (`ArtistPanel.tsx:15-25`)

### API Error Handling

- Try/catch blocks in API calls (`useLastFm.ts:26-32`)
- Graceful degradation on Last.fm API failures
- Cache fallback when API unavailable

### Graph Error Handling

- Simulation error boundaries
- Missing data handling in visualization
- Invalid state prevention

## Integration Points

### Last.fm API Integration

- Rate limiting consideration
- API key management via environment variables
- Response caching strategy
- Error response handling

### Supabase Integration

- Edge Function deployment
- Database schema management
- RLS policy configuration
- TypeScript type generation

### D3.js Integration

- React integration patterns
- Simulation lifecycle management
- Event handling coordination
- Performance optimization

## Scalability Considerations

### Database Scaling

- Indexes optimized for common queries
- RLS policies for multi-tenant potential
- Efficient graph traversal queries

### API Scaling

- Edge Function stateless design
- Caching strategy for high traffic
- Rate limiting implementation

### Frontend Scaling

- Component modularity
- State management patterns
- Bundle size optimization
- Lazy loading opportunities
