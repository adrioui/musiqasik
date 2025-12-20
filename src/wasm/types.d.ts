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
}
