-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create artists table for caching Last.fm artist data
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lastfm_mbid TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  listeners INTEGER,
  playcount INTEGER,
  tags TEXT[],
  lastfm_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Create similarity_edges table for artist relationships
CREATE TABLE public.similarity_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  target_artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  match_score DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  depth INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_artist_id, target_artist_id)
);

-- Enable Row Level Security (public read access for guest users)
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similarity_edges ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (guest-only app)
CREATE POLICY "Artists are publicly readable" 
ON public.artists 
FOR SELECT 
USING (true);

CREATE POLICY "Similarity edges are publicly readable" 
ON public.similarity_edges 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_artists_name ON public.artists USING btree (lower(name));
CREATE INDEX idx_artists_name_trgm ON public.artists USING gin (name gin_trgm_ops);
CREATE INDEX idx_similarity_source ON public.similarity_edges (source_artist_id);
CREATE INDEX idx_similarity_target ON public.similarity_edges (target_artist_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_artists_updated_at
BEFORE UPDATE ON public.artists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();