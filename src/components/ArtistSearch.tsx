import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Music2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Artist } from '@/types/artist';
import { useLastFm } from '@/hooks/useLastFm';
import { cn } from '@/lib/utils';

interface ArtistSearchProps {
  onSelect: (artist: Artist) => void;
  className?: string;
  placeholder?: string;
}

export function ArtistSearch({
  onSelect,
  className,
  placeholder = 'Search for an artist...',
}: ArtistSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { searchArtists, isLoading } = useLastFm();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length >= 2) {
        const searchResults = await searchArtists(query);
        setResults(searchResults);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, searchArtists]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (artist: Artist) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(artist);
  };

  const formatListeners = (listeners?: number | null) => {
    if (!listeners) return '';
    if (listeners >= 1000000) {
      return `${(listeners / 1000000).toFixed(1)}M listeners`;
    }
    if (listeners >= 1000) {
      return `${(listeners / 1000).toFixed(0)}K listeners`;
    }
    return `${listeners} listeners`;
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-xl', className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="h-14 rounded-2xl border-2 border-border bg-card pl-12 pr-12 text-lg shadow-sm transition-all duration-200 focus:border-primary focus:shadow-lg"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <ul className="py-2">
            {results.map((artist, index) => (
              <li key={artist.name}>
                <button
                  onClick={() => handleSelect(artist)}
                  className={cn(
                    'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
                    index === selectedIndex ? 'bg-secondary' : 'hover:bg-secondary/50'
                  )}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {artist.image_url ? (
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Music2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    {artist.listeners && (
                      <p className="text-sm text-muted-foreground">
                        {formatListeners(artist.listeners)}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
