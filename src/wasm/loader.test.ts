import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the WASM module for unit tests
vi.mock('@/wasm/pkg', () => ({
  default: undefined,
  init: vi.fn().mockResolvedValue(undefined),
  get_version: vi.fn().mockReturnValue('0.1.0'),
  health_check: vi.fn().mockReturnValue(true),
  benchmark_sum: vi.fn().mockReturnValue(BigInt(5050)),
  benchmark_normalize: vi.fn().mockReturnValue('test'),
  benchmark_batch_normalize: vi.fn().mockReturnValue(['a', 'b', 'c']),
}));

describe('WASM Loader', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clean up window properties
    if (typeof window !== 'undefined') {
      delete window.__WASM_MODULE__;
      delete window.__WASM_LOADED__;
    }
  });

  it('should initialize WASM module', async () => {
    const { initWasm, isWasmLoaded } = await import('@/wasm/loader');

    const result = await initWasm();

    expect(result).toBe(true);
    expect(isWasmLoaded()).toBe(true);
  });

  it('should return cached module on subsequent calls', async () => {
    const { initWasm } = await import('@/wasm/loader');

    const result1 = await initWasm();
    const result2 = await initWasm();

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('should return the WASM module after initialization', async () => {
    const { initWasm, getWasmModule } = await import('@/wasm/loader');

    expect(getWasmModule()).toBeNull();

    await initWasm();

    const module = getWasmModule();
    expect(module).not.toBeNull();
    expect(module?.get_version()).toBe('0.1.0');
    expect(module?.health_check()).toBe(true);
  });

  it('should expose module for debugging when enabled', async () => {
    vi.stubEnv('VITE_WASM_DEBUG', 'true');

    const { initWasm } = await import('@/wasm/loader');
    await initWasm();

    expect(window.__WASM_LOADED__).toBe(true);
    expect(window.__WASM_MODULE__).toBeDefined();
  });

  it('should not expose module when debug is disabled', async () => {
    vi.stubEnv('VITE_WASM_DEBUG', 'false');

    const { initWasm } = await import('@/wasm/loader');
    await initWasm();

    expect(window.__WASM_LOADED__).toBeUndefined();
    expect(window.__WASM_MODULE__).toBeUndefined();
  });

  it('should reset state correctly', async () => {
    const { initWasm, isWasmLoaded, getWasmModule, resetWasmState } = await import('@/wasm/loader');

    await initWasm();
    expect(isWasmLoaded()).toBe(true);
    expect(getWasmModule()).not.toBeNull();

    resetWasmState();

    expect(isWasmLoaded()).toBe(false);
    expect(getWasmModule()).toBeNull();
  });

  it('should return null error when no error occurred', async () => {
    const { initWasm, getWasmError } = await import('@/wasm/loader');

    await initWasm();

    expect(getWasmError()).toBeNull();
  });
});

describe('WASM Loader - Error Handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should handle initialization errors', async () => {
    // Mock a failing WASM import
    vi.doMock('@/wasm/pkg', () => ({
      init: vi.fn().mockRejectedValue(new Error('WASM load failed')),
    }));

    const { initWasm, isWasmLoaded, getWasmError } = await import('@/wasm/loader');

    const result = await initWasm();

    expect(result).toBe(false);
    expect(isWasmLoaded()).toBe(false);
    expect(getWasmError()).toBeInstanceOf(Error);
    expect(getWasmError()?.message).toContain('WASM load failed');
  });

  it('should return false on subsequent calls after error', async () => {
    vi.doMock('@/wasm/pkg', () => ({
      init: vi.fn().mockRejectedValue(new Error('WASM load failed')),
    }));

    const { initWasm } = await import('@/wasm/loader');

    const result1 = await initWasm();
    const result2 = await initWasm();

    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });
});
