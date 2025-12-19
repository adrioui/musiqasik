export interface Artist {
  id?: string;
  name: string;
  lastfm_mbid?: string;
  image_url?: string;
  listeners?: number;
  playcount?: number;
  tags?: string[];
  lastfm_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SimilarityEdge {
  id?: string;
  in: string;
  out: string;
  match_score: number;
  depth: number;
  created_at?: string;
}

export interface GraphData {
  nodes: Artist[];
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
  center: Artist | null;
}

export type RecordId<T extends string> = `${T}:${string}`;
export type ArtistId = RecordId<'artists'>;
