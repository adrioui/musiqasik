---
date: 2025-12-21T17:30:00+07:00
researcher: AI Assistant
git_commit: a1e9f92f79fc4bcb6f71a342ae8a9ddcf6b6c848
branch: main
repository: adrioui/musiqasik
topic: "Migrating from NPM to Bun - Complete Guide"
tags: [research, codebase, bun, npm, package-manager, vite, devenv, migration]
status: complete
last_updated: 2025-12-21
last_updated_by: AI Assistant
---

# Research: Migrating from NPM to Bun - Complete Guide

**Date**: 2025-12-21T17:30:00+07:00
**Researcher**: AI Assistant
**Git Commit**: a1e9f92f79fc4bcb6f71a342ae8a9ddcf6b6c848
**Branch**: main
**Repository**: adrioui/musiqasik

## Research Question

How to migrate this codebase from NPM to Bun entirely, covering package management, build tooling, testing, and development environment configuration.

## Summary

**Bun can successfully replace NPM in this codebase** with the recommended approach being:
1. **Use Bun as package manager** while keeping Vite as bundler (safest path)
2. **Keep Vitest for testing** but run via `bun run test` (not `bun test`)
3. **Playwright works** with Bun as package manager, but runs on Node runtime
4. **Update devenv.nix** to use `pkgs.bun` instead of `languages.javascript`

The project already has a `bun.lockb` file, indicating prior Bun experimentation. Key compatibility concerns are Vite 7 edge cases and Vitest 4 runtime issues, both mitigated by using Bun only as package manager.

---

## Detailed Findings

### Current State Analysis

#### Existing Bun Usage
- **`bun.lockb`** already exists in the project root alongside `package-lock.json`
- Documentation mentions "Node.js 18+ or Bun" as alternatives
- No dedicated migration planning exists in `thoughts/` directory

#### NPM References in Codebase

**Critical Files (Must Change):**

| File | References | Changes Needed |
|------|------------|----------------|
| `package.json:19,25,26` | 3 internal `npm run` calls | Change to `bun run` |
| `devenv.nix` | 11 npm/npx references | Update to bun equivalents |
| `scripts/dev-utils.sh` | 7 npm commands | Change to `bun run` |

**Documentation (Should Update):**
- `README.md` - 4 references
- `agent_docs/development-workflow.md` - 10+ references
- `agent_docs/common-tasks.md` - 3 npx references
- `docs/devenv-setup.md` - 8 npm/npx references

**Auto-Generated (Will Update Automatically):**
- `.pre-commit-config.yaml` - Generated from devenv.nix

---

### Dependency Compatibility

| Dependency | Version | Bun Compatibility | Notes |
|------------|---------|-------------------|-------|
| React 18 | 18.3.1 | ✅ Excellent | Native JSX support |
| Vite | 7.0.0 | ⚠️ Mostly OK | Edge cases with env vars |
| Effect | 3.19.9 | ✅ Excellent | Official `@effect/platform-bun` |
| D3.js | 7.9.0 | ✅ Good | Works via Node.js compat |
| SurrealDB | 1.3.2 | ✅ Excellent | Officially supports Bun |
| Radix UI | Various | ✅ Good | Avoid Bun v1.2.5 |
| Vitest | 4.0.16 | ⚠️ Caution | Use as pkg manager only |
| Playwright | 1.57.0 | ✅ Good | Needs specific config |
| TypeScript | 5.8.3 | ✅ Excellent | Native support |

**Key Issues:**
- **Vite 7**: Environment variable conflicts (Bun auto-loads `.env`), potential HMR edge cases
- **Vitest 4**: Worker thread incompatibilities, must use `bun run test` not `bun test`
- **Radix UI**: Bun v1.2.5 had temporary regression (fixed in later versions)

---

### Recommended Migration Strategy

#### Phase 1: Package Manager Only (Recommended)

Keep Vite and Vitest, just use Bun for faster installs:

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Remove npm lockfile
rm package-lock.json

# 3. Install with Bun (uses existing bun.lockb or creates new)
bun install

# 4. Test
bun run dev
bun run test
bun run build
```

**`package.json` Changes:**
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && tsc --noEmit",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "dev:db": "docker run --rm --name musiqasik-db -v ./surrealdb-data:/data -p 8000:8000 surrealdb/surrealdb start --user root --pass root file:/data/musiqasik.db",
    "dev:all": "concurrently -n db,web -c blue,green \"bun run dev:db\" \"bun run dev\"",
    "wasm:build": "cd rust/graph-wasm && chmod +x build.sh && ./build.sh",
    "wasm:build:release": "cd rust/graph-wasm && wasm-pack build --target web --release --out-dir ../../src/wasm/pkg",
    "wasm:clean": "rm -rf src/wasm/pkg",
    "wasm:check": "cd rust/graph-wasm && cargo check",
    "wasm:test": "cd rust/graph-wasm && cargo test",
    "prebuild": "bun run wasm:build:release",
    "dev:wasm": "VITE_USE_WASM_GRAPH=true VITE_WASM_DEBUG=true bun run dev"
  }
}
```

#### Phase 2: Devenv Configuration

Update `devenv.nix` to use Bun:

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Bun for frontend (replaces Node.js + npm)
  packages = with pkgs; [
    bun
    wasm-pack
    binaryen
    curl
    docker
    docker-compose
    playwright-driver.browsers
  ];

  # Environment variables
  env = {
    NODE_ENV = "development";
    
    # SurrealDB connection
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";

    # WASM defaults
    VITE_USE_WASM_GRAPH = "false";
    VITE_WASM_DEBUG = "false";

    # Playwright configuration
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  };

  # Process management
  processes = {
    surrealdb = {
      exec = "docker compose up surrealdb";
    };

    vite = {
      exec = "bun run dev";
    };
  };

  # Git hooks
  git-hooks.hooks = {
    eslint = {
      enable = true;
      name = "ESLint";
      entry = "bun run lint -- --fix";
      files = "\\.(ts|tsx|js|jsx)$";
      pass_filenames = false;
    };

    prettier = {
      enable = true;
      name = "Prettier";
      entry = "bunx prettier --write --ignore-unknown";
      files = "\\.(ts|tsx|js|jsx|css|md|json)$";
      pass_filenames = true;
    };
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
      echo "⚠️  node_modules not found. Run 'bun install' before starting development."
      echo ""
    fi

    # Check if WASM module is built
    if [ ! -d "src/wasm/pkg" ]; then
      echo "⚠️  WASM module not built. Run 'bun run wasm:build' to build it."
      echo ""
    fi

    echo "Versions:"
    echo "  Bun: $(bun --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'not available')"
    echo ""
    echo "Commands:"
    echo "  devenv up          - Start all services (SurrealDB + Vite)"
    echo "  bun run dev        - Start Vite only"
    echo "  bun run wasm:build - Build WASM module"
    echo "  bun run test:e2e   - Run E2E tests (Playwright)"
    echo "  ./scripts/dev-utils.sh   - Development utilities"
    echo ""
    echo "Service URLs:"
    echo "  Frontend:  http://localhost:8080"
    echo "  SurrealDB: http://localhost:8000"
    echo ""
    echo "Git hooks are enabled and run automatically on git commit."
  '';
}
```

#### Phase 3: Shell Script Updates

**`scripts/dev-utils.sh`:**
```bash
# Replace all npm commands
npm run lint    → bun run lint
npm run test    → bun run test
npm install     → bun install
npx ...         → bunx ...
```

---

### Testing Strategy

#### Unit Tests (Vitest)
```bash
# Use bun as package manager, Vitest runs on Node
bun run test        # Runs vitest via package.json
bun run test:watch  # Watch mode
bun run test:coverage
```

**Important**: Do NOT use `bun test` (invokes Bun's test runner instead of Vitest)

#### E2E Tests (Playwright)
```bash
bun run test:e2e     # Playwright runs on Node runtime
bun run test:e2e:ui  # Interactive mode
```

#### Alternative: Migrate to Bun Test Runner

If you want maximum Bun integration:

1. Install Happy DOM (Bun doesn't support jsdom):
```bash
bun add -D @happy-dom/global-registrator @testing-library/jest-dom
```

2. Create `bunfig.toml`:
```toml
[test]
preload = ["./test/happydom.ts", "./test/setup.ts"]
```

3. Update test imports:
```typescript
// Old (Vitest)
import { describe, it, expect } from 'vitest'

// New (Bun)
import { describe, it, expect } from 'bun:test'
```

**Trade-offs:**
- ✅ Faster test execution
- ❌ Lose Vite integration and HMR for tests
- ❌ Migration effort required

---

### WASM Support

Bun has excellent WASM support:

```typescript
// Loading WASM files
const wasmBuffer = await Bun.file("graph-processor.wasm").arrayBuffer();
const wasmModule = await WebAssembly.instantiate(wasmBuffer);

// Your existing loader should work
const wasmModule = await import('./wasm/graph-service');
```

Your existing `wasm:build` scripts using `wasm-pack` work unchanged.

---

## Code References

- `package.json:19,25,26` - Internal npm run references
- `devenv.nix:75,86,95,108,114,120,127-129` - npm/npx commands
- `scripts/dev-utils.sh:7,11,15,16,23,27,31,39` - npm commands
- `vite.config.ts` - No changes needed
- `vitest.config.ts` - No changes needed
- `playwright.config.ts` - No changes needed

---

## Architecture Insights

### Recommended Architecture: Hybrid Approach

```
┌─────────────────────────────────────────────────┐
│                    Bun                           │
│  ┌───────────────┐  ┌────────────────────────┐ │
│  │ Package Mgr   │  │ Script Runner          │ │
│  │ (bun install) │  │ (bun run <script>)     │ │
│  └───────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│      Vite        │    │    Vitest        │
│ (bundler/HMR)    │    │ (test runner)    │
│ runs on Node     │    │ runs on Node     │
└──────────────────┘    └──────────────────┘
```

This hybrid approach:
- Gets Bun's speed for package installation (30x faster)
- Keeps Vite's mature bundling and plugin ecosystem
- Keeps Vitest's advanced testing features
- Avoids compatibility edge cases

---

## Historical Context (from thoughts/)

No dedicated Bun migration documents exist. References found:

- `thoughts/shared/plans/2025-12-21-devenv-cross-platform-integration.md` - Mentions npm/bun as options
- `thoughts/shared/plans/2025-12-20-claude-md-best-practices-implementation.md` - Documentation mentions both
- `thoughts/shared/plans/2025-12-21-codebase-cleanup-unused-components.md` - Removed 24 unused deps for faster npm install

The project has experimented with Bun (evidenced by `bun.lockb`) but no formal migration was documented.

---

## Migration Checklist

### Files to Modify

- [ ] `package.json` - Update 3 internal script references
- [ ] `devenv.nix` - Replace Node.js with Bun, update 11 references
- [ ] `scripts/dev-utils.sh` - Update 7 npm commands
- [ ] `README.md` - Update setup instructions
- [ ] `agent_docs/development-workflow.md` - Update examples
- [ ] `agent_docs/common-tasks.md` - Change npx to bunx
- [ ] `docs/devenv-setup.md` - Update platform guide
- [ ] `AGENTS.md` - Update quick start commands

### Files to Remove

- [ ] `package-lock.json` - After confirming bun.lockb works

### Verification Steps

1. [ ] `bun install` completes successfully
2. [ ] `bun run dev` starts Vite dev server
3. [ ] `bun run build` produces valid production build
4. [ ] `bun run test` passes all unit tests
5. [ ] `bun run test:e2e` passes all E2E tests
6. [ ] `bun run wasm:build` compiles WASM module
7. [ ] Git hooks work with bunx

---

## Open Questions

1. **Windows Support**: Bun on Windows is experimental - how many contributors use Windows?
2. **CI/CD**: Does the project have GitHub Actions that need updating?
3. **Lock File Strategy**: Should `bun.lockb` be the sole lockfile, or keep both for compatibility?
4. **Vite 7 Edge Cases**: Need to test thoroughly for environment variable handling
5. **Node.js Removal**: Can devenv completely remove Node.js, or keep it for Playwright/Vitest runtime?

---

## Related Resources

- [Bun Official Documentation](https://bun.sh/docs)
- [Bun + Vite Guide](https://bun.sh/guides/ecosystem/vite)
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Effect + Bun](https://effect.website/docs/getting-started/installation)
- [Playwright Bun Issues](https://github.com/microsoft/playwright/issues?q=bun)
