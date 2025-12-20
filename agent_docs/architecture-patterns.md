# Architecture Patterns

## System Overview

MusiqasiQ is a React-based web application that visualizes artist similarity relationships through interactive force-directed graphs. The system integrates with the Last.fm API, optionally caches data in SurrealDB, and provides an engaging interface for exploring music artist connections.

### Architecture Principles

- **Effect-based Services**: Typed, composable service layer using Effect library
- **Graceful Degradation**: App works without database (Last.fm-only mode)
- **Dependency Injection**: Services use Context.Tag pattern for testability

## Data Flow

### 1. User Search Flow

```
User Search → ArtistSearch.tsx → useLastFm.ts →
Effect Runtime → LastFmService → Last.fm API → Response
```

**Key Components:**

- `ArtistSearch.tsx:24-37`: Debounced search input with keyboard navigation
- `useLastFm.ts:11-33`: Hook with Effect runtime integration
- `src/services/lastfm.ts:57-201`: LastFmService implementation
- `src/services/tags.ts:8-20`: Service tag definitions

### 2. Graph Loading Flow

```
Graph Request → MapView.tsx → useSimilarArtists.ts →
Effect Runtime → GraphService → BFS Traversal → Cache/API → Graph Data
```

**Key Components:**

- `MapView.tsx:26-42`: Graph page with data fetching
- `useSimilarArtists.ts`: Similar artists data processing
- `src/services/graph.ts:28-192`: BFS algorithm with configurable depth
- `src/services/database.ts:7-163`: Optional SurrealDB caching

### 3. Graph Rendering Flow

```
Graph Data → ForceGraph/index.tsx → D3.js Simulation →
Interactive Visualization
```

**Key Components:**

- `ForceGraph/index.tsx:17-279`: D3.js force-directed graph with zoom/pan
- `ForceGraph/hooks/useGraphData.ts`: Graph data filtering and processing
- `ForceGraph/hooks/useD3Zoom.ts`: Zoom behavior management
- `ForceGraph/hooks/useElementDimensions.ts`: Container dimension tracking

### 4. Data Caching Flow (Optional)

```
API Response → DatabaseService → SurrealDB → Client
```

**Key Components:**

- `src/services/database.ts:7-163`: DatabaseService with SurrealDB operations
- `src/integrations/surrealdb/client.ts`: SurrealDB client wrapper
- `surrealdb/schema.surql`: Database schema definition

## Database Schema (SurrealDB)

The database schema is defined in `surrealdb/schema.surql`.

### Artists Table

```surql
DEFINE TABLE artist SCHEMAFULL;

DEFINE FIELD name ON TABLE artist TYPE string;
DEFINE FIELD mbid ON TABLE artist TYPE option<string>;
DEFINE FIELD url ON TABLE artist TYPE option<string>;
DEFINE FIELD image_small ON TABLE artist TYPE option<string>;
DEFINE FIELD image_medium ON TABLE artist TYPE option<string>;
DEFINE FIELD image_large ON TABLE artist TYPE option<string>;
DEFINE FIELD image_extralarge ON TABLE artist TYPE option<string>;
DEFINE FIELD listeners ON TABLE artist TYPE option<int>;
DEFINE FIELD playcount ON TABLE artist TYPE option<int>;
DEFINE FIELD created_at ON TABLE artist TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_artist_name ON TABLE artist COLUMNS name UNIQUE;
```

### Similarity Edges Table

```surql
DEFINE TABLE similarity_edge SCHEMAFULL;

DEFINE FIELD source ON TABLE similarity_edge TYPE record<artist>;
DEFINE FIELD target ON TABLE similarity_edge TYPE record<artist>;
DEFINE FIELD match_score ON TABLE similarity_edge TYPE float;
DEFINE FIELD created_at ON TABLE similarity_edge TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_similarity_source ON TABLE similarity_edge COLUMNS source;
DEFINE INDEX idx_similarity_target ON TABLE similarity_edge COLUMNS target;
```

## Service Layer

### Effect Services Architecture

All services use the Effect library with Context.Tag pattern (`src/services/tags.ts`):

```typescript
export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  ConfigServiceImpl
>() {}

export class LastFmService extends Context.Tag('LastFmService')<
  LastFmService,
  LastFmServiceImpl
>() {}
```

### Available Services

| Service | File | Purpose |
|---------|------|---------|
| ConfigService | `src/services/index.ts:14-22` | Environment configuration |
| LastFmService | `src/services/lastfm.ts:57-201` | Last.fm API integration |
| DatabaseService | `src/services/database.ts:7-163` | SurrealDB operations |
| GraphService | `src/services/graph.ts:28-192` | BFS graph building |

### Service Composition

Services are composed using Effect layers:

```typescript
import { ConfigLive, LastFmServiceLive, GraphServiceLive } from '@/services';

const program = Effect.gen(function* () {
  const graphService = yield* GraphService;
  return yield* graphService.buildGraph(artist, depth);
});

Effect.runPromise(program.pipe(
  Effect.provide(GraphServiceLive),
  Effect.provide(LastFmServiceLive),
  Effect.provide(ConfigLive)
));
```

## State Management

### Local State (React `useState`)

- UI state: Search queries, selected artists, graph controls
- Component state: Loading states, error messages, user interactions
- Example: `ArtistSearch.tsx:15-17` for search input state

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
- `ForceGraph/index.tsx:19-314`: D3.js graph visualization
- `GraphControls.tsx:1-45`: Depth and threshold controls
- `NavLink.tsx:1-25`: Navigation component

### UI Components (`src/components/ui/`)

- 46+ shadcn/ui components (auto-generated)
- Consistent styling with Tailwind CSS
- Accessible Radix UI primitives

### Custom Hooks (`src/hooks/`)

- `useLastFm.ts:7-92`: Last.fm API integration with state management
- `useSimilarArtists.ts`: Similar artists data fetching
- `use-toast.ts:1-187`: Toast notification system
- `use-mobile.tsx:5-19`: Mobile detection hook

## Performance Considerations

### Graph Rendering Optimization

- D3.js simulation stops on cleanup
- Node count limited by BFS depth (max 3 hops)
- Edge filtering by similarity threshold improves performance
- Virtual DOM reconciliation via React

### API Optimization

- Optional SurrealDB caching reduces Last.fm API calls
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
- Efficient data structures for graph operations
- Proper event listener cleanup

## Error Handling

### User-Facing Errors

- Toast notifications for API errors (`MapView.tsx:44-53`)
- Loading states with spinners (`ArtistSearch.tsx:106-108`)
- Empty state handling (`ArtistPanel.tsx:15-25`)

### API Error Handling

- Typed errors in `src/lib/errors.ts` (NetworkError, LastFmApiError, DatabaseError)
- Effect error channels for composable error handling
- Graceful degradation on Last.fm API failures

### Graph Error Handling

- Simulation error boundaries
- Missing data handling in visualization
- Invalid state prevention

## Integration Points

### Last.fm API Integration

- Rate limiting consideration
- API key management via ConfigService
- Response caching strategy (optional SurrealDB)
- Error response handling with typed errors

### SurrealDB Integration (Optional)

- WebSocket connection via `src/integrations/surrealdb/client.ts`
- Schema management via `surrealdb/schema.surql`
- Graceful fallback when database unavailable
- TypeScript types in `src/types/artist.ts`

### D3.js Integration

- React integration via ForceGraph hooks
- Simulation lifecycle management
- Event handling coordination
- Performance optimization with cleanup

## Scalability Considerations

### Database Scaling

- Indexes optimized for common queries
- Efficient graph traversal queries
- Optional caching layer

### API Scaling

- Effect services are stateless
- Caching strategy for high traffic
- Rate limiting implementation

### Frontend Scaling

- Component modularity
- State management patterns
- Bundle size optimization
- Lazy loading opportunities