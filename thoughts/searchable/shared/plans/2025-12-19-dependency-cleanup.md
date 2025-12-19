# Dependency Cleanup Implementation Plan

## Overview

Remove unused dependencies, consolidate duplicate code, and clean up dead code to reduce bundle size and cognitive load. This is a quick-win phase that can be completed in 1-2 days with minimal risk.

## Current State Analysis

### Unused Dependencies (~2.2MB bloat)
- `@tanstack/react-query` - Set up but no `useQuery` hooks used
- `@tanstack/react-router` - Not imported anywhere
- `@tanstack/react-start` - Not imported anywhere  
- `zod` - Not imported anywhere
- `date-fns` - Not imported anywhere
- `react-hook-form` - Only in unused `form.tsx` component
- `@hookform/resolvers` - Only used with react-hook-form
- `recharts` - Only in unused `chart.tsx` component
- `cmdk` - Only in unused `command.tsx` component
- `vaul` - Only in unused `drawer.tsx` component
- `embla-carousel-react` - Only in unused `carousel.tsx` component
- `react-day-picker` - Only in unused `calendar.tsx` component
- `input-otp` - Only in unused `input-otp.tsx` component
- `react-resizable-panels` - Only in unused `resizable.tsx` component
- `puppeteer` - Only in excluded integration test

### Duplicate Code
- Two `Artist` interfaces: `src/types/artist.ts` and `src/integrations/surrealdb/types.ts`
- Two toast systems: Radix `Toaster` and `Sonner` both in `App.tsx`
- `formatNumber` duplicated in `ArtistPanel.tsx`, `ArtistSearch.tsx`, `ForceGraph.tsx`
- `isPlaceholderImage` duplicated in `services/lastfm.ts`, `workers/api/index.ts`, `ForceGraph.tsx`

## Desired End State

- Package.json has only actively used dependencies
- Single source of truth for Artist type
- Single toast system (Radix)
- Shared utility functions in `src/lib/utils.ts`
- All tests pass, app builds successfully

## What We're NOT Doing

- Removing shadcn/ui components (planned for future features)
- Removing Effect or SurrealDB (needed for Phase 2)
- Changing any application logic
- Modifying Workers API (will be deleted in Phase 2)

## Implementation Approach

Make incremental, safe deletions with verification at each step.

---

## Phase 1: Remove Unused npm Dependencies

### Overview
Remove packages that are never imported in the codebase.

### Changes Required:

#### 1. Update package.json

**File**: `package.json`
**Changes**: Remove unused dependencies

Remove from `dependencies`:
```json
"@hookform/resolvers": "^3.10.0",
"@tanstack/react-query": "^5.83.0",
"@tanstack/react-router": "^1.140.0",
"@tanstack/react-start": "^1.140.0",
"cmdk": "^1.1.1",
"date-fns": "^3.6.0",
"embla-carousel-react": "^8.6.0",
"input-otp": "^1.4.2",
"react-day-picker": "^8.10.1",
"react-hook-form": "^7.61.1",
"react-resizable-panels": "^2.1.9",
"recharts": "^2.15.4",
"vaul": "^0.9.9",
"zod": "^3.25.76"
```

Remove from `devDependencies`:
```json
"puppeteer": "^24.33.1"
```

#### 2. Update App.tsx - Remove React Query

**File**: `src/App.tsx`
**Changes**: Remove QueryClientProvider wrapper

```tsx
// Before
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    ...
  </QueryClientProvider>
);

// After
const App = () => (
  <TooltipProvider>
    ...
  </TooltipProvider>
);
```

#### 3. Delete unused shadcn/ui components that depend on removed packages

**Files to delete**:
- `src/components/ui/calendar.tsx` (uses react-day-picker)
- `src/components/ui/carousel.tsx` (uses embla-carousel-react)
- `src/components/ui/chart.tsx` (uses recharts)
- `src/components/ui/command.tsx` (uses cmdk)
- `src/components/ui/drawer.tsx` (uses vaul)
- `src/components/ui/form.tsx` (uses react-hook-form)
- `src/components/ui/input-otp.tsx` (uses input-otp)
- `src/components/ui/resizable.tsx` (uses react-resizable-panels)

#### 4. Delete excluded integration test

**File to delete**: `src/test/integration.test.ts`

This file uses puppeteer, is excluded from vitest, and has silent failure patterns that hide real errors.

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run typecheck` passes

#### Manual Verification:
- [ ] App loads at http://localhost:8080
- [ ] Search for artist works
- [ ] Graph visualization displays correctly
- [ ] Toast notifications appear on errors

---

## Phase 2: Consolidate Toast Systems

### Overview
Remove Sonner toast, keep only Radix toast which is already used by the app.

### Changes Required:

#### 1. Update App.tsx

**File**: `src/App.tsx`
**Changes**: Remove Sonner import and component

```tsx
// Before
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

// In JSX:
<Toaster />
<Sonner />

// After
import { Toaster } from '@/components/ui/toaster';

// In JSX:
<Toaster />
```

#### 2. Delete sonner component

**File to delete**: `src/components/ui/sonner.tsx`

#### 3. Remove sonner from package.json

**File**: `package.json`
**Changes**: Remove from dependencies

```json
"sonner": "^1.7.4",
```

Also remove `next-themes` if only used by sonner:
```json
"next-themes": "^0.3.0",
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes

#### Manual Verification:
- [ ] Error toasts still appear in MapView when API fails

---

## Phase 3: Consolidate Type Definitions

### Overview
Delete duplicate Artist type in surrealdb/types.ts, use src/types/artist.ts everywhere.

### Changes Required:

#### 1. Update imports in services

**File**: `src/services/lastfm.ts`
**Changes**: Update import path

```typescript
// Before
import type { Artist } from '@/integrations/surrealdb/types';

// After
import type { Artist } from '@/types/artist';
```

**File**: `src/services/database.ts`
**Changes**: Update import path

```typescript
// Before
import type { Artist, GraphData } from '@/integrations/surrealdb/types';

// After
import type { Artist, GraphData } from '@/types/artist';
```

**File**: `src/services/index.ts`
**Changes**: Update import path

```typescript
// Before
import type { Artist, GraphData } from '@/integrations/surrealdb/types';

// After
import type { Artist, GraphData } from '@/types/artist';
```

**File**: `workers/api/index.ts`
**Changes**: Update import path

```typescript
// Before
import type { Artist, GraphData } from '../../src/integrations/surrealdb/types';

// After
import type { Artist, GraphData } from '../../src/types/artist';
```

#### 2. Delete duplicate types file

**File to delete**: `src/integrations/surrealdb/types.ts`

Note: Keep `src/types/artist.ts` as it has the more complete definitions including `| null` for optional properties.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes

#### Manual Verification:
- [ ] No runtime errors when loading graph

---

## Phase 4: Extract Shared Utilities

### Overview
Create shared utility functions for duplicated logic.

### Changes Required:

#### 1. Add formatNumber utility

**File**: `src/lib/utils.ts`
**Changes**: Add formatNumber function

```typescript
// Add after existing cn function

/**
 * Formats a number with K/M suffix for display
 * @param num - The number to format
 * @param suffix - Optional suffix like "listeners"
 * @returns Formatted string like "1.5M listeners" or "N/A"
 */
export function formatNumber(num?: number | null, suffix?: string): string {
  if (num === undefined || num === null) return 'N/A';
  
  let value: string;
  if (num >= 1_000_000) {
    value = `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    value = `${Math.round(num / 1_000)}K`;
  } else {
    value = num.toString();
  }
  
  return suffix ? `${value} ${suffix}` : value;
}

/**
 * Checks if an image URL is a Last.fm placeholder
 * @param url - The image URL to check
 * @returns true if the URL is a placeholder or empty
 */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) return true;
  return (
    url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
    url.includes('star') ||
    url === '' ||
    url.endsWith('/noimage/')
  );
}
```

#### 2. Update ArtistPanel to use shared utility

**File**: `src/components/ArtistPanel.tsx`
**Changes**: Replace local formatNumber with import

```typescript
// Before (lines 36-45)
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return num.toString();
};

// After
import { formatNumber } from '@/lib/utils';

// Update usage (around line 65):
// Before: {formatNumber(artist.listeners)} listeners
// After: {formatNumber(artist.listeners, 'listeners')}
```

#### 3. Update ArtistSearch to use shared utility

**File**: `src/components/ArtistSearch.tsx`
**Changes**: Replace local formatListeners with import

```typescript
// Before (lines 85-94)
const formatListeners = (listeners: number | undefined | null) => {
  if (!listeners) return '';
  if (listeners >= 1000000) {
    return `${(listeners / 1000000).toFixed(1)}M listeners`;
  }
  if (listeners >= 1000) {
    return `${Math.round(listeners / 1000)}K listeners`;
  }
  return `${listeners} listeners`;
};

// After
import { formatNumber } from '@/lib/utils';

// Update usage: formatNumber(artist.listeners, 'listeners')
```

#### 4. Update ForceGraph to use shared utility

**File**: `src/components/ForceGraph.tsx`
**Changes**: Use isPlaceholderImage and formatNumber from utils

```typescript
import { cn, formatNumber, isPlaceholderImage } from '@/lib/utils';

// Replace inline placeholder check (lines 184-188):
// Before:
const isPlaceholder =
  !d.image_url ||
  d.image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
  d.image_url.includes('star') ||
  d.image_url === '';

// After:
const isPlaceholder = isPlaceholderImage(d.image_url);

// Replace inline number formatting (line 248):
// Before:
${d.listeners ? `<div class="text-sm text-muted-foreground">${(d.listeners / 1000000).toFixed(1)}M listeners</div>` : ''}

// After:
${d.listeners ? `<div class="text-sm text-muted-foreground">${formatNumber(d.listeners, 'listeners')}</div>` : ''}
```

#### 5. Update services to use shared utility

**File**: `src/services/lastfm.ts`
**Changes**: Import from utils instead of local function

```typescript
// Before (lines 40-48)
const isPlaceholderImage = (url?: string): boolean => {
  if (!url) return true;
  return (
    url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
    url.includes('star') ||
    url === '' ||
    url.endsWith('/noimage/')
  );
};

// After
import { isPlaceholderImage } from '@/lib/utils';
// Delete local function
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Listener counts display correctly in search results
- [ ] Listener counts display correctly in ArtistPanel
- [ ] Tooltip shows formatted listener count
- [ ] Artist images display (non-placeholder)
- [ ] Placeholder images are handled (no broken images)

---

## Phase 5: Add Tests for New Utilities

### Overview
Add unit tests for the new shared utility functions.

### Changes Required:

#### 1. Update utils.test.ts

**File**: `src/lib/utils.test.ts`
**Changes**: Add tests for formatNumber and isPlaceholderImage

```typescript
import { describe, it, expect } from 'vitest';
import { cn, formatNumber, isPlaceholderImage } from './utils';

// ... existing cn tests ...

describe('formatNumber', () => {
  it('formats millions with M suffix', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10.0M');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1500)).toBe('2K');
    expect(formatNumber(999000)).toBe('999K');
  });

  it('returns raw number for small values', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(0)).toBe('0');
  });

  it('returns N/A for null or undefined', () => {
    expect(formatNumber(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
  });

  it('appends suffix when provided', () => {
    expect(formatNumber(1500000, 'listeners')).toBe('1.5M listeners');
    expect(formatNumber(null, 'listeners')).toBe('N/A');
  });
});

describe('isPlaceholderImage', () => {
  it('returns true for null or undefined', () => {
    expect(isPlaceholderImage(null)).toBe(true);
    expect(isPlaceholderImage(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isPlaceholderImage('')).toBe(true);
  });

  it('returns true for Last.fm placeholder hash', () => {
    expect(isPlaceholderImage('https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png')).toBe(true);
  });

  it('returns true for star placeholder', () => {
    expect(isPlaceholderImage('https://example.com/star.png')).toBe(true);
  });

  it('returns true for noimage path', () => {
    expect(isPlaceholderImage('https://example.com/noimage/')).toBe(true);
  });

  it('returns false for valid image URLs', () => {
    expect(isPlaceholderImage('https://example.com/artist.jpg')).toBe(false);
    expect(isPlaceholderImage('https://i.scdn.co/image/abc123')).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test` passes with new tests
- [ ] `npm run test:coverage` shows utils.ts at 100%

#### Manual Verification:
- [ ] None required for unit tests

---

## Testing Strategy

All changes in this plan are deletions or refactors with no new features:
- Unit tests verify utility functions work correctly
- Build verification ensures no broken imports
- Manual smoke test confirms app still functions

## Rollback Strategy

If any phase fails:
1. Revert the specific file changes
2. Run `npm install` to restore dependencies
3. Verify with `npm run build && npm run test`

## References

- Research document: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md`
- Package analysis in research document lines 349-381
- Duplicate code analysis in research document lines 110-170
