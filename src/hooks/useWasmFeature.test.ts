import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Use vi.hoisted to hoist the mock functions so they can be referenced in vi.mock
const { mockInitWasm, mockIsWasmLoaded, mockGetWasmError } = vi.hoisted(() => ({
  mockInitWasm: vi.fn(),
  mockIsWasmLoaded: vi.fn(),
  mockGetWasmError: vi.fn(),
}));

vi.mock('@/wasm/loader', () => ({
  initWasm: mockInitWasm,
  isWasmLoaded: mockIsWasmLoaded,
  getWasmError: mockGetWasmError,
}));

import { useWasmFeature } from './useWasmFeature';

describe('useWasmFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockIsWasmLoaded.mockReturnValue(false);
    mockGetWasmError.mockReturnValue(null);
    mockInitWasm.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return disabled when env var is false', () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'false');

    const { result } = renderHook(() => useWasmFeature());

    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not call initWasm when disabled', () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'false');

    renderHook(() => useWasmFeature());

    expect(mockInitWasm).not.toHaveBeenCalled();
  });

  it('should load WASM when enabled', async () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');

    const { result } = renderHook(() => useWasmFeature());

    expect(result.current.enabled).toBe(true);

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockInitWasm).toHaveBeenCalledTimes(1);
  });

  it('should show loading state while initializing', async () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');

    // Create a promise we can control
    let resolveInit: (value: boolean) => void;
    mockInitWasm.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInit = resolve;
        })
    );

    const { result } = renderHook(() => useWasmFeature());

    // Wait for the loading state to be set
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the init promise
    resolveInit!(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.loaded).toBe(true);
    });
  });

  it('should handle errors when WASM fails to load', async () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');

    const testError = new Error('Failed to load WASM');
    mockGetWasmError.mockReturnValue(testError);
    mockInitWasm.mockResolvedValue(false);

    const { result } = renderHook(() => useWasmFeature());

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.loaded).toBe(false);
      expect(result.current.error).toEqual(testError);
    });

    expect(result.current.enabled).toBe(true);
  });

  it('should not attempt to load when already loaded', () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');
    mockIsWasmLoaded.mockReturnValue(true);

    const { result } = renderHook(() => useWasmFeature());

    expect(result.current.loaded).toBe(true);
    expect(result.current.loading).toBe(false);

    // initWasm should not be called since we're already loaded
    expect(mockInitWasm).not.toHaveBeenCalled();
  });

  it('should handle rejection from initWasm', async () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');

    const testError = new Error('Initialization rejected');
    mockInitWasm.mockRejectedValue(testError);

    const { result } = renderHook(() => useWasmFeature());

    // Wait for the hook to finish loading after rejection
    await waitFor(() => {
      expect(result.current.loaded).toBe(false);
      expect(result.current.error).toEqual(testError);
    });

    expect(result.current.enabled).toBe(true);
  });
});
