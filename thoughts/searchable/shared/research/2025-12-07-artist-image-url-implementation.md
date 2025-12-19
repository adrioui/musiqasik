---
date: 2025-12-07T00:00:00Z
researcher: adrifadilah
git_commit: 8c0660b
branch: main
repository: musiqasik
topic: 'Artist Image URL Implementation'
tags: [research, codebase, artist-images, lastfm, supabase]
status: complete
last_updated: 2025-12-07
last_updated_by: adrifadilah
---

# Research: Artist Image URL Implementation

**Date**: 2025-12-07T00:00:00Z
**Researcher**: adrifadilah
**Git Commit**: 8c0660b
**Branch**: main
**Repository**: musiqasik

## Research Question

How are artist photo/image URLs implemented in the MusiqasiQ codebase? What is the data flow from Last.fm API through the caching layer to the UI components?

## Summary

The artist image URL implementation follows a complete data flow from Last.fm API → Supabase Edge Function → PostgreSQL database → React frontend. Image URLs are stored as nullable strings in the `artists.image_url` column, fetched using Last.fm's API with size selection ('large' for search, 'extralarge' for details), cached in Supabase with a read-through pattern, and displayed in three main UI components with conditional rendering and fallback icons.

## Detailed Findings

### 1. Data Structure and Types

#### Artist Interface Definition

**Location**: `src/types/artist.ts:1-12`

The core `Artist` interface defines the image URL field:

```typescript
export interface Artist {
  id?: string;
  name: string;
  lastfm_mbid?: string | null;
  image_url?: string | null; // Nullable optional string
  listeners?: number | null;
  playcount?: number | null;
  tags?: string[] | null;
  lastfm_url?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

**Key characteristics**:

- Field name: `image_url` (with underscore, consistent across codebase)
- Type: `string | null` (nullable string)
- Optional property (`?`)
- Consistent naming across all layers (TypeScript, database, API)

#### Database Schema

**Location**: `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:5-17`

The PostgreSQL `artists` table stores image URLs:

```sql
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lastfm_mbid TEXT,
  name TEXT NOT NULL,
  image_url TEXT,  -- TEXT type, nullable
  listeners INTEGER,
  playcount INTEGER,
  tags TEXT[],
  lastfm_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);
```

**Database constraints**:

- Column type: `TEXT` (PostgreSQL string type)
- Nullable: Yes (no `NOT NULL` constraint)
- No default value
- Indexed for performance (implicitly via unique constraint on name)

#### Generated Database Types

**Location**: `src/integrations/supabase/types.ts:21,33,45`

Supabase generates TypeScript types from the database schema:

```typescript
// Row type (select)
image_url: string | null

// Insert type
image_url?: string | null

// Update type
image_url?: string | null
```

### 2. Last.fm API Integration

#### Edge Function Implementation

**Location**: `supabase/functions/lastfm/index.ts`

The Supabase Edge Function handles all Last.fm API interactions and implements the caching layer.

##### Image Size Selection Logic

The function selects different image sizes based on the API endpoint:

**For search results** (`index.ts:37-44`):

```typescript
image_url: artist.image?.find((img: any) => img.size === 'large')?.['#text'] || undefined;
```

- Uses `'large'` size (approximately 174x174 pixels)
- Extracts from `artist.search` endpoint response
- Falls back to `undefined` if no large image available

**For artist details** (`index.ts:58-67`):

```typescript
image_url: artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'] || undefined;
```

- Uses `'extralarge'` size (approximately 300x300 pixels)
- Extracts from `artist.getinfo` endpoint response
- Falls back to `undefined` if no extralarge image available

##### Last.fm API Response Structure

Last.fm returns images as an array of objects:

```json
{
  "image": [
    { "size": "small", "#text": "https://..." },
    { "size": "medium", "#text": "https://..." },
    { "size": "large", "#text": "https://..." },
    { "size": "extralarge", "#text": "https://..." },
    { "size": "mega", "#text": "https://..." }
  ]
}
```

The code uses `find()` to locate the desired size and accesses the URL via `['#text']` property (necessary because of the special character in the property name).

##### Caching Implementation

**Location**: `supabase/functions/lastfm/index.ts:88-120`

The `getOrCreateArtist()` function implements read-through caching:

```typescript
async function getOrCreateArtist(artistName: string): Promise<ArtistData | null> {
  // 1. Check cache first
  const { data: cached } = await supabase
    .from('artists')
    .select('*')
    .ilike('name', artistName)
    .maybeSingle();

  if (cached) return cached; // Return cached data

  // 2. Fetch from Last.fm API
  const artistInfo = await getArtistInfo(artistName);
  if (!artistInfo) return null;

  // 3. Cache in database
  const { data: inserted, error } = await supabase
    .from('artists')
    .upsert(
      {
        name: artistInfo.name,
        lastfm_mbid: artistInfo.lastfm_mbid,
        image_url: artistInfo.image_url, // Store image URL
        listeners: artistInfo.listeners,
        playcount: artistInfo.playcount,
        tags: artistInfo.tags,
        lastfm_url: artistInfo.lastfm_url,
      },
      { onConflict: 'name' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error caching artist:', error);
    return artistInfo; // Return API data even if cache fails
  }

  return inserted; // Return cached data
}
```

**Caching patterns**:

- **Read-through cache**: Checks database before API call
- **Write-through on miss**: Caches immediately after API fetch
- **Upsert with conflict handling**: Uses `ON CONFLICT (name)` to handle duplicates
- **Graceful degradation**: Returns API data if cache insertion fails
- **Case-insensitive lookup**: Uses `ilike()` for artist name matching

##### Graph Data Caching

**Location**: `supabase/functions/lastfm/index.ts:122-187`

The similarity graph generation uses two-level caching:

1. **Artist-level caching**: Each artist is cached via `getOrCreateArtist()`
2. **Edge-level caching**: Similarity relationships cached in `similarity_edges` table

The BFS traversal:

- Checks for cached edges before API calls
- Limits depth to 3 hops maximum (performance optimization)
- Processes 10 most similar artists per node
- Caches newly discovered edges immediately

### 3. Frontend Hook Integration

#### useLastFm Hook

**Location**: `src/hooks/useLastFm.ts`

The custom hook provides React Query integration:

```typescript
const searchArtists = async (query: string): Promise<Artist[]> => {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/lastfm?action=search&q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data; // Contains image_url fields
};

const getGraph = async (artistName: string, depth: number = 1): Promise<GraphData> => {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/lastfm?action=graph&artist=${encodeURIComponent(artistName)}&depth=${depth}`
  );
  const data = await response.json();
  return data; // Contains nodes with image_url fields
};
```

**Hook characteristics**:

- Returns `Artist[]` or `GraphData` with `image_url` fields intact
- No transformation of image URLs
- Error handling with try/catch blocks
- Loading state management

### 4. UI Component Implementation

#### ArtistSearch Component

**Location**: `src/components/ArtistSearch.tsx:125-135`

Displays artist images in search results dropdown:

```tsx
<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
  {artist.image_url ? (
    <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover" />
  ) : (
    <Music2 className="h-6 w-6 text-muted-foreground" />
  )}
</div>
```

**Implementation details**:

- Container: 48x48px (w-12 h-12) rounded-lg
- Conditional rendering based on `image_url` presence
- Fallback: `Music2` icon from lucide-react
- Styling: `object-cover` for proper image scaling
- Accessibility: `alt` attribute with artist name

#### ArtistPanel Component

**Location**: `src/components/ArtistPanel.tsx:40-48`

Displays artist image in detail panel:

```tsx
<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
  {artist.image_url ? (
    <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover" />
  ) : (
    <Music2 className="h-10 w-10 text-muted-foreground" />
  )}
</div>
```

**Implementation details**:

- Container: 80x80px (w-20 h-20) rounded-xl
- Larger size than search results for detail view
- Same conditional rendering pattern
- Same fallback icon (different size: h-10 w-10)

#### ForceGraph Component

**Location**: `src/components/ForceGraph.tsx:168-189`

Renders artist images as SVG elements in the force-directed graph:

```typescript
node.each(function (d) {
  if (d.image_url) {
    const nodeG = d3.select(this);
    const radius = d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8;

    // Create clipPath for circular mask
    const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('circle')
      .attr('r', radius - 2);

    // Insert image element
    nodeG
      .insert('image', 'circle')
      .attr('xlink:href', d.image_url)
      .attr('x', -(radius - 2))
      .attr('y', -(radius - 2))
      .attr('width', (radius - 2) * 2)
      .attr('height', (radius - 2) * 2)
      .attr('clip-path', `url(#${clipId})`)
      .style('pointer-events', 'none');
  }
});
```

**Implementation details**:

- SVG `image` elements with `xlink:href` attribute
- Circular clipping masks for rounded appearance
- Dynamic sizing based on node type and listener count
- Center nodes: 28px radius
- Regular nodes: 18-26px radius (based on popularity)
- `pointer-events: none` prevents image from blocking node interactions
- Images only rendered when `d.image_url` exists (no fallback in graph)

### 5. Data Flow Summary

#### Complete Data Flow

```
User Search
    ↓
ArtistSearch.tsx
    ↓
useLastFm.ts (searchArtists)
    ↓
GET /functions/v1/lastfm?action=search&q=...
    ↓
supabase/functions/lastfm/index.ts
    ↓
Last.fm API: artist.search
    ↓
Extract 'large' image URL
    ↓
Return JSON with image_url field
    ↓
ArtistSearch.tsx displays image
```

#### Graph Data Flow

```
User clicks artist
    ↓
MapView.tsx / ForceGraph.tsx
    ↓
useLastFm.ts (getGraph)
    ↓
GET /functions/v1/lastfm?action=graph&artist=...&depth=...
    ↓
supabase/functions/lastfm/index.ts
    ↓
getOrCreateArtist() - Check cache
    ↓
[Cache Miss] → Last.fm API: artist.getinfo
    ↓
Extract 'extralarge' image URL
    ↓
Cache artist in database
    ↓
BFS traversal for similar artists
    ↓
Return graph with nodes containing image_url
    ↓
ForceGraph.tsx renders images as SVG
```

### 6. Error Handling and Edge Cases

#### Missing Images

- **Database**: `image_url` column is nullable, stores `NULL` when no image available
- **API**: Returns `undefined` when no image found for requested size
- **Frontend**: Conditional rendering shows fallback icon when `image_url` is falsy
- **Graph**: No image rendered when `image_url` missing (node appears as colored circle)

#### Image Loading Errors

- **No error handling**: No `onError` handlers on `img` elements
- **No retry logic**: Failed images remain broken
- **No placeholder images**: Only uses Music2 icon fallback
- **Broken URLs**: If Last.fm returns invalid URLs, they fail silently

#### Caching Failures

- **Database errors**: Edge Function returns API data even if cache insertion fails
- **Network errors**: React Query handles retries and error states
- **API rate limits**: No explicit handling, relies on Last.fm's limits

## Code References

### Type Definitions

- `src/types/artist.ts:5` - `image_url?: string | null`
- `src/integrations/supabase/types.ts:21` - Database row type for image_url

### Database Schema

- `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql:11` - `image_url TEXT` column

### API Integration

- `supabase/functions/lastfm/index.ts:40` - Search results use 'large' images
- `supabase/functions/lastfm/index.ts:62` - Artist info uses 'extralarge' images
- `supabase/functions/lastfm/index.ts:105` - Caching image_url in database
- `supabase/functions/lastfm/index.ts:88-120` - getOrCreateArtist caching function

### Frontend Components

- `src/components/ArtistSearch.tsx:126-134` - Search result image display
- `src/components/ArtistPanel.tsx:40-48` - Artist detail panel image display
- `src/components/ForceGraph.tsx:168-189` - Graph node SVG image rendering

### Hook Integration

- `src/hooks/useLastFm.ts:24` - searchArtists returns image_url
- `src/hooks/useLastFm.ts:50` - getGraph returns nodes with image_url
- `src/hooks/useLastFm.ts:75` - getArtist returns image_url

## Architecture Documentation

### Design Patterns

1. **Read-Through Caching Pattern**
   - Database checked before external API calls
   - Reduces Last.fm API usage
   - Improves response times for repeated queries

2. **Two-Level Caching**
   - Artist data cached in `artists` table
   - Similarity relationships cached in `similarity_edges` table
   - BFS traversal leverages edge caching for performance

3. **Conditional Rendering Pattern**
   - All UI components check `image_url` before rendering
   - Consistent fallback to Music2 icon
   - No broken image UI states

4. **Size-Based Image Selection**
   - Different image sizes for different contexts
   - 'large' for search results (thumbnails)
   - 'extralarge' for detail views (higher quality)
   - Direct URL usage in graph (SVG rendering)

5. **BFS with Depth Limitation**
   - Graph traversal limited to 3 hops maximum
   - Prevents excessive API calls
   - Processes 10 most similar artists per node

### Data Consistency

- **Field naming**: `image_url` used consistently across all layers
- **Type consistency**: `string | null` type maintained from database to frontend
- **API contracts**: Edge Function returns consistent JSON structure
- **Null handling**: Optional chaining and conditional rendering throughout

### Performance Considerations

- **Image sizes**: Different sizes selected based on display context
- **Caching**: Database caching reduces external API calls
- **BFS limits**: Depth limitation prevents runaway graph generation
- **SVG rendering**: Efficient D3.js rendering for graph visualization

### Security and Privacy

- **No image proxy**: Direct Last.fm URLs used (no intermediate proxy)
- **CORS**: Supabase Edge Function configured with CORS headers
- **No authentication**: Public read access to artist data
- **URL validation**: No validation of image URLs (trust Last.fm)

## Related Research

- None currently documented

## Open Questions

1. **Image optimization**: Should images be proxied through a CDN or optimized?
2. **Error handling**: Should broken image URLs be detected and handled?
3. **Fallback strategy**: Should placeholder images be used instead of icons?
4. **Lazy loading**: Should images be lazily loaded for performance?
5. **Cache invalidation**: How should stale image URLs be refreshed?
6. **Image sizes**: Are 'large' and 'extralarge' optimal sizes for all displays?
7. **Graph performance**: Does rendering many images impact graph interactivity?

## Follow-up Research Areas

- Performance impact of loading multiple artist images
- Last.fm API rate limits and caching effectiveness
- User experience with missing/broken images
- Mobile data usage with high-resolution images
- Accessibility considerations for image alt text
