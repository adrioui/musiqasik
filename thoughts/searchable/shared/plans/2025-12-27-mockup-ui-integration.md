# Mockup UI Integration Implementation Plan

## Overview

Integrate the TuneGraph/SonicGraph HTML mockups (8 UI states) into the MusiqasiQ codebase. This includes a complete design system update (cyan-blue palette, glassmorphism), layout restructure (full-screen graph with overlay panels), graph visualization enhancements (node/edge styling, animations), and new features (share, weekly discovery, bridge artists).

## Current State Analysis

### Existing Architecture
- **Layout**: Fixed sidebar (`w-80`), no mobile responsiveness
- **ForceGraph**: Modular hooks (`useD3Simulation`, `useD3Zoom`, `useGraphData`, `useGenreColors`), SVG-based
- **UI Components**: 13 shadcn/ui components (no Sheet/Dialog)
- **Design System**: Blue primary (`hsl(220, 70%, 50%)`), purple accent, system fonts
- **Animations**: `fade-in`, `slide-up`, `graph-pulse` (center node only)

### Key Discoveries
- `src/index.css:6-100` - CSS variables need color palette update
- `src/pages/MapView.tsx:79-152` - Fixed sidebar layout needs refactor
- `src/components/ForceGraph/index.tsx:222-257` - Node rendering needs styling updates
- `src/components/ForceGraph/hooks/` - Modular architecture enables easy extension
- No Inter font imported in `index.html`
- No Sheet/Dialog components installed

## Desired End State

After implementation:
1. **Visual Design**: Cyan-blue color scheme (`#13b6ec`), glassmorphism panels, Inter font
2. **Layout**: Full-screen graph with floating overlays (nav, controls, slide-in artist sheet)
3. **Graph**: Nodes with rings/glows, floating labels, bubble-in animations, edge interaction
4. **Features**: Share modal with URL copy, weekly discovery panel, bridge artist recommendations

### Verification
- All 8 mockup UI states can be reproduced
- Graph renders at 60fps with 100+ nodes
- Share URL correctly restores graph state
- Weekly discovery shows personalized recommendations

## What We're NOT Doing

- Mobile responsive layout (desktop-first, responsive later)
- Backend short URLs for sharing (simple URL copy only)
- Renaming to "TuneGraph"/"SonicGraph" (keeping "MusiqasiQ")
- PixiJS migration (SVG performance acceptable for MVP)
- Server-side discovery algorithm (client-side based on search history)

## Implementation Approach

**4 Phases** building on each other:
1. **Design System** - Foundation (colors, fonts, utilities)
2. **Layout Restructure** - Full-screen graph with overlays
3. **Graph Visualization** - Node/edge styling and animations
4. **New Features** - Share, weekly discovery, comparison mode

---

## Phase 1: Design System Foundation

### Overview
Update CSS variables, add Inter font, create glassmorphism utilities and base components.

### Changes Required

#### 1. Update CSS Variables

**File**: `src/index.css`
**Changes**: Replace color palette with mockup colors

```css
/* Lines 6-56: Light theme - replace these values */
:root {
  --background: 0 0% 100%;
  --foreground: 200 30% 8%;
  
  --card: 0 0% 100%;
  --card-foreground: 200 30% 8%;
  
  --popover: 0 0% 100%;
  --popover-foreground: 200 30% 8%;
  
  --primary: 195 85% 50%; /* #13b6ec - cyan-blue */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 195 15% 96%;
  --secondary-foreground: 200 30% 8%;
  
  --muted: 195 15% 96%;
  --muted-foreground: 200 30% 45%;
  
  --accent: 212 85% 50%; /* #137fec - bright blue */
  --accent-foreground: 0 0% 100%;
  
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  --border: 195 15% 90%;
  --input: 195 15% 90%;
  --ring: 195 85% 50%;
  
  --radius: 0.75rem;
  
  /* Graph-specific */
  --graph-node: 195 85% 50%;
  --graph-node-hover: 212 85% 50%;
  --graph-edge: 195 15% 75%;
  --graph-center: 212 85% 50%;
}

/* Lines 58-100: Dark theme - replace these values */
.dark {
  --background: 200 30% 8%; /* #101d22 */
  --foreground: 0 0% 98%;
  
  --card: 195 15% 12%; /* #1c2427 */
  --card-foreground: 0 0% 98%;
  
  --popover: 195 15% 12%;
  --popover-foreground: 0 0% 98%;
  
  --primary: 195 85% 50%;
  --primary-foreground: 0 0% 100%;
  
  --secondary: 195 15% 18%;
  --secondary-foreground: 0 0% 98%;
  
  --muted: 195 15% 18%;
  --muted-foreground: 195 15% 65%;
  
  --accent: 212 85% 55%;
  --accent-foreground: 0 0% 100%;
  
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  
  --border: 195 15% 20%;
  --input: 195 15% 20%;
  --ring: 195 85% 50%;
  
  /* Graph-specific */
  --graph-node: 195 85% 55%;
  --graph-node-hover: 212 85% 60%;
  --graph-edge: 195 15% 35%;
  --graph-center: 212 85% 60%;
}
```

#### 2. Add Glassmorphism Utilities

**File**: `src/index.css`
**Changes**: Add after line 110 (after body styles)

```css
/* Glassmorphism utilities */
.glass-panel {
  @apply bg-[rgba(16,29,34,0.75)] backdrop-blur-xl border border-white/10 rounded-xl;
}

.glass-panel-light {
  @apply bg-white/75 backdrop-blur-xl border border-black/5 rounded-xl;
}

/* Glow effects */
.node-glow {
  filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.3));
}

.node-glow-active {
  filter: drop-shadow(0 0 12px hsl(var(--primary) / 0.5));
}

.edge-glow {
  filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.5));
}

/* Float animation for satellite nodes */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Bubble-in animation */
@keyframes bubble-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bubble-in {
  animation: bubble-in 0.4s ease-out forwards;
}
```

#### 3. Add Inter Font

**File**: `index.html`
**Changes**: Add Google Fonts link in `<head>` after line 8

```html
<!-- Google Fonts - Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**File**: `tailwind.config.ts`
**Changes**: Add font family after line 19 (in `theme.extend`)

```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
```

#### 4. Create GlassCard Component

**File**: `src/components/ui/glass-card.tsx` (new file)

```tsx
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-card/75 p-4 shadow-lg backdrop-blur-xl',
        'dark:bg-[rgba(16,29,34,0.75)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

#### 5. Create FloatingPanel Component

**File**: `src/components/ui/floating-panel.tsx` (new file)

```tsx
import { cn } from '@/lib/utils';

interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
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
        'absolute z-20',
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
- [x] TypeScript compiles: `bun run build`
- [x] Linting passes: `bun run lint`
- [x] Unit tests pass: `bun run test`
- [x] Dev server starts: `bun run dev`

#### Manual Verification
- [ ] Cyan-blue primary color visible throughout UI
- [ ] Dark mode shows correct dark teal-gray backgrounds
- [ ] Inter font renders in browser (check DevTools)
- [ ] GlassCard shows frosted glass effect with backdrop blur

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Core Layout Restructure

### Overview
Refactor MapView to full-screen graph with floating overlay panels. Install Radix Sheet for slide-in artist details.

### Changes Required

#### 1. Install Radix Sheet Component

**Command**: Run in terminal
```bash
bunx shadcn@latest add sheet
```

This will create `src/components/ui/sheet.tsx` with Radix Sheet primitives.

#### 2. Create FloatingNav Component

**File**: `src/components/FloatingNav.tsx` (new file)

```tsx
import { Home, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

interface FloatingNavProps {
  onSearchClick?: () => void;
}

export function FloatingNav({ onSearchClick }: FloatingNavProps) {
  return (
    <GlassCard className="flex items-center gap-2 p-2">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/">
          <Home className="h-5 w-5" />
          <span className="sr-only">Home</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={onSearchClick}>
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </Button>
    </GlassCard>
  );
}
```

#### 3. Create LensesTray Component

**File**: `src/components/LensesTray.tsx` (new file)

```tsx
import { Layers, Filter, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4 text-primary" />
        <span>Lenses & Filters</span>
      </div>

      {/* Depth Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Depth
          </Label>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{depth}</span>
        </div>
        <Slider
          value={[depth]}
          onValueChange={([v]) => onDepthChange(v)}
          min={1}
          max={3}
          step={1}
          disabled={isLoading}
        />
      </div>

      {/* Similarity Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
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
      </div>

      {/* Labels Toggle */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Show Labels
        </Label>
        <Switch checked={showLabels} onCheckedChange={onShowLabelsChange} />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" size="icon" onClick={onZoomIn} className="h-8 w-8">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomOut} className="h-8 w-8">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onReset} className="h-8 w-8">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </GlassCard>
  );
}
```

#### 4. Create ArtistDetailSheet Component

**File**: `src/components/ArtistDetailSheet.tsx` (new file)

```tsx
import { ExternalLink, Play, Users, TrendingUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Artist } from '@/types/artist';
import { cn } from '@/lib/utils';

interface ArtistDetailSheetProps {
  artist: Artist | null;
  similarArtists: Artist[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArtistClick: (name: string) => void;
  similarityScore?: number;
}

function formatListeners(count: number | undefined): string {
  if (!count) return 'N/A';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

function isPlaceholderImage(url: string | undefined): boolean {
  if (!url) return true;
  return url.includes('2a96cbd8b46e442fc41c2b86b821562f');
}

export function ArtistDetailSheet({
  artist,
  similarArtists,
  open,
  onOpenChange,
  onArtistClick,
  similarityScore,
}: ArtistDetailSheetProps) {
  if (!artist) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 overflow-y-auto border-l border-white/10 bg-card/95 backdrop-blur-xl">
        <SheetHeader className="space-y-4">
          {/* Artist Image */}
          <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            {!isPlaceholderImage(artist.image_url) && artist.image_url ? (
              <img
                src={artist.image_url}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Users className="h-12 w-12 text-primary/60" />
              </div>
            )}
          </div>

          <SheetTitle className="text-center text-xl">{artist.name}</SheetTitle>

          {/* Similarity Score Bar */}
          {similarityScore !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Match</span>
                <span>{Math.round(similarityScore * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${similarityScore * 100}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-lg font-semibold">{formatListeners(artist.listeners)}</div>
              <div className="text-xs text-muted-foreground">Listeners</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <TrendingUp className="mx-auto mb-1 h-4 w-4 text-accent" />
              <div className="text-lg font-semibold">{artist.playcount ? formatListeners(artist.playcount) : 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Plays</div>
            </div>
          </div>

          {/* Tags */}
          {artist.tags && artist.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {artist.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                onArtistClick(artist.name);
                onOpenChange(false);
              }}
            >
              <Play className="mr-2 h-4 w-4" />
              Explore in Graph
            </Button>
            {artist.url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={artist.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Last.fm
                </a>
              </Button>
            )}
          </div>

          {/* Similar Artists */}
          {similarArtists.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Similar Artists</h4>
              <div className="space-y-1">
                {similarArtists.slice(0, 6).map((similar) => (
                  <button
                    key={similar.name}
                    onClick={() => onArtistClick(similar.name)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left',
                      'transition-colors hover:bg-secondary/30'
                    )}
                  >
                    <div className="h-8 w-8 overflow-hidden rounded-md bg-secondary">
                      {!isPlaceholderImage(similar.image_url) && similar.image_url ? (
                        <img
                          src={similar.image_url}
                          alt={similar.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm">{similar.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

#### 5. Refactor MapView Layout

**File**: `src/pages/MapView.tsx`
**Changes**: Replace entire file with new layout structure

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';

import { ForceGraph, ForceGraphHandle } from '@/components/ForceGraph';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { FloatingNav } from '@/components/FloatingNav';
import { LensesTray } from '@/components/LensesTray';
import { ArtistDetailSheet } from '@/components/ArtistDetailSheet';
import { ArtistSearch } from '@/components/ArtistSearch';
import { GraphLegend } from '@/components/ForceGraph/GraphLegend';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { useToast } from '@/hooks/use-toast';
import { useLastFm } from '@/hooks/useLastFm';
import { useSimilarArtists } from '@/hooks/useSimilarArtists';
import { Artist, GraphData } from '@/types/artist';

export default function MapView() {
  const { artistName } = useParams<{ artistName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getGraph, isLoading, error } = useLastFm();
  const graphRef = useRef<ForceGraphHandle>(null);

  // State
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [depth, setDepth] = useState(1);
  const [threshold, setThreshold] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const similarArtists = useSimilarArtists(selectedArtist, graphData);

  // Load graph data
  useEffect(() => {
    if (artistName) {
      getGraph(artistName, depth).then(setGraphData);
    }
  }, [artistName, depth, getGraph]);

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
  }, []);

  const handleRecenter = useCallback(
    (name: string) => {
      navigate(`/artist/${encodeURIComponent(name)}`);
      setSheetOpen(false);
    },
    [navigate]
  );

  const handleDepthChange = useCallback(
    (newDepth: number) => {
      setDepth(newDepth);
    },
    []
  );

  const handleSearchSelect = useCallback(
    (artist: Artist) => {
      navigate(`/artist/${encodeURIComponent(artist.name)}`);
      setSearchOpen(false);
    },
    [navigate]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Full-screen Graph */}
      <ForceGraph
        ref={graphRef}
        artists={graphData?.artists || []}
        edges={graphData?.edges || []}
        centerArtist={artistName}
        onNodeClick={handleNodeClick}
        threshold={threshold}
        showLabels={showLabels}
        className="h-full w-full"
      />

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
        <Button variant="outline" size="icon" className="bg-card/75 backdrop-blur-sm">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </FloatingPanel>

      {/* Bottom Left - Controls */}
      <FloatingPanel position="bottom-left">
        <LensesTray
          depth={depth}
          onDepthChange={handleDepthChange}
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

      {/* Bottom Right - Legend (collapsible in future) */}
      <FloatingPanel position="bottom-right">
        {graphData && <GraphLegend colorMap={new Map()} />}
      </FloatingPanel>

      {/* Slide-in Artist Sheet */}
      <ArtistDetailSheet
        artist={selectedArtist}
        similarArtists={similarArtists}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onArtistClick={handleRecenter}
      />

      {/* Click outside search to close */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
```

### Success Criteria

#### Automated Verification
- [ ] Sheet component installed: file exists at `src/components/ui/sheet.tsx`
- [ ] TypeScript compiles: `bun run build`
- [ ] Linting passes: `bun run lint`
- [ ] Unit tests pass: `bun run test`

#### Manual Verification
- [ ] Graph fills entire screen (no fixed sidebar visible)
- [ ] FloatingNav appears in top-left with glassmorphism
- [ ] LensesTray appears in bottom-left with controls
- [ ] Clicking a node opens ArtistDetailSheet from right
- [ ] Search opens as floating overlay when search icon clicked
- [ ] All zoom controls work (in, out, reset)

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Graph Visualization Updates

### Overview
Update node/edge styling (rings, glows), add bubble-in animations, implement edge interaction with EdgeCard.

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

      // Set initial state
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
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);
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

#### 2. Update useNodeAnimation Export

**File**: `src/components/ForceGraph/hooks/index.ts`
**Changes**: Add export

```typescript
export { useNodeAnimation } from './useNodeAnimation';
```

#### 3. Create EdgeCard Component

**File**: `src/components/EdgeCard.tsx` (new file)

```tsx
import { X } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

interface EdgeCardProps {
  sourceArtist: string;
  targetArtist: string;
  weight: number;
  position: { x: number; y: number };
  onClose: () => void;
  onArtistClick: (name: string) => void;
}

export function EdgeCard({
  sourceArtist,
  targetArtist,
  weight,
  position,
  onClose,
  onArtistClick,
}: EdgeCardProps) {
  const matchPercentage = Math.round(weight * 100);

  return (
    <div
      className="absolute z-30 animate-fade-in"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
    >
      <GlassCard className="w-64 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Connection</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => onArtistClick(sourceArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm hover:bg-secondary"
          >
            {sourceArtist}
          </button>
          <div className="text-muted-foreground">↔</div>
          <button
            onClick={() => onArtistClick(targetArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm hover:bg-secondary"
          >
            {targetArtist}
          </button>
        </div>

        {/* Match percentage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Match Strength</span>
            <span className="font-medium text-primary">{matchPercentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
```

#### 4. Update Node Rendering in ForceGraph

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Update node circle rendering (around lines 223-230)

Replace the existing circle rendering with:

```typescript
// Node circles with rings and glows
nodeEnter
  .append('circle')
  .attr('r', (d) => (d.isCenter ? 32 : 20 + Math.min((d.listeners || 0) / 10000000, 1) * 10))
  .attr('fill', (d) => getNodeColor(d))
  .attr('stroke', 'hsl(var(--background))')
  .attr('stroke-width', (d) => (d.isCenter ? 4 : 3))
  .attr('class', (d) => d.isCenter ? 'graph-node-pulse node-glow-active' : 'node-glow')
  .style('transition', 'fill 0.2s ease-out, filter 0.2s ease-out');
```

#### 5. Update Edge Rendering in ForceGraph

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Update edge line rendering (around lines 144-153)

Add edge click handler and update styling:

```typescript
// Edge lines with click interaction
const linkSelection = linksGroup
  .selectAll<SVGLineElement, SimulationLink>('line')
  .data(links)
  .join('line')
  .attr('stroke', 'hsl(var(--graph-edge))')
  .attr('stroke-opacity', (d) => 0.15 + d.weight * 0.5)
  .attr('stroke-width', (d) => 0.5 + d.weight * 1.5)
  .attr('class', 'cursor-pointer transition-all hover:stroke-[hsl(var(--primary))]')
  .on('click', (event, d) => {
    event.stopPropagation();
    const midX = ((d.source as SimulationNode).x! + (d.target as SimulationNode).x!) / 2;
    const midY = ((d.source as SimulationNode).y! + (d.target as SimulationNode).y!) / 2;
    onEdgeClick?.({
      source: typeof d.source === 'string' ? d.source : (d.source as SimulationNode).name,
      target: typeof d.target === 'string' ? d.target : (d.target as SimulationNode).name,
      weight: d.weight,
      position: { x: midX, y: midY },
    });
  });
```

#### 6. Add Floating Labels with Backdrop

**File**: `src/components/ForceGraph/index.tsx`
**Changes**: Update label rendering (around lines 259-268)

Replace with floating label style:

```typescript
// Floating labels with backdrop blur effect
const labelGroup = nodeEnter.append('g').attr('class', 'label-group');

labelGroup
  .append('rect')
  .attr('rx', 4)
  .attr('ry', 4)
  .attr('fill', 'hsl(var(--card) / 0.8)')
  .attr('class', 'backdrop-blur-sm')
  .style('opacity', showLabels ? 0.9 : 0);

labelGroup
  .append('text')
  .text((d) => d.name)
  .attr('text-anchor', 'middle')
  .attr('dy', (d) => (d.isCenter ? 50 : 40))
  .attr('class', 'fill-foreground text-xs font-medium')
  .style('pointer-events', 'none')
  .style('opacity', showLabels ? 1 : 0)
  .style('transition', 'opacity 0.2s ease-out');

// Measure and size the backdrop rect
labelGroup.each(function () {
  const text = d3.select(this).select('text');
  const bbox = (text.node() as SVGTextElement)?.getBBox();
  if (bbox) {
    d3.select(this)
      .select('rect')
      .attr('x', bbox.x - 6)
      .attr('y', bbox.y - 2)
      .attr('width', bbox.width + 12)
      .attr('height', bbox.height + 4);
  }
});
```

### Success Criteria

#### Automated Verification
- [ ] TypeScript compiles: `bun run build`
- [ ] Linting passes: `bun run lint`
- [ ] Unit tests pass: `bun run test`

#### Manual Verification
- [ ] Nodes animate in with staggered "bubble" effect on first load
- [ ] Center node has visible glow and pulse animation
- [ ] Satellite nodes have subtle glow effect
- [ ] Clicking an edge shows EdgeCard with connection details
- [ ] Labels have frosted glass background effect
- [ ] Hover over node increases glow intensity

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to Phase 4.

---

## Phase 4: New Features

### Overview
Implement share functionality, weekly discovery panel, and comparison/bridge artist mode.

### Sub-Phase 4A: Share Functionality

#### 1. Create ShareModal Component

**File**: `src/components/ShareModal.tsx` (new file)

```tsx
import { useState } from 'react';
import { Check, Copy, Download, Link2 } from 'lucide-react';
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

  // Build share URL with query params
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
          <DialogTitle>Share Graph</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input value={shareUrlString} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Download PNG'}
              </Button>
            </div>
          )}

          {/* Social share buttons could go here */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" className="flex-1" asChild>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrlString)}&text=Check out my music taste graph!`}
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

#### 2. Install Dialog Component

**Command**: Run in terminal
```bash
bunx shadcn@latest add dialog
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
      canvas.width = svgElement.clientWidth * 2; // 2x for retina
      canvas.height = svgElement.clientHeight * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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

### Sub-Phase 4B: Weekly Discovery

#### 1. Create Discovery Service

**File**: `src/services/discovery.ts` (new file)

```typescript
import { Effect } from 'effect';
import { AppError, ServiceError } from '@/lib/errors';
import { Artist } from '@/types/artist';
import { LastFmService } from './lastfm';

export interface DiscoveryDrop {
  category: 'close_match' | 'bridge_artist' | 'wildcard';
  artist: Artist;
  reason: string;
  similarity?: number;
}

export interface DiscoveryService {
  getWeeklyDrops: (
    recentSearches: string[],
    limit?: number
  ) => Effect.Effect<DiscoveryDrop[], AppError>;
}

const STORAGE_KEY = 'musiqasiq_recent_searches';

export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(artistName: string): void {
  const searches = getRecentSearches();
  const updated = [artistName, ...searches.filter((s) => s !== artistName)].slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export const createDiscoveryService = (lastFm: LastFmService): DiscoveryService => ({
  getWeeklyDrops: (recentSearches, limit = 9) =>
    Effect.gen(function* () {
      if (recentSearches.length === 0) {
        return [];
      }

      const drops: DiscoveryDrop[] = [];
      const seenArtists = new Set(recentSearches.map((s) => s.toLowerCase()));

      // Get similar artists for recent searches
      for (const search of recentSearches.slice(0, 3)) {
        const result = yield* Effect.tryPromise({
          try: () => lastFm.getSimilarArtists(search, 5),
          catch: () => new ServiceError({ message: `Failed to get similar for ${search}` }),
        });

        for (const similar of result) {
          if (!seenArtists.has(similar.name.toLowerCase()) && drops.length < limit) {
            seenArtists.add(similar.name.toLowerCase());
            drops.push({
              category: 'close_match',
              artist: similar,
              reason: `Similar to ${search}`,
              similarity: similar.match,
            });
          }
        }
      }

      // Categorize: first 3 as close_match, next 3 as bridge_artist, rest as wildcard
      return drops.map((drop, i) => ({
        ...drop,
        category: i < 3 ? 'close_match' : i < 6 ? 'bridge_artist' : 'wildcard',
      }));
    }),
});
```

#### 2. Create WeeklyDropPanel Component

**File**: `src/components/WeeklyDropPanel.tsx` (new file)

```tsx
import { useEffect, useState } from 'react';
import { Sparkles, X, Users, Zap, Shuffle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiscoveryDrop, getRecentSearches, createDiscoveryService } from '@/services/discovery';
import { useLastFm } from '@/hooks/useLastFm';
import { cn } from '@/lib/utils';

interface WeeklyDropPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArtistClick: (name: string) => void;
}

const categoryConfig = {
  close_match: { icon: Users, label: 'Close Match', color: 'text-green-500' },
  bridge_artist: { icon: Zap, label: 'Bridge Artist', color: 'text-yellow-500' },
  wildcard: { icon: Shuffle, label: 'Wildcard', color: 'text-purple-500' },
};

export function WeeklyDropPanel({ open, onOpenChange, onArtistClick }: WeeklyDropPanelProps) {
  const [drops, setDrops] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(false);
  const { lastFmService } = useLastFm();

  useEffect(() => {
    if (open && drops.length === 0) {
      setLoading(true);
      const recentSearches = getRecentSearches();
      
      if (recentSearches.length > 0 && lastFmService) {
        const discoveryService = createDiscoveryService(lastFmService);
        // Run the Effect and get drops
        // Simplified: direct API calls in real implementation
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [open, drops.length, lastFmService]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 animate-slide-in-right">
      <GlassCard className="h-full rounded-none rounded-l-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Weekly Drops</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : drops.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Search for some artists first!</p>
            <p className="mt-1 text-sm">We'll recommend new discoveries based on your taste.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['close_match', 'bridge_artist', 'wildcard'] as const).map((category) => {
              const config = categoryConfig[category];
              const categoryDrops = drops.filter((d) => d.category === category);
              
              if (categoryDrops.length === 0) return null;

              return (
                <div key={category}>
                  <div className={cn('mb-2 flex items-center gap-2 text-sm font-medium', config.color)}>
                    <config.icon className="h-4 w-4" />
                    {config.label}
                  </div>
                  <div className="space-y-2">
                    {categoryDrops.map((drop) => (
                      <button
                        key={drop.artist.name}
                        onClick={() => onArtistClick(drop.artist.name)}
                        className="flex w-full items-center gap-3 rounded-lg bg-secondary/30 p-2 text-left transition-colors hover:bg-secondary/50"
                      >
                        <div className="h-10 w-10 rounded-md bg-secondary" />
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate text-sm font-medium">{drop.artist.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{drop.reason}</div>
                        </div>
                        {drop.similarity && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(drop.similarity * 100)}%
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
```

### Sub-Phase 4C: Bridge Artists & Comparison Mode

#### 1. Extend GraphService for Path Finding

**File**: `src/services/graph.ts`
**Changes**: Add path-finding method

```typescript
// Add to existing GraphService interface
export interface PathResult {
  path: string[];
  totalWeight: number;
}

// Add this function to the service
export function findPath(
  graphData: GraphData,
  source: string,
  target: string
): PathResult | null {
  // BFS to find shortest path
  const adjacency = new Map<string, { neighbor: string; weight: number }[]>();
  
  for (const edge of graphData.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ neighbor: edge.target, weight: edge.weight });
    adjacency.get(edge.target)!.push({ neighbor: edge.source, weight: edge.weight });
  }

  const queue: { node: string; path: string[]; weight: number }[] = [
    { node: source.toLowerCase(), path: [source], weight: 0 },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { node, path, weight } = queue.shift()!;
    
    if (node === target.toLowerCase()) {
      return { path, totalWeight: weight };
    }

    if (visited.has(node)) continue;
    visited.add(node);

    const neighbors = adjacency.get(node) || [];
    for (const { neighbor, weight: edgeWeight } of neighbors) {
      if (!visited.has(neighbor.toLowerCase())) {
        queue.push({
          node: neighbor.toLowerCase(),
          path: [...path, neighbor],
          weight: weight + edgeWeight,
        });
      }
    }
  }

  return null;
}
```

#### 2. Create BridgeCard Component

**File**: `src/components/BridgeCard.tsx` (new file)

```tsx
import { ArrowRight, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BridgeCardProps {
  sourceName: string;
  targetName: string;
  bridgeArtists: string[];
  onArtistClick: (name: string) => void;
  onClose: () => void;
}

export function BridgeCard({
  sourceName,
  targetName,
  bridgeArtists,
  onArtistClick,
  onClose,
}: BridgeCardProps) {
  return (
    <GlassCard className="w-80 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold">Bridge Artists</h3>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Connect <strong>{sourceName}</strong> to <strong>{targetName}</strong> through:
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{sourceName}</Badge>
        {bridgeArtists.map((artist, i) => (
          <div key={artist} className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onArtistClick(artist)}
            >
              {artist}
            </Button>
          </div>
        ))}
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline">{targetName}</Badge>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
        Close
      </Button>
    </GlassCard>
  );
}
```

### Success Criteria

#### Automated Verification
- [ ] Dialog component installed: file exists at `src/components/ui/dialog.tsx`
- [ ] TypeScript compiles: `bun run build`
- [ ] Linting passes: `bun run lint`
- [ ] Unit tests pass: `bun run test`
- [ ] E2E tests pass: `bun run test:e2e`

#### Manual Verification
- [ ] Share button opens ShareModal
- [ ] Copy Link copies URL with depth/threshold params to clipboard
- [ ] Export Image downloads PNG of graph
- [ ] Weekly Drops panel shows recommendations based on recent searches
- [ ] Recommendations are categorized (Close Match, Bridge Artist, Wildcard)
- [ ] Clicking a recommendation navigates to that artist's graph
- [ ] Path finding shows bridge artists between two selected nodes

**Implementation Note**: After completing this phase and all automated verification passes, pause for final manual testing and user acceptance.

---

## Testing Strategy

### Unit Tests

**New tests to add:**

1. **GlassCard/FloatingPanel** (`src/components/ui/glass-card.test.tsx`):
   - Renders children correctly
   - Applies custom className

2. **LensesTray** (`src/components/LensesTray.test.tsx`):
   - Slider controls update values
   - Zoom buttons call handlers

3. **useNodeAnimation** (`src/components/ForceGraph/hooks/useNodeAnimation.test.ts`):
   - Animates nodes with stagger delay
   - Respects enabled flag
   - Reset clears animation state

4. **ShareModal** (`src/components/ShareModal.test.tsx`):
   - Generates correct share URL with params
   - Copy button calls clipboard API

5. **Discovery Service** (`src/services/discovery.test.ts`):
   - Returns drops categorized correctly
   - Handles empty recent searches

### Integration Tests

**E2E scenarios to add** (`e2e/mockup-integration.spec.ts`):

1. **Full-screen layout**: Graph fills viewport, no fixed sidebar
2. **Panel interactions**: Click node → sheet opens, close sheet
3. **Controls work**: Adjust depth slider → graph updates
4. **Share flow**: Open share modal → copy link → verify URL
5. **Animation on load**: New graph animates nodes in

### Manual Testing Steps

1. Navigate to `/artist/Radiohead`
2. Verify graph fills screen with floating panels
3. Click a node → verify ArtistDetailSheet slides in from right
4. Adjust depth slider → verify graph updates
5. Click Share button → copy link → paste in new tab → verify graph state restored
6. Check dark mode → verify glassmorphism panels look correct
7. Check node animations on first load (bubble-in effect)

---

## Performance Considerations

1. **Animation Batching**: Bubble-in animation uses 30ms stagger to prevent jank with 100+ nodes
2. **Memoization**: All callbacks in MapView use `useCallback` to prevent unnecessary re-renders
3. **Sheet Lazy Loading**: ArtistDetailSheet only renders when `open={true}`
4. **Image Export**: Uses 2x resolution canvas for retina, but only on demand
5. **Weekly Drops**: Limits API calls to first 3 recent searches

---

## Migration Notes

1. **GraphControls Deprecation**: Old `GraphControls` component replaced by `LensesTray`
2. **ArtistPanel Deprecation**: Old `ArtistPanel` component replaced by `ArtistDetailSheet`
3. **MapView Breaking Change**: Complete layout rewrite - no backwards compatibility needed (internal component)
4. **CSS Variable Changes**: Color palette changes are backwards compatible (same variable names, different values)

---

## References

- Original research: `thoughts/shared/research/2025-12-27-mockup-integration-analysis.md`
- UI/UX research: `thoughts/shared/research/2025-12-21-ui-ux-graph-enhancements.md`
- Animation research: `thoughts/shared/research/2025-12-21-graph-animation-discovery-features.md`
- Component refactoring: `thoughts/shared/plans/2025-12-19-component-refactoring.md`
- ForceGraph hooks: `src/components/ForceGraph/hooks/`
- Current MapView: `src/pages/MapView.tsx:79-154`
- Current CSS variables: `src/index.css:6-100`
