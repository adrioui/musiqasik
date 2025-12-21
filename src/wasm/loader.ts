// Extend Window interface for WASM debugging properties
declare global {
  interface Window {
    __WASM_MODULE__?: typeof import('@/wasm/pkg');
    __WASM_LOADED__?: boolean;
  }
}

// Lazy-loaded WASM module
let wasmModule: typeof import('@/wasm/pkg') | null = null;
let wasmLoadPromise: Promise<typeof import('@/wasm/pkg')> | null = null;
let wasmLoadError: Error | null = null;

/**
 * Initialize the WASM module.
 * Safe to call multiple times - will only load once.
 */
export async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmLoadError) return false;

  if (!wasmLoadPromise) {
    wasmLoadPromise = (async () => {
      try {
        const wasm = await import('@/wasm/pkg');
        // The default export is the WASM initialization function that loads the binary
        // This must be called before any other exports can be used
        await wasm.default();
        wasmModule = wasm;

        // Expose for debugging
        if (import.meta.env.VITE_WASM_DEBUG === 'true') {
          window.__WASM_MODULE__ = wasm;
          window.__WASM_LOADED__ = true;
          console.log(`[WASM] Loaded graph-wasm v${wasm.get_version()}`);
        }

        return wasm;
      } catch (error) {
        wasmLoadError = error instanceof Error ? error : new Error(String(error));
        console.error('[WASM] Failed to load:', wasmLoadError);
        throw wasmLoadError;
      }
    })();
  }

  try {
    await wasmLoadPromise;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the loaded WASM module.
 * Returns null if not loaded or failed to load.
 */
export function getWasmModule(): typeof import('@/wasm/pkg') | null {
  return wasmModule;
}

/**
 * Check if WASM is available and loaded.
 */
export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Get WASM load error if any.
 */
export function getWasmError(): Error | null {
  return wasmLoadError;
}

/**
 * Reset the WASM module state.
 * Primarily used for testing purposes.
 */
export function resetWasmState(): void {
  wasmModule = null;
  wasmLoadPromise = null;
  wasmLoadError = null;
  if (typeof window !== 'undefined') {
    delete window.__WASM_MODULE__;
    delete window.__WASM_LOADED__;
  }
}
