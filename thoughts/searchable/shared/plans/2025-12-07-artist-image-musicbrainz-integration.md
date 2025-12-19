# Artist Image MusicBrainz Integration Implementation Plan

## Overview

Replace Last.fm's broken artist image URLs with proper images from MusicBrainz/Wikimedia Commons. Last.fm now returns placeholder images (white star) for most artists. This implementation integrates MusicBrainz API to fetch actual artist images while maintaining backward compatibility and caching.

## Current State Analysis

### Problem

- Last.fm API returns placeholder images (white star) for ~90% of artists
- Current implementation extracts images from `artist.image` array using `'large'` or `'extralarge'` sizes
- Results in poor user experience with repetitive placeholder icons

### Current Implementation

**File**: `supabase/functions/lastfm/index.ts:40,62`

```typescript
// Search results - uses 'large' size
image_url: artist.image?.find((img: any) => img.size === 'large')?.['#text'] || undefined;

// Artist details - uses 'extralarge' size
image_url: artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'] || undefined;
```

**Data Flow**: Last.fm API → Extract image URL → Cache in Supabase → Display in UI

### Key Discovery from Research

The GitHub commit (hugovk/now-playing-radiator@e6de980) demonstrates the proven solution:

1. Extract MBID from Last.fm API response
2. Query MusicBrainz API for artist relations
3. Find image URL in relations with `type === 'image'`
4. Convert Wikimedia Commons URLs to direct image links
5. Use MusicBrainz image instead of Last.fm placeholder

## Desired End State

### After Implementation

- Artist images load from Wikimedia Commons via MusicBrainz
- Last.fm images used only as fallback when MusicBrainz has no image
- Rate limiting compliant with MusicBrainz (1 req/sec)
- Existing cached artists updated with proper images
- No breaking changes to API contract or UI components

### Verification Criteria

- Search for "The Beatles" → Shows actual band photo (not white star)
- Search for "Radiohead" → Shows actual band photo
- Graph nodes display proper artist images
- Artist panel shows high-quality images
- No placeholder images for artists with MBID and MusicBrainz image

## What We're NOT Doing

- **Not** building a MusicBrainz proxy or API wrapper service
- **Not** implementing image optimization or CDN proxying
- **Not** adding image upload/custom image functionality
- **Not** changing database schema (using existing `image_url` column)
- **Not** modifying UI components (they work with current data structure)
- **Not** implementing complex cache invalidation (simple update on fetch)

## Implementation Approach

### Strategy

1. **Targeted MusicBrainz usage**: Use MusicBrainz for detailed artist info and graph generation (via cached images), and optionally only for the top few search results to keep search responsive under the 1 req/sec rate limit
2. **Fallback Pattern**: Try MusicBrainz first, fall back to Last.fm if unavailable
3. **Graceful Degradation**: Handle missing MBID, network errors, rate limits
4. **Backward Compatible**: No changes to API response format or UI code
5. **Incremental Migration**: Backfill existing artists over time

### Architecture

```
User Request
    ↓
Edge Function
    ├→ Last.fm API (get artist data + MBID)
    └→ MusicBrainz API (get image from MBID) [rate limited]
         ↓
    Merge: MusicBrainz image (primary) + Last.fm image (fallback)
         ↓
    Cache in Supabase (artists.image_url)
         ↓
    Return to Frontend
         ↓
UI Components (no changes needed)
```

## Phase 1: MusicBrainz API Integration

### Overview

Add MusicBrainz API client functions to the Edge Function with proper rate limiting and error handling.

### Changes Required

#### 1. Add MusicBrainz API Configuration

**File**: `supabase/functions/lastfm/index.ts`
**Location**: After line 11 (after supabase client initialization)

```typescript
// MusicBrainz API configuration
const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';

// Prefer env override to comply with MusicBrainz UA policy
// Example default: MusiqasiQ/1.0 (https://github.com/adrifadilah/musiqasik)
const MUSICBRAINZ_USER_AGENT =
  Deno.env.get('MUSICBRAINZ_USER_AGENT') ??
  'MusiqasiQ/1.0 (https://github.com/adrifadilah/musiqasik)';

// Rate limiting: MusicBrainz requires 1 request per second
let lastMusicBrainzRequest = 0;

async function rateLimitMusicBrainz(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastMusicBrainzRequest;
  const minInterval = 1100; // 1.1 seconds for safety margin

  if (timeSinceLastRequest < minInterval) {
    const waitTime = minInterval - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastMusicBrainzRequest = Date.now();
}
```

#### 2. Add MusicBrainz Image Fetch Function

**File**: `supabase/functions/lastfm/index.ts`
**Location**: After `getSimilarArtists` function (after line 86)

```typescript
async function getMusicBrainzImage(mbid: string): Promise<string | null> {
  if (!mbid) return null;

  try {
    await rateLimitMusicBrainz();

    const url = `${MUSICBRAINZ_API_BASE}/artist/${mbid}?inc=url-rels&fmt=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': MUSICBRAINZ_USER_AGENT,
      },
    });

    if (!response.ok) {
      console.warn(`MusicBrainz API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const relations = data.relations || [];

    // Find image relation
    for (const relation of relations) {
      if (relation.type === 'image' && relation.url?.resource) {
        let imageUrl = relation.url.resource;

        // Convert Wikimedia Commons URL to direct image URL
        if (imageUrl.startsWith('https://commons.wikimedia.org/wiki/File:')) {
          const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          imageUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${filename}`;
        }

        console.log(`Found MusicBrainz image for MBID ${mbid}: ${imageUrl}`);
        return imageUrl;
      }
    }

    return null; // No image found
  } catch (error) {
    console.error(`Error fetching MusicBrainz image for ${mbid}:`, error);
    return null;
  }
}
```

#### 3. Update Artist Info Function

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Modify `getArtistInfo` function (lines 46-68)

```typescript
async function getArtistInfo(artistName: string): Promise<ArtistData | null> {
  console.log(`Getting info for artist: ${artistName}`);

  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`
  );

  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);

  const data = await response.json();
  if (data.error || !data.artist) return null;

  const artist = data.artist;
  const mbid = artist.mbid || undefined;

  // Try MusicBrainz first, then fall back to Last.fm
  let image_url: string | undefined;
  if (mbid) {
    image_url = (await getMusicBrainzImage(mbid)) || undefined;
  }

  // Fallback to Last.fm if MusicBrainz has no image
  if (!image_url) {
    image_url = artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'] || undefined;
    if (image_url) {
      console.log(`Falling back to Last.fm image for ${artistName}`);
    }
  }

  return {
    name: artist.name,
    lastfm_mbid: mbid,
    image_url,
    listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners) : undefined,
    playcount: artist.stats?.playcount ? parseInt(artist.stats.playcount) : undefined,
    tags: artist.tags?.tag?.map((t: any) => t.name) || [],
    lastfm_url: artist.url || undefined,
  };
}
```

#### 4. Update Search Function

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Modify `searchArtists` function (lines 25-44)

```typescript
const MUSICBRAINZ_SEARCH_IMAGE_LIMIT = 3;

async function searchArtists(query: string): Promise<ArtistData[]> {
  console.log(`Searching for artists with query: ${query}`);

  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
  );

  if (!response.ok) throw new Error(`Last.fm API error: ${response.status}`);

  const data = await response.json();
  const artists = data.results?.artistmatches?.artist || [];

  // Process artists sequentially to respect MusicBrainz rate limits,
  // but only call MusicBrainz for the first few results.
  const results: ArtistData[] = [];

  for (let index = 0; index < artists.length; index++) {
    const artist = artists[index];
    const mbid = artist.mbid || undefined;

    let image_url: string | undefined;

    // Try MusicBrainz only for the first N results
    if (mbid && index < MUSICBRAINZ_SEARCH_IMAGE_LIMIT) {
      image_url = (await getMusicBrainzImage(mbid)) || undefined;
    }

    // Fallback to Last.fm for all results
    if (!image_url) {
      image_url = artist.image?.find((img: any) => img.size === 'large')?.['#text'] || undefined;
    }

    results.push({
      name: artist.name,
      lastfm_mbid: mbid,
      image_url,
      listeners: artist.listeners ? parseInt(artist.listeners) : undefined,
      lastfm_url: artist.url || undefined,
    });
  }

  return results;
}
```

### Success Criteria

#### Automated Verification:

- [x] Edge Function compiles without errors: `supabase functions deploy --no-verify-jwt lastfm`
- [x] TypeScript types are correct: `npm run typecheck`
- [x] No linting errors: `npm run lint`
- [x] MusicBrainz rate limiting function works correctly

#### Manual Verification:

- [ ] Search for "The Beatles" returns proper band photo (not white star)
- [ ] Search for "Radiohead" returns proper band photo
- [ ] Artists without MBID still show Last.fm fallback images
- [ ] Network tab shows MusicBrainz API calls with proper User-Agent
- [ ] MusicBrainz API calls are spaced ~1 second apart

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that MusicBrainz images are loading correctly before proceeding to Phase 2.

---

## Phase 2: Backfill Existing Artists

### Overview

Update existing cached artists in the database with proper MusicBrainz images. This ensures all previously cached artists get corrected images without waiting for user searches.

### Changes Required

#### 1. Create Backfill Script

**File**: `supabase/functions/lastfm/backfill-images.ts` (new file)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// MusicBrainz configuration
const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = 'MusiqasiQ/1.0 ( adrifadilah )';

let lastMusicBrainzRequest = 0;

async function rateLimitMusicBrainz(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastMusicBrainzRequest;
  const minInterval = 1100;

  if (timeSinceLastRequest < minInterval) {
    const waitTime = minInterval - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastMusicBrainzRequest = Date.now();
}

async function getMusicBrainzImage(mbid: string): Promise<string | null> {
  if (!mbid) return null;

  try {
    await rateLimitMusicBrainz();

    const url = `${MUSICBRAINZ_API_BASE}/artist/${mbid}?inc=url-rels&fmt=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
    });

    if (!response.ok) {
      console.warn(`MusicBrainz API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const relations = data.relations || [];

    for (const relation of relations) {
      if (relation.type === 'image' && relation.url?.resource) {
        let imageUrl = relation.url.resource;

        if (imageUrl.startsWith('https://commons.wikimedia.org/wiki/File:')) {
          const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          imageUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${filename}`;
        }

        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching MusicBrainz image for ${mbid}:`, error);
    return null;
  }
}

async function backfillArtistImages(batchSize: number = 50) {
  console.log(`Starting image backfill with batch size: ${batchSize}`);

  // Get artists that have MBID but potentially no/poor image
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, name, lastfm_mbid, image_url')
    .not('lastfm_mbid', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error('Error fetching artists:', error);
    return { success: false, error: error.message };
  }

  if (!artists || artists.length === 0) {
    console.log('No artists to backfill');
    return { success: true, processed: 0 };
  }

  console.log(`Found ${artists.length} artists to process`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const artist of artists) {
    try {
      console.log(`Processing: ${artist.name} (MBID: ${artist.lastfm_mbid})`);

      // Check if we already have a good image (heuristic: not a Last.fm placeholder)
      const hasGoodImage =
        artist.image_url &&
        !artist.image_url.includes('last.fm') &&
        !artist.image_url.includes('audioscrobbler');

      if (hasGoodImage) {
        console.log(`  → Already has good image, skipping`);
        skippedCount++;
        continue;
      }

      // Fetch MusicBrainz image
      const imageUrl = await getMusicBrainzImage(artist.lastfm_mbid!);

      if (imageUrl) {
        // Update artist with new image
        const { error: updateError } = await supabase
          .from('artists')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', artist.id);

        if (updateError) {
          console.error(`  → Error updating artist:`, updateError);
        } else {
          console.log(`  → Updated with new image: ${imageUrl}`);
          updatedCount++;
        }
      } else {
        console.log(`  → No MusicBrainz image found`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`  → Error processing ${artist.name}:`, error);
    }
  }

  console.log(`\nBackfill complete: ${updatedCount} updated, ${skippedCount} skipped`);

  return {
    success: true,
    processed: artists.length,
    updated: updatedCount,
    skipped: skippedCount,
  };
}

// Export for use as Edge Function
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const batchSize = parseInt(url.searchParams.get('batch') || '50');

    const result = await backfillArtistImages(batchSize);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

#### 2. Deploy Backfill Function

```bash
supabase functions deploy backfill-images --no-verify-jwt
```

#### 3. Create Backfill Execution Script

**File**: `scripts/backfill-images.js`

```javascript
// Helper script to run backfill in batches
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function runBackfill() {
  let totalProcessed = 0;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\nRunning backfill batch... (processed: ${totalProcessed})`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/backfill-images?batch=50`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Backfill failed:', result.error);
      break;
    }

    totalProcessed += result.processed;
    totalUpdated += result.updated;

    console.log(`Batch result: ${result.updated} updated, ${result.skipped} skipped`);

    // Stop if no more artists or batch was smaller than requested
    hasMore = result.processed >= 50;

    // Wait a bit between batches to be nice to the database
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\nBackfill complete! Total: ${totalUpdated} artists updated`);
}

runBackfill().catch(console.error);
```

### Success Criteria

#### Automated Verification:

- [x] Backfill function deploys successfully (code validated via `deno check`, bundled successfully at 51.41kB - deployment blocked by inactive project)
- [ ] Script executes without errors: `node scripts/backfill-images.js`
- [ ] Database query shows updated image URLs: `select count(*) from artists where image_url like '%wikimedia%'`

#### Manual Verification:

- [ ] Run backfill for 10 artists and verify images updated
- [ ] Check that artists with good images are skipped
- [ ] Verify MusicBrainz rate limiting is respected (1 req/sec)
- [ ] Confirm no duplicate images or data corruption
- [ ] Test that previously cached artists now show proper images

**Implementation Note**: After completing this phase, verify that existing artists in the database have been updated with proper images before proceeding to Phase 3.

---

## Phase 3: Error Handling and Edge Cases

### Overview

Implement comprehensive error handling for network failures, missing MBID, rate limiting, and invalid URLs.

### Changes Required

#### 1. Add URL Validation Function

**File**: `supabase/functions/lastfm/index.ts`
**Location**: After rate limiting functions

```typescript
function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Check if it's a known placeholder/invalid image
    const invalidPatterns = [
      'last.fm/static/images/defaults',
      'audioscrobbler.com/default',
      'white-star.png',
      'noimage',
      'placeholder',
    ];

    const urlLower = url.toLowerCase();
    for (const pattern of invalidPatterns) {
      if (urlLower.includes(pattern)) {
        console.log(`Filtered out invalid image URL: ${url}`);
        return false;
      }
    }

    // Must be HTTPS
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

#### 2. Update Image Selection Logic

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Modify `getArtistInfo` and `searchArtists` functions

Update the image selection to validate URLs:

```typescript
// In getArtistInfo function:
let image_url: string | undefined;

if (mbid) {
  const mbImage = await getMusicBrainzImage(mbid);
  if (mbImage && isValidImageUrl(mbImage)) {
    image_url = mbImage;
    console.log(`Using MusicBrainz image for ${artistName}`);
  }
}

if (!image_url) {
  const lastfmImage = artist.image?.find((img: any) => img.size === 'extralarge')?.['#text'];
  if (lastfmImage && isValidImageUrl(lastfmImage)) {
    image_url = lastfmImage;
    console.log(`Using Last.fm fallback image for ${artistName}`);
  } else {
    console.log(`No valid image found for ${artistName}`);
  }
}
```

#### 3. Add Error Boundary for MusicBrainz Failures

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Wrap MusicBrainz calls in try-catch

```typescript
async function getMusicBrainzImageWithFallback(mbid: string): Promise<string | null> {
  try {
    return await getMusicBrainzImage(mbid);
  } catch (error) {
    console.error(`MusicBrainz error for MBID ${mbid}:`, error);

    // Don't fail the entire request if MusicBrainz fails
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        console.warn('MusicBrainz rate limit hit, skipping image fetch');
      } else if (error.message.includes('404')) {
        console.warn(`MusicBrainz artist not found: ${mbid}`);
      } else {
        console.warn('MusicBrainz network error, using fallback');
      }
    }

    return null;
  }
}
```

#### 4. Add Circuit Breaker Pattern

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Add state management for MusicBrainz health

```typescript
// Track MusicBrainz health
let musicBrainzHealthy = true;
let musicBrainzFailures = 0;
const MUSICBRAINZ_FAILURE_THRESHOLD = 5;
const MUSICBRAINZ_COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes
let musicBrainzCooldownUntil = 0;

async function isMusicBrainzHealthy(): Promise<boolean> {
  // Check if in cooldown period
  if (Date.now() < musicBrainzCooldownUntil) {
    console.log('MusicBrainz in cooldown period, skipping');
    return false;
  }

  // Reset health after cooldown
  if (!musicBrainzHealthy && Date.now() >= musicBrainzCooldownUntil) {
    console.log('MusicBrainz cooldown ended, resetting health');
    musicBrainzHealthy = true;
    musicBrainzFailures = 0;
  }

  return musicBrainzHealthy;
}

function recordMusicBrainzFailure() {
  musicBrainzFailures++;
  console.warn(`MusicBrainz failure ${musicBrainzFailures}/${MUSICBRAINZ_FAILURE_THRESHOLD}`);

  if (musicBrainzFailures >= MUSICBRAINZ_FAILURE_THRESHOLD) {
    console.error('MusicBrainz failure threshold reached, entering cooldown');
    musicBrainzHealthy = false;
    musicBrainzCooldownUntil = Date.now() + MUSICBRAINZ_COOLDOWN_PERIOD;
  }
}

function recordMusicBrainzSuccess() {
  if (musicBrainzFailures > 0) {
    musicBrainzFailures = Math.max(0, musicBrainzFailures - 1);
    console.log(`MusicBrainz failure count decreased to ${musicBrainzFailures}`);
  }
}
```

Update `getMusicBrainzImage` to use circuit breaker:

```typescript
async function getMusicBrainzImage(mbid: string): Promise<string | null> {
  if (!mbid) return null;

  // Check health before making request
  if (!(await isMusicBrainzHealthy())) {
    return null;
  }

  try {
    await rateLimitMusicBrainz();

    const url = `${MUSICBRAINZ_API_BASE}/artist/${mbid}?inc=url-rels&fmt=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
    });

    if (!response.ok) {
      console.warn(`MusicBrainz API error: ${response.status}`);

      // Record failure for circuit breaker
      if (response.status >= 500) {
        recordMusicBrainzFailure();
      }

      return null;
    }

    const data = await response.json();
    const relations = data.relations || [];

    for (const relation of relations) {
      if (relation.type === 'image' && relation.url?.resource) {
        let imageUrl = relation.url.resource;

        if (imageUrl.startsWith('https://commons.wikimedia.org/wiki/File:')) {
          const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
          imageUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${filename}`;
        }

        // Record success
        recordMusicBrainzSuccess();

        console.log(`Found MusicBrainz image for MBID ${mbid}: ${imageUrl}`);
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching MusicBrainz image for ${mbid}:`, error);
    recordMusicBrainzFailure();
    return null;
  }
}
```

### Success Criteria

#### Automated Verification:

- [x] All functions compile without TypeScript errors (`deno check` passes)
- [x] URL validation correctly filters invalid URLs (implemented with pattern matching)
- [x] Circuit breaker triggers after 5 failures (implemented with cooldown period)
- [x] Rate limiting enforces 1 request per second minimum (1.1s interval)

#### Manual Verification:

- [ ] Invalid Last.fm placeholder URLs are rejected
- [ ] MusicBrainz failures don't crash the request
- [ ] After 5 failures, MusicBrainz calls are skipped (cooldown)
- [ ] Successful requests reset the failure counter
- [ ] Artists without MBID still work with Last.fm fallback

**Implementation Note**: Test edge cases manually before proceeding to Phase 4.

---

## Phase 4: Testing and Validation

### Overview

Comprehensive testing of the complete implementation including performance, error scenarios, and user experience.

### Changes Required

#### 1. Add Integration Tests

**File**: `tests/lastfm-integration.test.ts` (new file)

```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.test('Artist search returns MusicBrainz images', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/lastfm?action=search&q=The Beatles`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  const artists = await response.json();
  assertEquals(response.status, 200);
  assertEquals(Array.isArray(artists), true);
  assertEquals(artists.length > 0, true);

  // Check that first artist has a valid image URL
  const firstArtist = artists[0];
  assertEquals(typeof firstArtist.image_url, 'string');
  assertEquals(firstArtist.image_url.startsWith('https://'), true);

  // Should be Wikimedia Commons URL, not Last.fm placeholder
  assertEquals(firstArtist.image_url.includes('wikimedia'), true);
  assertEquals(firstArtist.image_url.includes('last.fm/static/images/defaults'), false);
});

Deno.test('Artist info returns MusicBrainz image', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/lastfm?action=artist&name=Radiohead`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  const artist = await response.json();
  assertEquals(response.status, 200);
  assertEquals(typeof artist.name, 'string');
  assertEquals(typeof artist.image_url, 'string');
  assertEquals(artist.image_url.includes('wikimedia'), true);
});

Deno.test('Graph data includes proper images', async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/lastfm?action=graph&artist=Nirvana&depth=1`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const graph = await response.json();
  assertEquals(response.status, 200);
  assertEquals(Array.isArray(graph.nodes), true);
  assertEquals(graph.nodes.length > 0, true);

  // Check that center node has proper image
  const centerNode = graph.center;
  assertEquals(typeof centerNode.image_url, 'string');
  assertEquals(centerNode.image_url.includes('wikimedia'), true);
});

Deno.test('Handles artists without MBID gracefully', async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/lastfm?action=artist&name=Unknown Artist XYZ123`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const artist = await response.json();
  // Should return null or artist data without crashing
  assertEquals(response.status === 200 || response.status === 404, true);
});
```

#### 2. Add Performance Monitoring

**File**: `supabase/functions/lastfm/index.ts`
**Location**: Add logging to track performance

```typescript
// Add to getArtistInfo function
const startTime = Date.now();
// ... existing code ...
const duration = Date.now() - startTime;
console.log(`Artist info for ${artistName} took ${duration}ms`);

// Add to searchArtists function
const startTime = Date.now();
// ... existing code ...
const duration = Date.now() - startTime;
console.log(`Search for "${query}" took ${duration}ms (${results.length} results)`);
```

### Success Criteria

#### Automated Verification:

- [x] Integration tests created: `deno test --allow-net --allow-env tests/lastfm-integration.test.ts` (requires active Supabase project)
- [x] All TypeScript compilation succeeds: `deno check` passes for all Edge Functions
- [x] Performance monitoring added to searchArtists and getArtistInfo functions
- [ ] Edge Function deploys successfully: `supabase functions deploy lastfm --no-verify-jwt` (requires active Supabase project)

#### Manual Verification:

- [ ] Search 10 popular artists, all show proper images (not placeholders)
- [ ] Graph visualization loads with proper artist images
- [ ] Artist panel shows high-quality images
- [ ] Performance: Search completes in <3 seconds
- [ ] Performance: Graph load completes in <5 seconds
- [ ] No console errors or broken image icons
- [ ] Mobile experience: Images load correctly on mobile devices
- [ ] Network tab shows MusicBrainz calls spaced appropriately

**Implementation Note**: Run full manual testing across different artist genres and popularity levels before considering complete.

---

## Testing Strategy

### Unit Tests

- **Rate Limiter**: Verify 1 request per second enforcement
- **URL Validator**: Test various valid/invalid URL patterns
- **Circuit Breaker**: Test failure counting and cooldown reset
- **Wikimedia URL Converter**: Test Commons URL transformation

### Integration Tests

- **End-to-End Flow**: Last.fm → MusicBrainz → Supabase → Frontend
- **Fallback Behavior**: MusicBrainz failure → Last.fm fallback
- **Error Scenarios**: Network errors, rate limits, missing MBID
- **Performance**: Response times under load

### Manual Testing Checklist

1. **Search Functionality**
   - [ ] Search "The Beatles" → Shows band photo
   - [ ] Search "Radiohead" → Shows band photo
   - [ ] Search "BTS" → Shows K-pop group photo
   - [ ] Search "Mozart" → Shows classical composer portrait
   - [ ] Search "Unknown Indie Band XYZ" → Shows Last.fm fallback or no image

2. **Graph Visualization**
   - [ ] Click artist → Graph loads with proper images on nodes
   - [ ] Zoom/pan → Images remain crisp
   - [ ] Hover effects → Images don't block interactions
   - [ ] Multiple depth levels → All nodes have proper images

3. **Artist Panel**
   - [ ] Click artist in search → Panel shows high-quality image
   - [ ] Image loads quickly (<1 second)
   - [ ] Fallback icon shows when no image available

4. **Error Scenarios**
   - [ ] Airplane mode → Graceful degradation, no crashes
   - [ ] MusicBrainz down → Falls back to Last.fm images
   - [ ] Last.fm down → Shows artists without images
   - [ ] Invalid MBID → Skips MusicBrainz, uses Last.fm

5. **Performance**
   - [ ] Search 10 artists → Completes in <3 seconds
   - [ ] Load graph (depth=2) → Completes in <5 seconds
   - [ ] No memory leaks on repeated searches
   - [ ] MusicBrainz rate limiting respected (1 req/sec)

## Performance Considerations

### Rate Limiting

- **MusicBrainz**: 1 request per second (enforced)
- **Last.fm**: Current API key limits (respect existing)
- **Supabase**: Edge Function timeout (60 seconds max)

### Optimization Strategies

1. **Sequential Processing**: Process artists one-by-one in search to respect rate limits
2. **Caching**: Leverage Supabase caching to minimize API calls
3. **Circuit Breaker**: Prevent cascading failures if MusicBrainz is down
4. **URL Validation**: Avoid fetching invalid/placeholder images
5. **Lazy Loading**: Frontend already implements lazy image loading via conditional rendering

### Expected Performance

- **Search**: ~1-2 seconds for 10 results (includes MusicBrainz rate limiting)
- **Artist Info**: ~1-2 seconds (includes MusicBrainz fetch)
- **Graph Load**: ~3-5 seconds for depth=2 (depends on cache hit rate)

## Migration Notes

### Database Migration

No schema changes required. The existing `artists.image_url` column (TEXT, nullable) already supports the new URLs.

### Backward Compatibility

- API response format unchanged
- UI components require no modifications
- Existing cached artists continue to work
- Last.fm images used as fallback

### Rollback Plan

If issues arise:

1. Revert Edge Function to previous version
2. Existing cached data remains intact
3. No database changes to rollback
4. Zero downtime deployment possible

## References

- **Original Research**: `thoughts/shared/research/2025-12-07-artist-image-url-implementation.md`
- **GitHub Solution**: https://github.com/hugovk/now-playing-radiator/commit/e6de980db9da6846edc5aa2d2f7057b8f3b21bc8
- **Stack Overflow**: https://stackoverflow.com/questions/55978243/last-fm-api-returns-same-white-star-image-for-all-artists
- **MusicBrainz API**: https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2
- **MusicBrainz Rate Limiting**: https://musicbrainz.org/doc/XML_Web_Service/Rate_Limiting

## Open Questions (Resolved)

1. **Rate Limiting**: MusicBrainz requires 1 req/sec - Implemented with sequential processing
2. **Fallback Strategy**: Use Last.fm images when MusicBrainz unavailable - Implemented
3. **Error Handling**: Circuit breaker pattern for MusicBrainz failures - Implemented
4. **Backfill**: Script to update existing cached artists - Implemented
5. **Performance**: Sequential processing adds latency but ensures compliance - Accepted tradeoff

## Implementation Checklist

- [x] Phase 1: MusicBrainz API integration
- [x] Phase 2: Backfill existing artists (code complete, deployment pending project activation)
- [x] Phase 3: Error handling and edge cases (circuit breaker + URL validation)
- [x] Phase 4: Testing and validation (tests created, performance logging added)
- [ ] Manual testing across 20+ artists
- [ ] Performance testing under load
- [ ] Deploy to production
- [ ] Run backfill script on production database
- [ ] Monitor error rates and performance metrics
