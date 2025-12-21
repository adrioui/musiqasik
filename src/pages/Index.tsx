import { useNavigate } from 'react-router-dom';
import { Music2, GitBranch, Zap, Database } from 'lucide-react';
import { ArtistSearch } from '@/components/ArtistSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Artist } from '@/types/artist';

export default function Index() {
  const navigate = useNavigate();

  const handleArtistSelect = (artist: Artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="w-full px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Music2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">MusiqasiQ</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
        <div className="animate-fade-in mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
            Explore Artist
            <span className="text-primary"> Connections</span>
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-xl text-muted-foreground">
            Discover how your favorite artists are connected through an interactive similarity map
            powered by Last.fm
          </p>

          {/* Search */}
          <div className="mx-auto mb-16 w-full max-w-xl">
            <ArtistSearch onSelect={handleArtistSelect} />
          </div>

          {/* Features */}
          <div className="grid gap-6 text-left md:grid-cols-3">
            <div
              className="animate-slide-up rounded-2xl border border-border bg-card p-6"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Visual Connections</h3>
              <p className="text-sm text-muted-foreground">
                Explore artist relationships through an interactive force-directed graph
              </p>
            </div>

            <div
              className="animate-slide-up rounded-2xl border border-border bg-card p-6"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-semibold">Configurable Depth</h3>
              <p className="text-sm text-muted-foreground">
                Adjust the graph depth from 1-3 hops to discover more connections
              </p>
            </div>

            <div
              className="animate-slide-up rounded-2xl border border-border bg-card p-6"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Smart Caching</h3>
              <p className="text-sm text-muted-foreground">
                Data is cached for instant loading on subsequent searches
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
          Powered by Last.fm
        </div>
      </footer>
    </div>
  );
}
