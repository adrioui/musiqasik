import { ExternalLink, Music2, Users, Disc3, Tag } from 'lucide-react';
import { Artist } from '@/types/artist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArtistPanelProps {
  artist: Artist | null;
  similarArtists?: { name: string; weight: number }[];
  onArtistClick?: (name: string) => void;
  className?: string;
}

export function ArtistPanel({ artist, similarArtists = [], onArtistClick, className }: ArtistPanelProps) {
  if (!artist) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full text-center p-6", className)}>
        <Music2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No artist selected</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Search for an artist or click a node in the graph
        </p>
      </div>
    );
  }

  const formatNumber = (num?: number | null) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Artist Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {artist.image_url && !artist.image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
              <img
                src={artist.image_url}
                alt={artist.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                }}
              />
            ) : null}
            <Music2 className={cn(
              "h-10 w-10 text-primary/60 fallback-icon",
              artist.image_url && !artist.image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') && "hidden"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{artist.name}</h2>
            {artist.lastfm_url && (
              <a
                href={artist.lastfm_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                View on Last.fm
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Listeners</p>
              <p className="font-semibold">{formatNumber(artist.listeners)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
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
            <div className="flex items-center gap-2 mb-2">
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
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Similar Artists ({similarArtists.length})
        </h3>
        <div className="space-y-2">
          {similarArtists.slice(0, 15).map((similar) => (
            <button
              key={similar.name}
              onClick={() => onArtistClick?.(similar.name)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary transition-colors text-left"
            >
              <span className="font-medium truncate">{similar.name}</span>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {Math.round(similar.weight * 100)}% match
              </span>
            </button>
          ))}
          {similarArtists.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No similar artists found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}