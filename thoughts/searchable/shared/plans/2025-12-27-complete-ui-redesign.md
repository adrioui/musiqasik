# Complete UI Redesign Implementation Plan

## Overview

Complete UI overhaul integrating 8 HTML mockup states into MusiqasiQ. This includes migrating from Lucide to Material Symbols icons, implementing full-screen graph layout with floating glassmorphism panels, adding node/edge animations, and integrating Last.fm OAuth authentication.

## Current State Analysis

### What's Already Done
- ✅ CSS variables already use cyan-blue palette (`#13b6ec`) - `src/index.css:16`
- ✅ Inter font already imported - `index.html:9`
- ✅ Glassmorphism utilities exist (`glass-panel`, `node-glow`) - `src/index.css:114-134`
- ✅ Animation keyframes exist (`float`, `bubble-in`, `slide-in-right`) - `src/index.css:136-165`
- ✅ Tailwind configured with custom colors and animations

### What Needs to Change
- Fixed sidebar layout (`w-80`) → slide-in Sheet panel
- Lucide React icons → Material Symbols (23 icons across 8 files)
- Header design → floating nav with glassmorphism
- GraphControls → LensesTray component
- ArtistPanel → ArtistDetailSheet (Radix Sheet)
- Add Last.fm OAuth flow ("Connect Last.fm" button)
- Add EdgeCard for edge click interaction
- Add ShareModal for graph sharing
- Node rendering → larger nodes with rings/glows, floating labels

### Key Discoveries
- `src/pages/MapView.tsx:78-154` - Current layout with fixed sidebar
- `src/components/ForceGraph/index.tsx:222-268` - Node rendering logic
- `src/components/GraphControls.tsx` - Will be replaced by LensesTray
- `src/components/ArtistPanel.tsx` - Will be replaced by ArtistDetailSheet
- 23 Lucide icons used across 8 files need migration

## Desired End State

After implementation:
1. **Visual Design**: Material Symbols icons, glassmorphism panels, floating overlays
2. **Layout**: Full-screen graph with floating nav (top-left), lenses tray (bottom-left), slide-in artist sheet (right)
3. **Graph**: Nodes with rings/glows (32px center, 20-30px satellites), floating labels with backdrop, bubble-in animations
4. **Features**: Last.fm OAuth connection, share modal with URL copy, edge click interaction
5. **All 8 mockup states reproducible**: Landing, Node Interaction (3 variants), Edge Explanation (3 variants), Filters/Lenses Tray

### Verification
- All 8 mockup UI states can be reproduced
- Graph renders at 60fps with 100+ nodes
- Material Symbols icons render correctly in all browsers
- Last.fm OAuth successfully authenticates users
- Share URL correctly restores graph state
- Dark/light theme toggle works with new design

## What We're NOT Doing

- Music player bar (explicitly excluded per user request)
- PixiJS migration (SVG performance acceptable for MVP)
- Mobile responsive layout (desktop-first, responsive later)
- Backend short URLs for sharing (simple URL copy only)
- Renaming app (keeping "MusiqasiQ")
- Weekly Discovery feature (future enhancement)
- Bridge Artists feature (future enhancement)

## Implementation Approach

**7 Phases** building on each other:
0. **Effect Backend Server** - Node.js server using Effect for Last.fm OAuth
1. **Icon Migration** - Replace Lucide with Material Symbols
2. **Component Library** - Install Sheet/Dialog, create base components
3. **Layout Restructure** - Full-screen graph with overlays
4. **Graph Visualization** - Node/edge styling and animations
5. **Last.fm OAuth** - Authentication flow (uses backend from Phase 0)
6. **Share Feature** - Modal and URL state

---

## Phase 0: Effect Backend Server

### Overview
Create a Node.js backend server using Effect's `@effect/platform` HTTP utilities. This server handles Last.fm OAuth session token exchange, which requires server-side secret handling (MD5 signature with shared secret cannot be exposed in frontend).

### Why Needed
- Last.fm `auth.getSession` API requires MD5 signature using shared secret
- Shared secret cannot be exposed in frontend code
- Effect-based server maintains consistency with existing service architecture

### Changes Required

#### 1. Install Dependencies

**Command**: Run in terminal
```bash
bun add @effect/platform @effect/platform-node @effect/schema
```

#### 2. Create Server Directory Structure

**Commands**:
```bash
mkdir -p server/services
```

**Files to create**:
- `server/index.ts` - Server entry point
- `server/services/lastfm-auth.ts` - Last.fm OAuth service
- `server/config.ts` - Server configuration
- `server/routes.ts` - API routes

#### 3. Create Server Configuration

**File**: `server/config.ts` (new file)

```typescript
import { Context, Layer } from 'effect';

export class ServerConfig extends Context.Tag('ServerConfig')<
  ServerConfig,
  {
    readonly port: number;
    readonly lastFmApiKey: string;
    readonly lastFmSharedSecret: string;
  }
>() {}

export const ServerConfigLive = Layer.succeed(ServerConfig, {
  port: parseInt(process.env.PORT || '3001', 10),
  lastFmApiKey: process.env.VITE_LASTFM_API_KEY || '',
  lastFmSharedSecret: process.env.LASTFM_SHARED_SECRET || '',
});
```

#### 4. Create Last.fm Auth Service

**File**: `server/services/lastfm-auth.ts` (new file)

```typescript
import { Context, Effect, Layer, Data } from 'effect';
import * as crypto from 'crypto';
import { ServerConfig } from '../config';

// Error types
export class LastFmAuthError extends Data.TaggedError('LastFmAuthError')<{
  readonly message: string;
  readonly code?: number;
}> {}

// Service interface
export class LastFmAuthService extends Context.Tag('LastFmAuthService')<
  LastFmAuthService,
  {
    readonly getSession: (
      token: string
    ) => Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError>;
  }
>() {}

// Service implementation
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

const makeLastFmAuthService = Effect.gen(function* () {
  const config = yield* ServerConfig;

  const getSession = (
    token: string
  ): Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError> =>
    Effect.gen(function* () {
      const params: Record<string, string> = {
        method: 'auth.getSession',
        api_key: config.lastFmApiKey,
        token: token,
      };

      // Generate MD5 signature (sorted params + shared secret)
      const sortedKeys = Object.keys(params).sort();
      let signatureString = '';
      for (const key of sortedKeys) {
        signatureString += `${key}${params[key]}`;
      }
      signatureString += config.lastFmSharedSecret;
      const apiSig = crypto.createHash('md5').update(signatureString, 'utf8').digest('hex');

      // Build URL
      const url = new URL(LASTFM_API_URL);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
      url.searchParams.append('api_sig', apiSig);
      url.searchParams.append('format', 'json');

      // Fetch from Last.fm
      const response = yield* Effect.tryPromise({
        try: () => fetch(url.toString()),
        catch: (error) =>
          new LastFmAuthError({
            message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
          }),
      });

      if (!response.ok) {
        return yield* Effect.fail(
          new LastFmAuthError({ message: 'Last.fm API request failed', code: response.status })
        );
      }

      const data = yield* Effect.tryPromise({
        try: () => response.json() as Promise<{
          session?: { key: string; name: string };
          error?: number;
          message?: string;
        }>,
        catch: () => new LastFmAuthError({ message: 'Failed to parse response' }),
      });

      if (data.error || !data.session) {
        return yield* Effect.fail(
          new LastFmAuthError({
            message: data.message || 'Authentication failed',
            code: data.error,
          })
        );
      }

      return {
        sessionKey: data.session.key,
        username: data.session.name,
      };
    });

  return { getSession };
});

export const LastFmAuthServiceLive = Layer.effect(LastFmAuthService, makeLastFmAuthService);
```

#### 5. Create API Routes

**File**: `server/routes.ts` (new file)

```typescript
import { Effect, pipe } from 'effect';
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform';
import { LastFmAuthService, LastFmAuthError } from './services/lastfm-auth';

// POST /api/lastfm/session - Exchange token for session
const postSession = pipe(
  HttpServerRequest.HttpServerRequest,
  Effect.flatMap((request) =>
    Effect.gen(function* () {
      // Parse JSON body
      const body = yield* Effect.tryPromise({
        try: () => request.json as Promise<{ token?: string }>,
        catch: () => new LastFmAuthError({ message: 'Invalid request body' }),
      });

      if (!body.token) {
        return yield* Effect.succeed(
          HttpServerResponse.json({ error: 'No token provided' }, { status: 400 })
        );
      }

      const authService = yield* LastFmAuthService;
      const result = yield* authService.getSession(body.token);

      return HttpServerResponse.json(result);
    })
  ),
  Effect.catchTag('LastFmAuthError', (error) =>
    Effect.succeed(
      HttpServerResponse.json(
        { error: error.message },
        { status: error.code === 4 ? 401 : 500 }
      )
    )
  )
);

// Health check endpoint
const getHealth = Effect.succeed(
  HttpServerResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Build router
export const apiRouter = HttpRouter.empty.pipe(
  HttpRouter.get('/api/health', getHealth),
  HttpRouter.post('/api/lastfm/session', postSession)
);
```

#### 6. Create Server Entry Point

**File**: `server/index.ts` (new file)

```typescript
import { Effect, Layer, pipe } from 'effect';
import { NodeRuntime } from '@effect/platform-node';
import {
  HttpServer,
  HttpMiddleware,
} from '@effect/platform';
import { createServer } from 'node:http';
import { ServerConfig, ServerConfigLive } from './config';
import { LastFmAuthServiceLive } from './services/lastfm-auth';
import { apiRouter } from './routes';

// Compose all layers
const AppLive = pipe(
  LastFmAuthServiceLive,
  Layer.provideMerge(ServerConfigLive)
);

// Create HTTP server
const HttpLive = pipe(
  HttpServer.serve(
    pipe(
      apiRouter,
      HttpMiddleware.cors({ origin: '*' }), // Allow CORS for dev
      HttpMiddleware.logger
    )
  ),
  Layer.provide(AppLive)
);

// Main program
const main = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting server on port ${config.port}...`);
  
  // Create native HTTP server
  const server = createServer();
  
  // Bind Effect HTTP handler
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      server.listen(config.port, () => {
        console.log(`🚀 Server running at http://localhost:${config.port}`);
        console.log('   POST /api/lastfm/session - Exchange OAuth token');
        console.log('   GET  /api/health         - Health check');
      });
      return server;
    }),
    (server) => Effect.sync(() => server.close())
  );

  // Keep server running
  yield* Effect.never;
});

// Run with layers
const program = pipe(
  main,
  Effect.provide(Layer.mergeAll(ServerConfigLive, HttpLive))
);

NodeRuntime.runMain(program);
```

#### 7. Update package.json Scripts

**File**: `package.json`
**Changes**: Add server scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "dev:all": "concurrently \"bun run dev\" \"bun run dev:server\"",
    // ... other scripts
  }
}
```

**Command**: Install concurrently if not present
```bash
bun add -D concurrently tsx
```

#### 8. Configure Vite Proxy for Development

**File**: `vite.config.ts`
**Changes**: Add proxy configuration

```typescript
export default defineConfig({
  // ... existing config
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

#### 9. Update Environment Variables

**File**: `.env.example`
**Changes**: Add shared secret variable

```env
# ... existing variables

# Last.fm OAuth (server-side only, never expose to frontend)
LASTFM_SHARED_SECRET=your_shared_secret_here
```

#### 10. Create TypeScript Config for Server

**File**: `tsconfig.server.json` (new file)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist/server",
    "rootDir": "./server",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules"]
}
```

### Success Criteria

#### Automated Verification
- [x] Server compiles: `bun run tsc --project tsconfig.server.json`
- [x] Server starts: `bun run dev:server`
- [x] Health check works: `curl http://localhost:3001/api/health`
- [x] Main build still works: `bun run build`

#### Manual Verification
- [x] POST `/api/lastfm/session` with valid token returns session
- [x] POST `/api/lastfm/session` with invalid token returns 401
- [x] POST `/api/lastfm/session` without token returns 400
- [x] CORS headers present in responses
- [x] Vite proxy forwards `/api` requests correctly
- [x] `dev:all` starts both frontend and backend

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 1.

---

## Phase 1: Icon Migration (Lucide → Material Symbols)

### Overview
Replace all 23 Lucide React icons with Material Symbols. Add Google Material Symbols font, create wrapper component, update all icon usages.

### Changes Required

#### 1. Add Material Symbols Font

**File**: `index.html`
**Changes**: Add Material Symbols link after Inter font (line 9)

```html
<!-- Google Fonts - Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

#### 2. Create MaterialIcon Component

**File**: `src/components/ui/material-icon.tsx` (new file)

```tsx
import { cn } from '@/lib/utils';

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  filled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'text-[16px]',
  sm: 'text-[20px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
  xl: 'text-[48px]',
};

export function MaterialIcon({
  name,
  filled = false,
  size = 'md',
  className,
  ...props
}: MaterialIconProps) {
  return (
    <span
      className={cn(
        'material-symbols-outlined select-none',
        sizeClasses[size],
        className
      )}
      style={{
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
      {...props}
    >
      {name}
    </span>
  );
}
```

#### 3. Add Material Symbols Base Styles

**File**: `src/index.css`
**Changes**: Add after line 112 (after body styles)

```css
/* Material Symbols base configuration */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### 4. Icon Mapping Reference

| Lucide Icon | Material Symbol | Notes |
|-------------|-----------------|-------|
| ArrowLeft | arrow_back | |
| ChevronDown | expand_more | |
| ChevronUp | expand_less | |
| Clock | schedule | |
| Database | database | |
| Disc3 | album | |
| ExternalLink | open_in_new | |
| GitBranch | account_tree | |
| Layers | layers | |
| Loader2 | progress_activity | animated |
| Minus | remove | |
| Monitor | desktop_windows | |
| Moon | dark_mode | |
| Music2 | graphic_eq | hub for logo |
| Palette | palette | |
| Plus | add | |
| RotateCcw | refresh | |
| Search | search | |
| Sun | light_mode | |
| Tag | sell | |
| Users | group | |
| X | close | |
| Zap | bolt | |
| ZoomIn | zoom_in | |
| ZoomOut | zoom_out | |
| Home | home | new |
| Share2 | share | new |
| Settings | settings | new |
| Favorite | favorite | new |
| Play | play_arrow | new |
| Filter | tune | new |
| Info | info | new |
| Notifications | notifications | new |
| Person | person | new |
| Hub | hub | new - app logo |

#### 5. Update All Icon Usages

**Files to update** (8 files, ~50 icon instances):

**`src/pages/MapView.tsx`**:
```tsx
// Before
import { ArrowLeft, Music2 } from 'lucide-react';

// After
import { MaterialIcon } from '@/components/ui/material-icon';

// Replace <ArrowLeft className="h-5 w-5" /> with:
<MaterialIcon name="arrow_back" size="sm" />

// Replace <Music2 className="h-5 w-5" /> with:
<MaterialIcon name="hub" size="sm" />
```

**`src/pages/Index.tsx`**:
```tsx
// Replace Music2 with hub, GitBranch with account_tree, Zap with bolt, Database with database
```

**`src/components/ArtistSearch.tsx`**:
```tsx
// Replace Search with search, Loader2 with progress_activity, Music2 with graphic_eq, Clock with schedule
// For Loader2 animation, add: className="animate-spin"
```

**`src/components/ForceGraph/GraphLegend.tsx`**:
```tsx
// Replace ChevronDown with expand_more, ChevronUp with expand_less, Palette with palette
```

**`src/components/ThemeToggle.tsx`**:
```tsx
// Replace Moon with dark_mode, Sun with light_mode, Monitor with desktop_windows
```

**`src/components/ui/toast.tsx`**:
```tsx
// Replace X with close
```

**`src/components/GraphControls.tsx`**:
```tsx
// Replace all 7 icons: Minus→remove, Plus→add, RotateCcw→refresh, ZoomIn→zoom_in, ZoomOut→zoom_out, Layers→layers, Tag→sell
```

**`src/components/ArtistPanel.tsx`**:
```tsx
// Replace ExternalLink→open_in_new, Music2→graphic_eq, Users→group, Disc3→album, Tag→sell
```

#### 6. Remove Lucide Dependency

**Command**: Run after all icons are migrated
```bash
bun remove lucide-react
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`
- [x] No "lucide-react" imports remain: `grep -r "lucide-react" src/`

#### Manual Verification
- [x] All icons render correctly in light mode
- [x] All icons render correctly in dark mode
- [x] Loading spinner animates
- [x] Icon sizes match original design
- [x] No console errors related to fonts

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Component Library Setup

### Overview
Install Radix Sheet/Dialog components, create new UI components (FloatingNav, LensesTray, ArtistDetailSheet, EdgeCard, ShareModal).

### Changes Required

#### 1. Install Radix Components

**Commands**: Run in terminal
```bash
bunx shadcn@latest add sheet
bunx shadcn@latest add dialog
```

This creates:
- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`

#### 2. Create FloatingNav Component

**File**: `src/components/FloatingNav.tsx` (new file)

```tsx
import { Link } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/material-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

interface FloatingNavProps {
  onSearchClick?: () => void;
}

export function FloatingNav({ onSearchClick }: FloatingNavProps) {
  return (
    <GlassCard className="flex items-center gap-2 p-2">
      <div className="flex items-center gap-3 px-2">
        <MaterialIcon name="hub" size="lg" className="text-primary" />
        <span className="text-lg font-bold tracking-tight">MusiqasiQ</span>
      </div>
      <div className="h-6 w-px bg-border" />
      <Button variant="ghost" size="icon" asChild>
        <Link to="/">
          <MaterialIcon name="home" size="sm" />
          <span className="sr-only">Home</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={onSearchClick}>
        <MaterialIcon name="search" size="sm" />
        <span className="sr-only">Search</span>
      </Button>
    </GlassCard>
  );
}
```

#### 3. Create LensesTray Component

**File**: `src/components/LensesTray.tsx` (new file)

```tsx
import { MaterialIcon } from '@/components/ui/material-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LensesTrayProps {
  depth: number;
  onDepthChange: (value: number) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
}

export function LensesTray({
  depth,
  onDepthChange,
  threshold,
  onThresholdChange,
  showLabels,
  onShowLabelsChange,
  onZoomIn,
  onZoomOut,
  onReset,
  isLoading,
  className,
}: LensesTrayProps) {
  return (
    <GlassCard className={cn('w-72 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <MaterialIcon name="tune" size="sm" className="text-primary" />
        <span>Lenses</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="text-[10px] uppercase tracking-wide text-primary">Live</span>
        </span>
      </div>

      {/* Depth Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <MaterialIcon name="layers" size="xs" />
            Depth
          </Label>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{depth} hops</span>
        </div>
        <Slider
          value={[depth]}
          onValueChange={([v]) => onDepthChange(v)}
          min={1}
          max={3}
          step={1}
          disabled={isLoading}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Close</span>
          <span>Deeper</span>
        </div>
      </div>

      {/* Similarity Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <MaterialIcon name="tune" size="xs" />
            Similarity
          </Label>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
            {Math.round(threshold * 100)}%
          </span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={([v]) => onThresholdChange(v)}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Tighter</span>
          <span>Broader</span>
        </div>
      </div>

      {/* Labels Toggle */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <MaterialIcon name={showLabels ? 'visibility' : 'visibility_off'} size="xs" />
          Show Labels
        </Label>
        <Switch checked={showLabels} onCheckedChange={onShowLabelsChange} />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <div className="flex flex-col rounded-lg border border-border bg-background/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 rounded-b-none border-b border-border"
          >
            <MaterialIcon name="add" size="sm" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-8 w-8 rounded-t-none">
            <MaterialIcon name="remove" size="sm" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8">
          <MaterialIcon name="my_location" size="sm" />
        </Button>
      </div>
    </GlassCard>
  );
}
```

#### 4. Create ArtistDetailSheet Component

**File**: `src/components/ArtistDetailSheet.tsx` (new file)

```tsx
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Artist } from '@/types/artist';
import { cn, isPlaceholderImage } from '@/lib/utils';

interface ArtistDetailSheetProps {
  artist: Artist | null;
  similarArtists: Artist[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArtistClick: (name: string) => void;
  onExploreClick: (name: string) => void;
  similarityScore?: number;
}

function formatListeners(count: number | undefined): string {
  if (!count) return 'N/A';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function ArtistDetailSheet({
  artist,
  similarArtists,
  open,
  onOpenChange,
  onArtistClick,
  onExploreClick,
  similarityScore,
}: ArtistDetailSheetProps) {
  if (!artist) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] overflow-y-auto border-l border-white/10 bg-card/95 p-0 backdrop-blur-xl sm:w-96">
        {/* Header Image */}
        <div className="relative h-48 w-full bg-gradient-to-br from-primary/20 to-accent/20">
          {!isPlaceholderImage(artist.image_url) && artist.image_url && (
            <img
              src={artist.image_url}
              alt={artist.name}
              className="h-full w-full object-cover"
              style={{ filter: 'brightness(0.7)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="relative -mt-12 px-6 pb-6">
          {/* Avatar */}
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-xl border-4 border-card bg-card shadow-lg">
            {!isPlaceholderImage(artist.image_url) && artist.image_url ? (
              <img src={artist.image_url} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <MaterialIcon name="graphic_eq" size="lg" className="text-primary/60" />
              </div>
            )}
          </div>

          <SheetHeader className="mb-6 space-y-1 text-left">
            <SheetTitle className="text-2xl">{artist.name}</SheetTitle>
            {artist.listeners && (
              <p className="text-sm font-medium text-primary">
                {formatListeners(artist.listeners)} listeners
              </p>
            )}
          </SheetHeader>

          {/* Similarity Score Bar */}
          {similarityScore !== undefined && (
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-wider text-muted-foreground">Match</span>
                <span className="font-bold text-primary">{Math.round(similarityScore * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${similarityScore * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {artist.tags && artist.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {artist.tags.slice(0, 5).map((tag, i) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn(
                    'border border-white/10 text-xs',
                    i === 0 && 'border-primary/30 text-primary'
                  )}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <MaterialIcon name="group" size="sm" className="mx-auto mb-1 text-primary" />
              <div className="text-lg font-semibold">{formatListeners(artist.listeners)}</div>
              <div className="text-xs text-muted-foreground">Listeners</div>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <MaterialIcon name="trending_up" size="sm" className="mx-auto mb-1 text-accent" />
              <div className="text-lg font-semibold">
                {artist.playcount ? formatListeners(artist.playcount) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Plays</div>
            </div>
          </div>

          {/* Similar Artists */}
          {similarArtists.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Closest Connections
              </h4>
              <div className="space-y-2">
                {similarArtists.slice(0, 5).map((similar) => (
                  <button
                    key={similar.name}
                    onClick={() => onArtistClick(similar.name)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-secondary">
                      {!isPlaceholderImage(similar.image_url) && similar.image_url ? (
                        <img
                          src={similar.image_url}
                          alt={similar.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <MaterialIcon name="graphic_eq" size="sm" className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{similar.name}</p>
                      {similar.match && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(similar.match * 100)}% match
                        </p>
                      )}
                    </div>
                    <MaterialIcon name="chevron_right" size="sm" className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                onExploreClick(artist.name);
                onOpenChange(false);
              }}
            >
              <MaterialIcon name="hub" size="sm" className="mr-2" />
              Explore in Graph
            </Button>
            {artist.url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={artist.url} target="_blank" rel="noopener noreferrer">
                  <MaterialIcon name="open_in_new" size="sm" className="mr-2" />
                  View on Last.fm
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

#### 5. Create EdgeCard Component

**File**: `src/components/EdgeCard.tsx` (new file)

```tsx
import { MaterialIcon } from '@/components/ui/material-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

interface EdgeCardProps {
  sourceArtist: string;
  targetArtist: string;
  weight: number;
  position: { x: number; y: number };
  sharedTags?: string[];
  onClose: () => void;
  onArtistClick: (name: string) => void;
}

export function EdgeCard({
  sourceArtist,
  targetArtist,
  weight,
  position,
  sharedTags = [],
  onClose,
  onArtistClick,
}: EdgeCardProps) {
  const matchPercentage = Math.round(weight * 100);

  return (
    <div
      className="absolute z-30 animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, calc(-100% - 12px))',
      }}
    >
      <GlassCard className="w-64 p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connection
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <MaterialIcon name="close" size="xs" />
          </Button>
        </div>

        {/* Match Score */}
        <div className="mb-3 flex items-end justify-between">
          <span className="text-xs text-muted-foreground">Similarity</span>
          <span className="text-lg font-bold text-primary">{matchPercentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(19,182,236,0.6)]"
            style={{ width: `${matchPercentage}%` }}
          />
        </div>

        {/* Artists */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => onArtistClick(sourceArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {sourceArtist}
          </button>
          <MaterialIcon name="sync_alt" size="sm" className="shrink-0 text-muted-foreground" />
          <button
            onClick={() => onArtistClick(targetArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {targetArtist}
          </button>
        </div>

        {/* Shared Tags */}
        {sharedTags.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-start gap-2">
              <MaterialIcon name="sell" size="xs" className="mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Shared: </span>
                {sharedTags.slice(0, 3).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Arrow pointer */}
        <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-card/95" />
      </GlassCard>
    </div>
  );
}
```

#### 6. Update FloatingPanel Component

**File**: `src/components/ui/floating-panel.tsx`
**Changes**: Update to support more positions and better styling

```tsx
import { cn } from '@/lib/utils';

interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

const positionClasses = {
  'top-left': 'top-6 left-6',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-right': 'bottom-6 right-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
};

export function FloatingPanel({
  className,
  children,
  position = 'bottom-left',
  ...props
}: FloatingPanelProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto absolute z-20',
        positionClasses[position],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Success Criteria

#### Automated Verification
- [x] Sheet component exists: `src/components/ui/sheet.tsx`
- [x] Dialog component exists: `src/components/ui/dialog.tsx`
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`

#### Manual Verification
- [ ] FloatingNav renders with glassmorphism effect
- [ ] LensesTray sliders work correctly
- [ ] ArtistDetailSheet slides in from right
- [ ] EdgeCard appears at correct position

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Layout Restructure

### Overview
Refactor MapView to full-screen graph with floating overlay panels. Replace fixed sidebar with slide-in sheet.

### Changes Required

#### 1. Update MapView Layout

**File**: `src/pages/MapView.tsx`
**Changes**: Complete rewrite

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { FloatingNav } from '@/components/FloatingNav';
import { LensesTray } from '@/components/LensesTray';
import { ArtistDetailSheet } from '@/components/ArtistDetailSheet';
import { ArtistSearch } from '@/components/ArtistSearch';
import { EdgeCard } from '@/components/EdgeCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';
import { SkeletonGraph } from '@/components/SkeletonGraph';
import { useToast } from '@/hooks/use-toast';
import { useLastFm } from '@/hooks/useLastFm';
import { useSimilarArtists } from '@/hooks/useSimilarArtists';
import { Artist, GraphData } from '@/types/artist';

interface EdgeInfo {
  source: string;
  target: string;
  weight: number;
  position: { x: number; y: number };
  sharedTags?: string[];
}

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();
  const graphRef = useRef<ForceGraphHandle>(null);

  // State
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [depth, setDepth] = useState(() => {
    const d = searchParams.get('depth');
    return d ? parseInt(d, 10) : 1;
  });
  const [threshold, setThreshold] = useState(() => {
    const t = searchParams.get('threshold');
    return t ? parseFloat(t) : 0;
  });
  const [showLabels, setShowLabels] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [edgeInfo, setEdgeInfo] = useState<EdgeInfo | null>(null);

  const similarArtists = useSimilarArtists(selectedArtist, graphData);

  // Load graph data
  const loadGraph = useCallback(
    async (name: string, graphDepth: number) => {
      const data = await getGraph(name, graphDepth);
      if (data) {
        setGraphData(data);
        setSelectedArtist(data.center);
      }
    },
    [getGraph]
  );

  useEffect(() => {
    if (artistName) {
      loadGraph(decodeURIComponent(artistName), depth);
    }
  }, [artistName, depth, loadGraph]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('depth', depth.toString());
    params.set('threshold', threshold.toString());
    setSearchParams(params, { replace: true });
  }, [depth, threshold, setSearchParams]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Callbacks
  const handleNodeClick = useCallback((artist: Artist) => {
    setSelectedArtist(artist);
    setSheetOpen(true);
    setEdgeInfo(null);
  }, []);

  const handleEdgeClick = useCallback((info: EdgeInfo) => {
    setEdgeInfo(info);
    setSheetOpen(false);
  }, []);

  const handleRecenter = useCallback(
    (name: string) => {
      navigate(`/artist/${encodeURIComponent(name)}`);
      setSheetOpen(false);
      setEdgeInfo(null);
    },
    [navigate]
  );

  const handleSearchSelect = useCallback(
    (artist: Artist) => {
      navigate(`/artist/${encodeURIComponent(artist.name)}`);
      setSearchOpen(false);
    },
    [navigate]
  );

  // Close overlays when clicking graph background
  const handleBackgroundClick = useCallback(() => {
    setEdgeInfo(null);
    if (searchOpen) setSearchOpen(false);
  }, [searchOpen]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Full-screen Graph */}
      <div className="absolute inset-0" onClick={handleBackgroundClick}>
        {isLoading ? (
          <div className="relative h-full">
            <SkeletonGraph />
            <div className="absolute inset-0 flex items-center justify-center">
              <GlassCard className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <MaterialIcon name="progress_activity" size="sm" className="animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading similarity graph...</span>
                </div>
              </GlassCard>
            </div>
          </div>
        ) : (
          <ForceGraph
            ref={graphRef}
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            centerArtist={graphData?.center?.name || null}
            threshold={threshold}
            showLabels={showLabels}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Overlay Layer - pointer-events-none on container, pointer-events-auto on children */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top Left - Navigation */}
        <FloatingPanel position="top-left">
          <FloatingNav onSearchClick={() => setSearchOpen(true)} />
        </FloatingPanel>

        {/* Top Center - Search (conditional) */}
        {searchOpen && (
          <FloatingPanel position="top-center" className="w-full max-w-md">
            <GlassCard className="p-2">
              <ArtistSearch
                onSelect={handleSearchSelect}
                placeholder="Search artists..."
                autoFocus
              />
            </GlassCard>
          </FloatingPanel>
        )}

        {/* Top Right - Actions */}
        <FloatingPanel position="top-right" className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            className="bg-card/75 backdrop-blur-sm"
            onClick={() => {
              // TODO: Open share modal
              toast({ title: 'Share feature coming soon!' });
            }}
          >
            <MaterialIcon name="share" size="sm" />
            <span className="sr-only">Share</span>
          </Button>
        </FloatingPanel>

        {/* Bottom Left - Controls */}
        <FloatingPanel position="bottom-left">
          <LensesTray
            depth={depth}
            onDepthChange={setDepth}
            threshold={threshold}
            onThresholdChange={setThreshold}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onReset={() => graphRef.current?.reset()}
            isLoading={isLoading}
          />
        </FloatingPanel>

        {/* Bottom Center - Instructional Text */}
        <FloatingPanel position="bottom-center">
          <p className="rounded-full bg-card/60 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
            Artists closer together are more similar. Click anything to explore.
          </p>
        </FloatingPanel>

        {/* Edge Card (when edge is clicked) */}
        {edgeInfo && (
          <EdgeCard
            sourceArtist={edgeInfo.source}
            targetArtist={edgeInfo.target}
            weight={edgeInfo.weight}
            position={edgeInfo.position}
            sharedTags={edgeInfo.sharedTags}
            onClose={() => setEdgeInfo(null)}
            onArtistClick={handleRecenter}
          />
        )}
      </div>

      {/* Slide-in Artist Sheet */}
      <ArtistDetailSheet
        artist={selectedArtist}
        similarArtists={similarArtists}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onArtistClick={(name) => {
          const artist = graphData?.nodes.find((n) => n.name === name);
          if (artist) {
            setSelectedArtist(artist);
          }
        }}
        onExploreClick={handleRecenter}
      />
    </div>
  );
}
```

#### 2. Update ForceGraph to Support Edge Click

**File**: `src/components/ForceGraph/types.ts`
**Changes**: Add onEdgeClick prop

```typescript
// Add to ForceGraphProps interface
export interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerArtist: string | null;
  threshold?: number;
  showLabels?: boolean;
  onNodeClick: (artist: GraphNode) => void;
  onEdgeClick?: (info: {
    source: string;
    target: string;
    weight: number;
    position: { x: number; y: number };
    sharedTags?: string[];
  }) => void;
  className?: string;
}
```

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add edge click handler (around line 153)

```typescript
// Add onEdgeClick to destructured props
const { nodes, edges, centerArtist, threshold, showLabels, onNodeClick, onEdgeClick, className } = props;

// Update link selection (around line 144-155)
const linkSelection = g
  .append('g')
  .attr('class', 'links')
  .selectAll<SVGLineElement, SimulationLink>('line')
  .data(links)
  .join('line')
  .attr('stroke', 'hsl(var(--graph-edge))')
  .attr('stroke-opacity', (d) => 0.2 + d.weight * 0.6)
  .attr('stroke-width', (d) => 1 + d.weight * 2)
  .attr('class', 'cursor-pointer transition-all')
  .style('transition', 'stroke-opacity 0.15s ease-out, stroke 0.15s ease-out')
  .on('click', (event, d) => {
    event.stopPropagation();
    if (onEdgeClick) {
      const source = d.source as SimulationNode;
      const target = d.target as SimulationNode;
      const midX = (source.x! + target.x!) / 2;
      const midY = (source.y! + target.y!) / 2;
      
      // Find shared tags
      const sourceTags = new Set(source.tags || []);
      const sharedTags = (target.tags || []).filter((tag) => sourceTags.has(tag));
      
      onEdgeClick({
        source: source.name,
        target: target.name,
        weight: d.weight,
        position: { x: midX, y: midY },
        sharedTags,
      });
    }
  })
  .on('mouseenter', function () {
    d3.select(this)
      .attr('stroke', 'hsl(var(--primary))')
      .attr('stroke-opacity', 0.8);
  })
  .on('mouseleave', function (_, d) {
    d3.select(this)
      .attr('stroke', 'hsl(var(--graph-edge))')
      .attr('stroke-opacity', 0.2 + d.weight * 0.6);
  });
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification
- [ ] Graph fills entire screen (no fixed sidebar)
- [ ] FloatingNav appears in top-left with glassmorphism
- [ ] LensesTray appears in bottom-left
- [ ] Clicking a node opens ArtistDetailSheet from right
- [ ] Clicking an edge shows EdgeCard at midpoint
- [ ] Search opens as floating overlay
- [ ] URL updates with depth/threshold params
- [ ] Instructional text visible at bottom center

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Graph Visualization Updates

### Overview
Update node styling (larger, rings, glows), add floating labels with backdrop, implement bubble-in animations.

### Changes Required

#### 1. Create useNodeAnimation Hook

**File**: `src/components/ForceGraph/hooks/useNodeAnimation.ts` (new file)

```typescript
import { useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { SimulationNode } from '../types';

interface UseNodeAnimationOptions {
  enabled?: boolean;
  staggerDelay?: number;
  duration?: number;
}

export function useNodeAnimation(options: UseNodeAnimationOptions = {}) {
  const { enabled = true, staggerDelay = 30, duration = 400 } = options;
  const hasAnimatedRef = useRef(false);

  const animateNodesIn = useCallback(
    (nodeSelection: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>) => {
      if (!enabled || hasAnimatedRef.current) return;

      hasAnimatedRef.current = true;

      // Set initial state - scale 0, opacity 0
      nodeSelection
        .style('opacity', 0)
        .attr('transform', (d) => `translate(${d.x},${d.y}) scale(0)`);

      // Animate each node with stagger
      nodeSelection.each(function (d, i) {
        d3.select(this)
          .transition()
          .delay(i * staggerDelay)
          .duration(duration)
          .ease(d3.easeBackOut.overshoot(1.2))
          .style('opacity', 1)
          .attrTween('transform', () => {
            const interpolate = d3.interpolate(0, 1);
            return (t) => `translate(${d.x},${d.y}) scale(${interpolate(t)})`;
          });
      });
    },
    [enabled, staggerDelay, duration]
  );

  const resetAnimation = useCallback(() => {
    hasAnimatedRef.current = false;
  }, []);

  return { animateNodesIn, resetAnimation };
}
```

#### 2. Update hooks/index.ts

**File**: `src/components/ForceGraph/hooks/index.ts`
**Changes**: Add export

```typescript
export { useNodeAnimation } from './useNodeAnimation';
```

#### 3. Update Node Rendering in ForceGraph

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Update node circles with rings and glows (around lines 222-230)

Replace existing node circle rendering with:

```typescript
// Import the hook at top
import { useNodeAnimation } from './hooks/useNodeAnimation';

// Inside the component, add:
const { animateNodesIn, resetAnimation } = useNodeAnimation({ enabled: true });

// Reset animation when center artist changes
useEffect(() => {
  resetAnimation();
}, [centerArtist, resetAnimation]);

// Update node circles (replace lines 222-230)
// Outer glow ring for active/center nodes
nodeSelection
  .filter((d) => d.isCenter)
  .insert('circle', ':first-child')
  .attr('r', 40)
  .attr('fill', 'none')
  .attr('stroke', 'hsl(var(--primary) / 0.3)')
  .attr('stroke-width', 2)
  .attr('class', 'graph-node-pulse');

// Main node circle
nodeSelection
  .append('circle')
  .attr('r', (d) => {
    if (d.isCenter) return 32;
    const baseSize = 20;
    const listenersBonus = Math.min((d.listeners || 0) / 10000000, 1) * 10;
    return baseSize + listenersBonus;
  })
  .attr('fill', (d) => getNodeColor(d))
  .attr('stroke', 'hsl(var(--background))')
  .attr('stroke-width', (d) => (d.isCenter ? 4 : 3))
  .attr('class', (d) => (d.isCenter ? 'node-glow-active' : 'node-glow'))
  .style('transition', 'fill 0.2s ease-out, filter 0.2s ease-out');

// After nodes are created, trigger animation
animateNodesIn(nodeSelection);
```

#### 4. Update Label Rendering with Backdrop

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Replace label rendering (around lines 259-268)

```typescript
// Node labels with backdrop
const labelGroup = nodeSelection.append('g').attr('class', 'label-group');

// Backdrop rect (sized after text is measured)
labelGroup
  .append('rect')
  .attr('class', 'label-backdrop')
  .attr('rx', 4)
  .attr('ry', 4)
  .attr('fill', 'hsl(var(--card) / 0.8)')
  .style('opacity', showLabels ? 0.9 : 0)
  .style('transition', 'opacity 0.2s ease-out');

// Text label
const textSelection = labelGroup
  .append('text')
  .text((d) => d.name)
  .attr('text-anchor', 'middle')
  .attr('dy', (d) => (d.isCenter ? 50 : 40))
  .attr('class', 'fill-foreground text-xs font-medium')
  .style('pointer-events', 'none')
  .style('opacity', showLabels ? 1 : 0)
  .style('transition', 'opacity 0.2s ease-out');

// Size backdrop rects to fit text
labelGroup.each(function () {
  const group = d3.select(this);
  const text = group.select('text');
  const textNode = text.node() as SVGTextElement | null;
  
  if (textNode) {
    const bbox = textNode.getBBox();
    group
      .select('.label-backdrop')
      .attr('x', bbox.x - 6)
      .attr('y', bbox.y - 2)
      .attr('width', bbox.width + 12)
      .attr('height', bbox.height + 4);
  }
});
```

#### 5. Add Satellite Float Animation

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Add float animation to non-center nodes

```typescript
// Add float animation class to satellite nodes
nodeSelection
  .filter((d) => !d.isCenter)
  .classed('animate-float', true)
  .style('animation-delay', (_, i) => `${i * 0.1}s`);
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification
- [ ] Nodes animate in with staggered "bubble" effect on first load
- [ ] Center node is larger (32px) with visible glow ring and pulse
- [ ] Satellite nodes have subtle glow and float animation
- [ ] Labels have frosted glass backdrop
- [ ] Hover over node increases glow intensity
- [ ] Animation resets when navigating to new artist

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 5.

---

## Phase 5: Last.fm OAuth Integration

### Overview
Implement "Connect Last.fm" button with OAuth flow. Uses the backend server from Phase 0 for secure session token exchange.

### Changes Required

#### 1. Create Auth Context

**File**: `src/contexts/LastFmAuthContext.tsx` (new file)

```tsx
import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';

interface LastFmAuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionKey: string | null;
}

interface LastFmAuthContextValue extends LastFmAuthState {
  connect: () => void;
  disconnect: () => void;
  handleCallback: (token: string) => Promise<boolean>;
}

const LastFmAuthContext = createContext<LastFmAuthContextValue | null>(null);

const STORAGE_KEY = 'lastfm_auth';
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;

export function LastFmAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LastFmAuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid stored data
      }
    }
    return { isAuthenticated: false, username: null, sessionKey: null };
  });

  // Persist state to localStorage
  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const connect = useCallback(() => {
    // Redirect to Last.fm authorization
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(callbackUrl)}`;
    window.location.href = authUrl;
  }, []);

  const disconnect = useCallback(() => {
    setState({ isAuthenticated: false, username: null, sessionKey: null });
  }, []);

  const handleCallback = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Exchange token for session via backend
      const response = await fetch('/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate');
      }

      const { sessionKey, username } = await response.json();
      setState({ isAuthenticated: true, username, sessionKey });
      return true;
    } catch (error) {
      console.error('Last.fm auth error:', error);
      return false;
    }
  }, []);

  return (
    <LastFmAuthContext.Provider value={{ ...state, connect, disconnect, handleCallback }}>
      {children}
    </LastFmAuthContext.Provider>
  );
}

export function useLastFmAuth() {
  const context = useContext(LastFmAuthContext);
  if (!context) {
    throw new Error('useLastFmAuth must be used within LastFmAuthProvider');
  }
  return context;
}
```

#### 2. Create Auth Callback Page

**File**: `src/pages/AuthCallback.tsx` (new file)

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLastFmAuth } from '@/contexts/LastFmAuthContext';
import { MaterialIcon } from '@/components/ui/material-icon';
import { GlassCard } from '@/components/ui/glass-card';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useLastFmAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setError('No authentication token received');
      return;
    }

    handleCallback(token)
      .then((success) => {
        if (success) {
          setStatus('success');
          setTimeout(() => navigate('/'), 1500);
        } else {
          setStatus('error');
          setError('Authentication failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('An unexpected error occurred');
      });
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <GlassCard className="w-full max-w-sm p-8 text-center">
        {status === 'loading' && (
          <>
            <MaterialIcon name="progress_activity" size="xl" className="mx-auto animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold">Connecting to Last.fm</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <MaterialIcon name="check_circle" size="xl" className="mx-auto text-green-500" />
            <h1 className="mt-4 text-xl font-bold">Connected!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting to app...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <MaterialIcon name="error" size="xl" className="mx-auto text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Connection Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Return to app
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}
```

#### 3. Create ConnectLastFmButton Component

**File**: `src/components/ConnectLastFmButton.tsx` (new file)

```tsx
import { useLastFmAuth } from '@/contexts/LastFmAuthContext';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';

interface ConnectLastFmButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
}

export function ConnectLastFmButton({ variant = 'outline', className }: ConnectLastFmButtonProps) {
  const { isAuthenticated, username, connect, disconnect } = useLastFmAuth();

  if (isAuthenticated) {
    return (
      <Button variant={variant} className={className} onClick={disconnect}>
        <MaterialIcon name="person" size="sm" className="mr-2" />
        {username}
      </Button>
    );
  }

  return (
    <Button variant={variant} className={className} onClick={connect}>
      Connect Last.fm
    </Button>
  );
}
```

#### 4. Add Route for Callback

**File**: `src/App.tsx`
**Changes**: Add callback route and auth provider

```tsx
import { LastFmAuthProvider } from '@/contexts/LastFmAuthContext';
import AuthCallback from '@/pages/AuthCallback';

// Wrap the app in LastFmAuthProvider
function App() {
  return (
    <LastFmAuthProvider>
      <ThemeProvider>
        <Routes>
          {/* ... existing routes ... */}
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </ThemeProvider>
    </LastFmAuthProvider>
  );
}
```

#### 5. Add Connect Button to FloatingNav

**File**: `src/components/FloatingNav.tsx`
**Changes**: Add ConnectLastFmButton

```tsx
import { ConnectLastFmButton } from '@/components/ConnectLastFmButton';

// In the component, add before the closing div:
<div className="h-6 w-px bg-border" />
<ConnectLastFmButton variant="outline" className="bg-card/50 backdrop-blur-sm" />
```

**Note**: The backend endpoint (`POST /api/lastfm/session`) was implemented in Phase 0.

### Success Criteria

#### Automated Verification
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`

#### Manual Verification
- [ ] "Connect Last.fm" button visible in FloatingNav
- [ ] Clicking button redirects to Last.fm auth page
- [ ] After authorization, callback page shows loading state
- [ ] Successful auth shows username in button
- [ ] Disconnect button clears auth state
- [ ] Auth state persists across page reloads

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 6.

---

## Phase 6: Share Feature

### Overview
Implement ShareModal with URL copy and optional PNG export.

### Changes Required

#### 1. Install Dialog Component (if not done)

**Command**:
```bash
bunx shadcn@latest add dialog
```

#### 2. Create ShareModal Component

**File**: `src/components/ShareModal.tsx` (new file)

```tsx
import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphState: {
    artist: string;
    depth: number;
    threshold: number;
  };
  onExportImage?: () => Promise<Blob | null>;
}

export function ShareModal({
  open,
  onOpenChange,
  graphState,
  onExportImage,
}: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build share URL
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set('depth', graphState.depth.toString());
  shareUrl.searchParams.set('threshold', graphState.threshold.toString());
  const shareUrlString = shareUrl.toString();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlString);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Share URL copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleExportImage = async () => {
    if (!onExportImage) return;

    setExporting(true);
    try {
      const blob = await onExportImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${graphState.artist}-graph.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Image exported!', description: 'Graph image saved' });
      }
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MaterialIcon name="share" size="sm" className="text-primary" />
            Share Graph
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Graph Info */}
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-sm font-medium">{graphState.artist}'s Similarity Graph</p>
            <p className="text-xs text-muted-foreground">
              Depth: {graphState.depth} hops • Threshold: {Math.round(graphState.threshold * 100)}%
            </p>
          </div>

          {/* URL Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input value={shareUrlString} readOnly className="flex-1 text-xs" />
              <Button onClick={handleCopyLink} variant="outline">
                <MaterialIcon name={copied ? 'check' : 'content_copy'} size="sm" />
              </Button>
            </div>
          </div>

          {/* Export Image */}
          {onExportImage && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Image</label>
              <Button
                onClick={handleExportImage}
                variant="outline"
                className="w-full"
                disabled={exporting}
              >
                <MaterialIcon name="download" size="sm" className="mr-2" />
                {exporting ? 'Exporting...' : 'Download PNG'}
              </Button>
            </div>
          )}

          {/* Social Share */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button variant="secondary" className="flex-1" asChild>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrlString)}&text=Check out my music taste graph for ${graphState.artist}!`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on X
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Create Graph Export Utility

**File**: `src/lib/graph-export.ts` (new file)

```typescript
export async function svgToPng(svgElement: SVGSVGElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // 2x resolution for retina displays
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;
      ctx.scale(2, 2);
      
      // Draw background
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw SVG
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
```

#### 4. Add Export Method to ForceGraph

**File**: `src/components/ForceGraph/types.ts`
**Changes**: Add exportImage to handle

```typescript
export interface ForceGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  exportImage: () => Promise<Blob | null>;
}
```

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Implement exportImage

```typescript
import { svgToPng } from '@/lib/graph-export';

// In useImperativeHandle:
useImperativeHandle(
  ref,
  () => ({
    zoomIn,
    zoomOut,
    reset,
    exportImage: async () => {
      if (svgRef.current) {
        return svgToPng(svgRef.current);
      }
      return null;
    },
  }),
  [zoomIn, zoomOut, reset]
);
```

#### 5. Add ShareModal to MapView

**File**: `src/pages/MapView.tsx`
**Changes**: Add share modal state and button handler

```tsx
import { ShareModal } from '@/components/ShareModal';

// Add state
const [shareOpen, setShareOpen] = useState(false);

// Update share button handler (replace the TODO)
<Button
  variant="outline"
  size="icon"
  className="bg-card/75 backdrop-blur-sm"
  onClick={() => setShareOpen(true)}
>
  <MaterialIcon name="share" size="sm" />
  <span className="sr-only">Share</span>
</Button>

// Add ShareModal at end of component
<ShareModal
  open={shareOpen}
  onOpenChange={setShareOpen}
  graphState={{
    artist: artistName || '',
    depth,
    threshold,
  }}
  onExportImage={() => graphRef.current?.exportImage() ?? Promise.resolve(null)}
/>
```

### Success Criteria

#### Automated Verification
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`
- [ ] E2E tests pass: `bun run test:e2e`

#### Manual Verification
- [ ] Share button opens ShareModal
- [ ] Copy Link copies correct URL with params to clipboard
- [ ] URL params are correctly restored when opening shared link
- [ ] Export Image downloads a PNG file
- [ ] PNG includes correct background color
- [ ] Share on X opens Twitter intent with correct text

**Implementation Note**: After completing this phase and all automated verification passes, the complete UI redesign is finished!

---

## Testing Strategy

### Unit Tests to Add

1. **MaterialIcon** (`src/components/ui/material-icon.test.tsx`):
   - Renders correct icon name
   - Applies size classes correctly
   - Filled variant works

2. **LensesTray** (`src/components/LensesTray.test.tsx`):
   - Slider values update correctly
   - Zoom buttons call handlers

3. **ArtistDetailSheet** (`src/components/ArtistDetailSheet.test.tsx`):
   - Renders artist info correctly
   - Similar artists list works
   - Actions trigger callbacks

4. **EdgeCard** (`src/components/EdgeCard.test.tsx`):
   - Displays correct match percentage
   - Close button works
   - Artist buttons trigger callbacks

5. **ShareModal** (`src/components/ShareModal.test.tsx`):
   - Generates correct URL
   - Copy button works

6. **useNodeAnimation** (`src/components/ForceGraph/hooks/useNodeAnimation.test.ts`):
   - Animation triggered on first call
   - Reset allows re-animation

### E2E Tests to Add

**File**: `e2e/ui-redesign.spec.ts`

1. Full-screen layout: Graph fills viewport
2. Panel interactions: Click node → sheet opens
3. Edge interaction: Click edge → card appears
4. Controls work: Adjust sliders → graph updates
5. Share flow: Open modal → copy link → verify URL
6. Animation: New graph animates nodes

---

## Performance Considerations

1. **Animation Batching**: 30ms stagger prevents jank with 100+ nodes
2. **Memoization**: All callbacks use `useCallback`
3. **Lazy Loading**: Sheet only renders when open
4. **URL State Sync**: Uses `replace` to avoid history bloat
5. **Material Symbols**: Single font file, no JS bundle impact

---

## Migration Notes

1. **GraphControls Deprecation**: Replaced by `LensesTray`
2. **ArtistPanel Deprecation**: Replaced by `ArtistDetailSheet`
3. **Lucide Removal**: Remove `lucide-react` after migration
4. **No Breaking Changes**: URL routes remain the same

---

## References

- Existing research: `thoughts/shared/research/2025-12-27-mockup-integration-analysis.md`
- Existing plan: `thoughts/shared/plans/2025-12-27-mockup-ui-integration.md`
- Animation research: `thoughts/shared/research/2025-12-21-graph-animation-discovery-features.md`
- ForceGraph hooks: `src/components/ForceGraph/hooks/`
- Current MapView: `src/pages/MapView.tsx:78-154`
- Current CSS variables: `src/index.css:6-100`
