declare module '*.wasm' {
  const content: WebAssembly.Module;
  export default content;
}

declare module '*.wasm?init' {
  const initWasm: (imports?: WebAssembly.Imports) => Promise<WebAssembly.Instance>;
  export default initWasm;
}

// Type declarations for graph-wasm module
declare module '@/wasm/pkg' {
  // Default export is the WASM initialization function
  const initWasm: () => Promise<void>;
  export default initWasm;

  // Named exports are only available after calling the default export
  export function init(): void;
  export function get_version(): string;
  export function health_check(): boolean;
  export function benchmark_sum(n: number): bigint;
  export function benchmark_normalize(input: string): string;
  export function benchmark_batch_normalize(inputs: string[]): string[];

  // Graph processing functions
  export function process_graph_data(
    nodes: unknown,
    edges: unknown,
    centerArtist: string | null | undefined,
    threshold: number
  ): ProcessedGraph;

  export function resolve_links(
    nodes: unknown,
    links: unknown
  ): ResolvedLink[];

  export function process_and_resolve_graph(
    nodes: unknown,
    edges: unknown,
    centerArtist: string | null | undefined,
    threshold: number
  ): ResolvedGraph;

  // Graph data types
  export interface ProcessedGraph {
    nodes: GraphNode[];
    links: GraphLink[];
  }

  export interface ResolvedGraph {
    nodes: GraphNode[];
    links: ResolvedLink[];
  }

  export interface GraphNode {
    id?: string;
    name: string;
    lastfm_mbid?: string;
    url?: string;
    image_url?: string;
    listeners?: number;
    playcount?: number;
    tags?: string[];
    lastfm_url?: string;
    isCenter: boolean;
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
  }

  export interface GraphLink {
    source: string;
    target: string;
    weight: number;
  }

  export interface ResolvedLink {
    source: number;
    target: number;
    weight: number;
  }
}
