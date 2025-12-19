import { ExternalLink, Music2, Users, Disc3, Tag } from 'lucide-react';
import { Artist } from '@/types/artist';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber } from '@/lib/utils';

interface ArtistPanelProps {
  artist: Artist | null;
  similarArtists?: { name: string; weight: number }[];
  onArtistClick?: (name: string) => void;
  className?: string;
}

export function ArtistPanel({
  artist,
  similarArtists = [],
  onArtistClick,
  className,
}: ArtistPanelProps) {
  if (!artist) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center p-6 text-center',
          className
        )}
      >
        <Music2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <h3 className="text-lg font-medium text-muted-foreground">No artist selected</h3>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Search for an artist or click a node in the graph
        </p>
      </div>
    );
  }



  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      {/* Artist Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            {artist.image_url && !artist.image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
              <img
                src={artist.image_url}
                alt={artist.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement
                    ?.querySelector('.fallback-icon')
                    ?.classList.remove('hidden');
                }}
              />
            ) : null}
            <Music2
              className={cn(
                'fallback-icon h-10 w-10 text-primary/60',
                artist.image_url &&
                  !artist.image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') &&
                  'hidden'
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{artist.name}</h2>
            {artist.lastfm_url && (
              <a
                href={artist.lastfm_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on Last.fm
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Listeners</p>
              <p className="font-semibold">{formatNumber(artist.listeners)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <Disc3 className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Plays</p>
              <p className="font-semibold">{formatNumber(artist.playcount)}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {artist.tags && artist.tags.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Genres</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {artist.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Similar Artists */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Similar Artists ({similarArtists.length})
        </h3>
        <div className="space-y-2">
          {similarArtists.slice(0, 15).map((similar) => (
            <button
              key={similar.name}
              onClick={() => onArtistClick?.(similar.name)}
              className="flex w-full items-center justify-between rounded-lg bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary"
            >
              <span className="truncate font-medium">{similar.name}</span>
              <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                {Math.round(similar.weight * 100)}% match
              </span>
            </button>
          ))}
          {similarArtists.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No similar artists found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
