import { MaterialIcon } from '@/components/ui/material-icon';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

function formatListeners(count: number | undefined | null): string {
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
            {artist.lastfm_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={artist.lastfm_url} target="_blank" rel="noopener noreferrer">
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
