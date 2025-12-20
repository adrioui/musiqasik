import { useState, useEffect, useRef } from 'react';
import { initWasm, isWasmLoaded, getWasmError } from '@/wasm/loader';

interface WasmFeatureState {
  enabled: boolean;
  loaded: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check WASM feature availability.
 * Automatically initializes WASM if enabled via env var.
 */
export function useWasmFeature(): WasmFeatureState {
  const enabled = import.meta.env.VITE_USE_WASM_GRAPH === 'true';
  const initAttempted = useRef(false);

  const [state, setState] = useState<WasmFeatureState>({
    enabled,
    loaded: isWasmLoaded(),
    loading: false,
    error: getWasmError(),
  });

  useEffect(() => {
    // Only attempt init once, and only if enabled and not already loaded
    if (!enabled || state.loaded || initAttempted.current) return;
    initAttempted.current = true;

    setState((s) => ({ ...s, loading: true }));

    initWasm()
      .then((success) => {
        setState({
          enabled,
          loaded: success,
          loading: false,
          error: success ? null : getWasmError(),
        });
      })
      .catch((error) => {
        setState({
          enabled,
          loaded: false,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  }, [enabled, state.loaded]);

  return state;
}
