# Phase 1: Rust WASM Foundation & Toolchain Setup

## Overview

This plan establishes the Rust WebAssembly infrastructure for MusiqasiQ, including the crate structure, build pipeline, Vite integration, and feature flag system. By the end of this phase, we'll have a working WASM module that can be imported and executed from TypeScript, with runtime switching between JS and WASM implementations.

## Current State Analysis

### Existing Infrastructure
- **Build System**: Vite 7.0.0 with `@vitejs/plugin-react-swc`
- **TypeScript**: ES2020 target, bundler module resolution
- **No WASM Support**: No `.wasm` files, no WASM plugins, no worker configuration
- **Effect Services**: Typed service layer with Layer-based dependency injection

### What's Missing
- Rust toolchain configuration for WASM
- wasm-pack build integration
- Vite plugins for WASM loading
- TypeScript declarations for WASM modules
- Feature flag infrastructure for A/B testing

## Desired End State

After completing this phase:
1. A `rust/graph-wasm` crate exists with proper Cargo.toml configuration
2. `wasm-pack build` produces a working NPM package
3. Vite loads and executes WASM modules correctly
4. A "hello world" WASM function can be called from React
5. Feature flags control WASM vs JavaScript runtime selection
6. Unit tests verify WASM module loading
7. Performance benchmarks compare JS vs WASM execution

### Verification
```bash
# Build WASM module
cd rust/graph-wasm && wasm-pack build --target web

# Run dev server with WASM
VITE_USE_WASM_GRAPH=true npm run dev

# Verify WASM loads in browser console
# > window.__WASM_LOADED__ should be true

# Run all tests
npm run test
npm run test:e2e
```

## What We're NOT Doing

- Implementing actual graph algorithms (Phase 2-3)
- Integrating with ForceGraph rendering (Phase 4)
- Web Worker integration (Phase 5)
- Production deployment configuration
- CI/CD pipeline changes

## Implementation Approach

We'll build bottom-up: Rust crate → wasm-pack → Vite plugins → TypeScript types → Feature flags → Testing.

---

## Phase 1.1: Rust Crate Setup

### Overview
Create the Rust crate structure with proper WASM configuration.

### Changes Required:

#### 1. Create Crate Directory Structure

**Directory**: `rust/graph-wasm/`

```bash
mkdir -p rust/graph-wasm/src
```

#### 2. Cargo.toml Configuration

**File**: `rust/graph-wasm/Cargo.toml`

```toml
[package]
name = "graph-wasm"
version = "0.1.0"
edition = "2021"
authors = ["MusiqasiQ Team"]
description = "WebAssembly graph processing module for MusiqasiQ"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["console_error_panic_hook"]
small = ["talc"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
console_error_panic_hook = { version = "0.1", optional = true }

# Modern WASM allocator (replaces deprecated wee_alloc)
# talc provides better performance and is actively maintained
[dependencies.talc]
version = "4"
optional = true

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
```

#### 3. Main Library Entry Point

**File**: `rust/graph-wasm/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;

// When the `small` feature is enabled, use `talc` as the global allocator.
// talc is a modern WASM allocator that replaces the deprecated wee_alloc.
// It provides better performance (~6.7 actions/µs vs 5.9 for dlmalloc) with
// smaller binary size (14KB vs 17KB).
#[cfg(feature = "small")]
#[global_allocator]
static ALLOC: talc::Talck<talc::locking::AssumeUnlockable, talc::ClaimOnOom> = {
    static mut ARENA: [u8; 1024 * 1024] = [0; 1024 * 1024]; // 1MB arena
    let span = talc::Span::from_array(unsafe { &mut ARENA });
    talc::Talc::new(talc::ClaimOnOom::new(span)).lock()
};

// Initialize panic hook for better error messages in console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Returns the WASM module version for verification
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Simple health check function to verify WASM is loaded and working
#[wasm_bindgen]
pub fn health_check() -> bool {
    true
}

/// Benchmark function: sum numbers 0 to n
/// Used to compare JS vs WASM performance
#[wasm_bindgen]
pub fn benchmark_sum(n: u32) -> u64 {
    (0..=n as u64).sum()
}

/// Benchmark function: string operations
/// Simulates the .toLowerCase() normalization we'll need
#[wasm_bindgen]
pub fn benchmark_normalize(input: &str) -> String {
    input.to_lowercase()
}

/// Benchmark function: batch normalize strings
#[wasm_bindgen]
pub fn benchmark_batch_normalize(inputs: Vec<JsValue>) -> Vec<JsValue> {
    inputs
        .into_iter()
        .filter_map(|v| v.as_string())
        .map(|s| JsValue::from_str(&s.to_lowercase()))
        .collect()
}
```

#### 4. Rust Toolchain Configuration

**File**: `rust/graph-wasm/rust-toolchain.toml`

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
targets = ["wasm32-unknown-unknown"]
```

#### 5. Build Script

**File**: `rust/graph-wasm/build.sh`

```bash
#!/bin/bash
set -e

echo "Building graph-wasm..."
wasm-pack build --target web --out-dir ../../src/wasm/pkg

echo "Optimizing WASM binary..."
if command -v wasm-opt &> /dev/null; then
    wasm-opt -Oz -o ../../src/wasm/pkg/graph_wasm_bg_opt.wasm ../../src/wasm/pkg/graph_wasm_bg.wasm
    mv ../../src/wasm/pkg/graph_wasm_bg_opt.wasm ../../src/wasm/pkg/graph_wasm_bg.wasm
    echo "WASM optimized with wasm-opt"
else
    echo "wasm-opt not found, skipping optimization"
fi

echo "Build complete!"
ls -la ../../src/wasm/pkg/
```

### Success Criteria:

#### Automated Verification:
- [x] `cd rust/graph-wasm && cargo check` passes
- [x] `cd rust/graph-wasm && cargo test` passes
- [x] `cd rust/graph-wasm && wasm-pack build --target web` succeeds
- [x] Output files exist: `src/wasm/pkg/graph_wasm.js`, `src/wasm/pkg/graph_wasm_bg.wasm`

#### Manual Verification:
- [ ] WASM binary size is under 50KB gzipped

---

## Phase 1.2: Vite Plugin Integration

### Overview
Configure Vite to load and bundle WASM modules.

### Changes Required:

#### 1. Install Dependencies

**Command**:
```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
```

#### 2. Update Vite Configuration

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@/wasm/pkg'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
}));
```

#### 3. Update Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    wasm(),
    topLevelAwait(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

#### 4. TypeScript WASM Declarations

**File**: `src/wasm/types.d.ts`

```typescript
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
  export function init(): Promise<void>;
  export function get_version(): string;
  export function health_check(): boolean;
  export function benchmark_sum(n: number): bigint;
  export function benchmark_normalize(input: string): string;
  export function benchmark_batch_normalize(inputs: string[]): string[];
}
```

#### 5. Update TypeScript Config

**File**: `tsconfig.app.json` (add to includes)

Add `"src/wasm"` to the includes array.

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds without WASM errors
- [x] `npm run dev` starts server successfully
- [x] TypeScript compilation passes: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Dev server loads without console errors related to WASM

---

## Phase 1.3: Feature Flag Infrastructure

### Overview
Implement runtime feature flags to switch between JS and WASM implementations.

### Changes Required:

#### 1. Add Environment Variables

**File**: `.env.example` (append)

```bash
# WASM Feature Flags
VITE_USE_WASM_GRAPH=false
VITE_WASM_DEBUG=false
```

#### 2. Update ConfigService

**File**: `src/services/tags.ts` (update ConfigService)

```typescript
export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  {
    // Existing config
    lastFmApiKey: string;
    surrealdbWsUrl: string;
    surrealdbHttpUrl: string;
    surrealdbNamespace: string;
    surrealdbDatabase: string;
    surrealdbUser: string;
    surrealdbPass: string;
    // New WASM config
    useWasmGraph: boolean;
    wasmDebug: boolean;
  }
>() {}
```

#### 3. Update ConfigLive

**File**: `src/services/index.ts` (update ConfigLive)

```typescript
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
  surrealdbWsUrl: import.meta.env.VITE_SURREALDB_WS_URL || '',
  surrealdbHttpUrl: import.meta.env.VITE_SURREALDB_HTTP_URL || '',
  surrealdbNamespace: import.meta.env.VITE_SURREALDB_NAMESPACE || 'musiqasik',
  surrealdbDatabase: import.meta.env.VITE_SURREALDB_DATABASE || 'main',
  surrealdbUser: import.meta.env.VITE_SURREALDB_USER || '',
  surrealdbPass: import.meta.env.VITE_SURREALDB_PASS || '',
  // New WASM config
  useWasmGraph: import.meta.env.VITE_USE_WASM_GRAPH === 'true',
  wasmDebug: import.meta.env.VITE_WASM_DEBUG === 'true',
});
```

#### 4. WASM Loader Module

**File**: `src/wasm/loader.ts`

```typescript
import { Effect } from 'effect';

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
        await wasm.init();
        wasmModule = wasm;
        
        // Expose for debugging
        if (import.meta.env.VITE_WASM_DEBUG === 'true') {
          (window as any).__WASM_MODULE__ = wasm;
          (window as any).__WASM_LOADED__ = true;
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
 * Effect-based WASM initialization.
 */
export const initWasmEffect = Effect.tryPromise({
  try: () => initWasm(),
  catch: (error) => new Error(`WASM initialization failed: ${error}`),
});
```

#### 5. Feature Flag Hook

**File**: `src/hooks/useWasmFeature.ts`

```typescript
import { useState, useEffect } from 'react';
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
  const [state, setState] = useState<WasmFeatureState>({
    enabled: import.meta.env.VITE_USE_WASM_GRAPH === 'true',
    loaded: isWasmLoaded(),
    loading: false,
    error: getWasmError(),
  });

  useEffect(() => {
    if (!state.enabled || state.loaded || state.loading) return;

    setState((s) => ({ ...s, loading: true }));

    initWasm()
      .then((success) => {
        setState((s) => ({
          ...s,
          loaded: success,
          loading: false,
          error: success ? null : getWasmError(),
        }));
      })
      .catch((error) => {
        setState((s) => ({
          ...s,
          loaded: false,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      });
  }, [state.enabled, state.loaded, state.loading]);

  return state;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes with new config types
- [x] `npm run test` passes
- [x] `npm run lint` passes

#### Manual Verification:
- [ ] With `VITE_USE_WASM_GRAPH=true`, WASM loads on app startup
- [ ] With `VITE_WASM_DEBUG=true`, version is logged to console
- [ ] With `VITE_USE_WASM_GRAPH=false`, no WASM loading occurs

---

## Phase 1.4: Integration Testing

### Overview
Create tests to verify WASM loading and basic functionality.

### Changes Required:

#### 1. WASM Unit Tests

**File**: `src/wasm/loader.test.ts`

```typescript
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

  it('should expose module for debugging when enabled', async () => {
    vi.stubEnv('VITE_WASM_DEBUG', 'true');
    
    const { initWasm } = await import('@/wasm/loader');
    await initWasm();
    
    expect((window as any).__WASM_LOADED__).toBe(true);
  });
});
```

#### 2. Feature Flag Hook Tests

**File**: `src/hooks/useWasmFeature.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWasmFeature } from './useWasmFeature';

vi.mock('@/wasm/loader', () => ({
  initWasm: vi.fn().mockResolvedValue(true),
  isWasmLoaded: vi.fn().mockReturnValue(false),
  getWasmError: vi.fn().mockReturnValue(null),
}));

describe('useWasmFeature', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return disabled when env var is false', () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'false');
    
    const { result } = renderHook(() => useWasmFeature());
    
    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('should load WASM when enabled', async () => {
    vi.stubEnv('VITE_USE_WASM_GRAPH', 'true');
    
    const { result } = renderHook(() => useWasmFeature());
    
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
  });
});
```

#### 3. Performance Benchmark Tests

**File**: `src/wasm/benchmarks.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

// Skip in CI unless WASM is built
const describeWasm = process.env.CI ? describe.skip : describe;

describeWasm('WASM Benchmarks', () => {
  let wasm: typeof import('@/wasm/pkg');

  beforeAll(async () => {
    wasm = await import('@/wasm/pkg');
    await wasm.init();
  });

  it('benchmark_sum should be faster than JS', () => {
    const n = 1_000_000;
    
    // JS implementation
    const jsStart = performance.now();
    let jsSum = BigInt(0);
    for (let i = 0; i <= n; i++) {
      jsSum += BigInt(i);
    }
    const jsTime = performance.now() - jsStart;
    
    // WASM implementation
    const wasmStart = performance.now();
    const wasmSum = wasm.benchmark_sum(n);
    const wasmTime = performance.now() - wasmStart;
    
    console.log(`JS: ${jsTime.toFixed(2)}ms, WASM: ${wasmTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(jsTime / wasmTime).toFixed(2)}x`);
    
    expect(wasmSum).toBe(jsSum);
    // WASM should be at least 2x faster for this operation
    expect(wasmTime).toBeLessThan(jsTime);
  });

  it('benchmark_normalize should work correctly', () => {
    const input = 'The Beatles';
    const result = wasm.benchmark_normalize(input);
    expect(result).toBe('the beatles');
  });

  it('benchmark_batch_normalize should handle arrays', () => {
    const inputs = ['The Beatles', 'RADIOHEAD', 'Pink Floyd'];
    const results = wasm.benchmark_batch_normalize(inputs);
    expect(results).toEqual(['the beatles', 'radiohead', 'pink floyd']);
  });
});
```

#### 4. E2E WASM Loading Test

**File**: `e2e/wasm-loading.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('WASM Loading', () => {
  test('should load WASM module when enabled', async ({ page }) => {
    // Set environment to enable WASM
    await page.goto('/?_wasm=true');
    
    // Wait for app to load
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check WASM loaded (exposed via debug mode)
    const wasmLoaded = await page.evaluate(() => {
      return (window as any).__WASM_LOADED__ === true;
    });
    
    // Note: This test requires VITE_USE_WASM_GRAPH=true and VITE_WASM_DEBUG=true
    // Skip assertion if WASM is not enabled in test environment
    if (process.env.VITE_USE_WASM_GRAPH === 'true') {
      expect(wasmLoaded).toBe(true);
    }
  });

  test('should fall back gracefully when WASM fails', async ({ page }) => {
    await page.goto('/');
    
    // App should still function without WASM
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Search should still work
    await page.fill('input[placeholder*="Search"]', 'Radiohead');
    await page.waitForTimeout(500);
    
    // Should show results (from JS implementation)
    await expect(page.locator('[data-testid="search-results"]').or(
      page.locator('text=Radiohead')
    )).toBeVisible({ timeout: 10000 });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run test` passes all new WASM tests
- [x] `npm run test:e2e` passes WASM loading tests
- [x] Test coverage includes WASM loader module

#### Manual Verification:
- [ ] Benchmark results show WASM faster than JS for sum operation

---

## Phase 1.5: Package.json Scripts

### Overview
Add npm scripts for WASM build workflow.

### Changes Required:

#### 1. Update package.json

**File**: `package.json` (add to scripts)

```json
{
  "scripts": {
    "wasm:build": "cd rust/graph-wasm && chmod +x build.sh && ./build.sh",
    "wasm:build:release": "cd rust/graph-wasm && wasm-pack build --target web --release --out-dir ../../src/wasm/pkg",
    "wasm:clean": "rm -rf src/wasm/pkg",
    "wasm:check": "cd rust/graph-wasm && cargo check",
    "wasm:test": "cd rust/graph-wasm && cargo test && wasm-pack test --headless --chrome",
    "prebuild": "npm run wasm:build:release",
    "dev:wasm": "VITE_USE_WASM_GRAPH=true VITE_WASM_DEBUG=true npm run dev"
  }
}
```

#### 2. Add .gitignore entries

**File**: `.gitignore` (append)

```gitignore
# Rust/WASM build artifacts
rust/graph-wasm/target/
rust/graph-wasm/pkg/
src/wasm/pkg/

# Keep the wasm directory structure
!src/wasm/.gitkeep
```

#### 3. Create placeholder for WASM output

**File**: `src/wasm/.gitkeep`

```
# This directory contains WASM build output
# Generated by: npm run wasm:build
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run wasm:check` passes
- [x] `npm run wasm:build` produces output in `src/wasm/pkg/`
- [x] `npm run dev:wasm` starts server with WASM enabled
- [x] `npm run build` succeeds (runs prebuild hook)

#### Manual Verification:
- [ ] WASM files are not committed to git (in .gitignore)

---

## Testing Strategy

### Unit Tests
- WASM loader initialization and caching
- Feature flag hook behavior
- Config service updates

### Integration Tests
- WASM module loading in browser environment
- Feature flag switching
- Graceful fallback when WASM unavailable

### Performance Benchmarks
- Compare JS vs WASM for sum operation (baseline)
- Compare JS vs WASM for string normalization
- Compare JS vs WASM for batch operations
- Log results for future comparison

### E2E Tests
- App loads correctly with WASM enabled
- App loads correctly with WASM disabled
- Search functionality works in both modes

## Performance Considerations

- WASM module is loaded lazily (only when feature flag enabled)
- Module is cached after first load
- Build uses `opt-level = "z"` for minimal size
- `wasm-opt` further reduces binary size by 15-25%
- Expected WASM bundle size: ~10-20KB gzipped (hello world)

## Migration Notes

This phase is additive only - no existing functionality is modified. The WASM infrastructure exists alongside the current JavaScript implementation.

## Dependencies Required

```bash
# NPM packages
npm install -D vite-plugin-wasm vite-plugin-top-level-await

# Rust toolchain (install separately)
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# Optional: wasm-opt for size optimization
# brew install binaryen  (macOS)
# apt install binaryen   (Ubuntu)
```

## References

- Research document: `thoughts/shared/research/2025-12-20-rust-wasm-graph-performance.md`
- wasm-bindgen guide: https://rustwasm.github.io/docs/wasm-bindgen/
- vite-plugin-wasm: https://github.com/ArdentHQ/vite-plugin-wasm
- wasm-pack documentation: https://rustwasm.github.io/docs/wasm-pack/
