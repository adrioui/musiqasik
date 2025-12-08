-- Add composite index for BFS queries optimization
-- This index improves performance when querying similarity_edges by source_artist_id and depth
-- which is the primary access pattern in getSimilarityGraph()

CREATE INDEX IF NOT EXISTS idx_similarity_source_depth 
ON public.similarity_edges (source_artist_id, depth);

-- Note: The existing idx_similarity_source index on (source_artist_id) alone
-- is still useful for queries that don't filter by depth, so we keep both.
