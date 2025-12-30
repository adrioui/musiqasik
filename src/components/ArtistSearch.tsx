import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useLastFm } from "@/hooks/useLastFm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn, formatNumber } from "@/lib/utils";
import type { Artist } from "@/types/artist";

interface ArtistSearchProps {
  onSelect: (artist: Artist) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ArtistSearch({
  onSelect,
  className,
  placeholder = "Search for an artist...",
  autoFocus = false,
}: ArtistSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showRecent, setShowRecent] = useState(false);
  const { searchArtists, isLoading } = useLastFm();
  const [recentSearches, setRecentSearches] = useLocalStorage<Artist[]>(
    "musiqasiq-recent-searches",
    [],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const handler = setTimeout(async () => {
      if (query.trim().length >= 2) {
        try {
          const searchResults = await searchArtists(
            query,
            abortController.signal,
          );
          if (!abortController.signal.aborted) {
            setResults(searchResults);
            setIsOpen(true);
            setSelectedIndex(-1);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            console.error("Search failed:", error);
          }
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
      abortController.abort();
    };
  }, [query, searchArtists]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (artist: Artist) => {
    // Add to recent searches (max 5, no duplicates)
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (a) => a.name.toLowerCase() !== artist.name.toLowerCase(),
      );
      return [artist, ...filtered].slice(0, 5);
    });

    setQuery("");
    setResults([]);
    setIsOpen(false);
    setShowRecent(false);
    onSelect(artist);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full max-w-xl", className)}
    >
      <div className="relative">
        <MaterialIcon
          name="search"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            } else if (query.trim() === "" && recentSearches.length > 0) {
              setShowRecent(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on recent items
            setTimeout(() => setShowRecent(false), 200);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-14 rounded-2xl border-2 border-border bg-card pl-12 pr-12 text-lg shadow-sm transition-all duration-200 focus:border-primary focus:shadow-lg"
        />
        {isLoading && (
          <MaterialIcon
            name="progress_activity"
            size="sm"
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
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
                    "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors",
                    index === selectedIndex
                      ? "bg-secondary"
                      : "hover:bg-secondary/50",
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
                      <MaterialIcon
                        name="graphic_eq"
                        size="lg"
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    {artist.listeners && (
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(artist.listeners, "listeners")}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showRecent &&
        query.trim() === "" &&
        recentSearches.length > 0 &&
        !isOpen && (
          <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <MaterialIcon
                name="schedule"
                size="xs"
                className="text-muted-foreground"
              />
              <span className="text-sm font-medium text-muted-foreground">
                Recent Searches
              </span>
            </div>
            <ul className="py-2">
              {recentSearches.map((artist) => (
                <li key={artist.name}>
                  <button
                    onClick={() => handleSelect(artist)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MaterialIcon
                          name="graphic_eq"
                          size="lg"
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{artist.name}</p>
                      {artist.listeners && (
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(artist.listeners, "listeners")}
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
