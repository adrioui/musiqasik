export interface Artist {
  id?: string;
  name: string;
  lastfm_mbid?: string | null;
  image_url?: string | null;
  listeners?: number | null;
  playcount?: number | null;
  tags?: string[] | null;
  lastfm_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SimilarityEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: Artist[];
  edges: SimilarityEdge[];
  center: Artist | null;
}

export interface GraphNode extends Artist {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  isCenter?: boolean;
}

export interface GraphLink {
  source: GraphNode | string;
  target: GraphNode | string;
  weight: number;
}