import { useNavigate } from 'react-router-dom';
import { Music2, GitBranch, Zap, Database } from 'lucide-react';
import { ArtistSearch } from '@/components/ArtistSearch';
import { Artist } from '@/types/artist';

export default function Index() {
  const navigate = useNavigate();

  const handleArtistSelect = (artist: Artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Music2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">MusicGraph</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Explore Artist
            <span className="text-primary"> Connections</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
            Discover how your favorite artists are connected through an interactive similarity map powered by Last.fm
          </p>

          {/* Search */}
          <div className="w-full max-w-xl mx-auto mb-16">
            <ArtistSearch onSelect={handleArtistSelect} />
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Visual Connections</h3>
              <p className="text-sm text-muted-foreground">
                Explore artist relationships through an interactive force-directed graph
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Configurable Depth</h3>
              <p className="text-sm text-muted-foreground">
                Adjust the graph depth from 1-3 hops to discover more connections
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Caching</h3>
              <p className="text-sm text-muted-foreground">
                Data is cached for instant loading on subsequent searches
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          Powered by Last.fm • Built with Lovable
        </div>
      </footer>
    </div>
  );
}