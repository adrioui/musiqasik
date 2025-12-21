# Bun Migration from NPM - Complete Implementation Plan

## Overview

Migrate the MusiqasiQ codebase from npm to Bun as the sole JavaScript runtime and package manager. This includes replacing all npm/npx commands, updating devenv.nix to use Bun instead of Node.js, and updating all documentation.

## Current State Analysis

### What Bun Replaces (and Doesn't)

**Bun is:**
- A JavaScript runtime (replacement for `node`)
- A package manager (replacement for `npm`, `npx`, `yarn`, `pnpm`)
- A task runner (`bun run`)

**Bun does NOT replace:**
- Rust / WASM tooling (wasm-pack, cargo)
- Docker
- Playwright browsers (still need Nix-provided browsers)
- Vite (runs on Bun's Node compatibility layer)
- Vitest (invoked via `bun run test`)

So Rust, Docker, WASM, and most environment variables stay unchanged.

### Existing Files
- `bun.lockb` exists (393KB) - prior Bun experimentation
- `package-lock.json` exists (268KB) - current npm lockfile
- No CI/CD configuration (no GitHub Actions to update)

### NPM References to Replace

| File | References | Type |
|------|------------|------|
| `package.json:19,25,26` | 3 `npm run` calls | Critical |
| `devenv.nix` | 11+ npm/npx references | Critical |
| `scripts/dev-utils.sh` | 7 npm commands | Critical |
| `README.md` | 4 npm references | Documentation |
| `AGENTS.md` | 5 npm references | Documentation |
| `agent_docs/development-workflow.md` | 20+ npm references | Documentation |
| `agent_docs/common-tasks.md` | 15+ npm/npx references | Documentation |
| `docs/devenv-setup.md` | 15+ npm/npx references | Documentation |

## Desired End State

After this plan is complete:
1. **Bun is the sole JavaScript runtime** - no Node.js dependency in devenv
2. **All scripts use `bun run`** - no npm/npx commands remain
3. **`package-lock.json` is removed** - only `bun.lockb` exists
4. **All documentation updated** - consistent Bun commands throughout
5. **All tests pass** - unit tests, E2E tests, and build all work

### Verification Commands
```bash
bun install              # Installs dependencies
bun run dev              # Starts Vite dev server
bun run build            # Produces production build
bun run test             # All unit tests pass
bun run test:e2e         # All E2E tests pass
bun run wasm:build       # WASM module compiles
bun run lint             # Linting passes
```

## What We're NOT Doing

1. **Not migrating to Bun's test runner** - Vitest remains, invoked via `bun run test`
2. **Not replacing Vite with Bun's bundler** - Vite remains, runs on Bun's Node compat layer
3. **Not changing Playwright** - Still uses Node runtime for browser automation
4. **Not modifying application code** - Only config, scripts, and documentation

### Playwright Compatibility Note

The existing Playwright setup continues to work with Bun because:
- Browsers are installed via Nix (`playwright-driver.browsers`)
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"` is already set
- `@playwright/test` is installed in `devDependencies`
- Tests run via `bun run test:e2e` (invokes Playwright through package.json script)

No Nix changes needed for Playwright.

## Implementation Approach

**Strategy**: Incremental migration with verification at each phase.

1. Phase 1: Update `package.json` scripts (internal npm calls)
2. Phase 2: Update `devenv.nix` to use Bun instead of Node.js
3. Phase 3: Update `scripts/dev-utils.sh`
4. Phase 4: Update all documentation
5. Phase 5: Remove `package-lock.json` and verify

---

## Phase 1: Update package.json Scripts

### Overview

Replace the 3 internal `npm run` calls in package.json scripts with `bun run`.

### Changes Required

**File**: `package.json`

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

**Specific Changes:**
- Line 19: `"npm run dev:db"` → `"bun run dev:db"` and `"npm run dev"` → `"bun run dev"`
- Line 25: `"npm run wasm:build:release"` → `"bun run wasm:build:release"`
- Line 26: `"npm run dev"` → `"bun run dev"`

### Success Criteria

#### Automated Verification:
- [ ] `bun run dev:all` starts both database and Vite server
- [ ] `bun run prebuild` triggers WASM build
- [ ] `bun run dev:wasm` starts dev server with WASM enabled

#### Manual Verification:
- [ ] Verify `dev:all` shows both processes in terminal with colors

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Update devenv.nix

### Overview

Replace Node.js with Bun in devenv configuration, update all npm/npx references to bun/bunx.

### Why Remove `languages.javascript`

The current devenv.nix explicitly enables Node.js:

```nix
languages.javascript = {
  enable = true;
  package = pkgs.nodejs_20;
};
```

We remove this entirely because:
1. Bun ships its own runtime and package manager
2. Keeping `languages.javascript` would reintroduce Node/npm, which we want to avoid
3. Bun is added directly to `packages` instead

> ⚠️ If you _must_ keep Node for tooling compatibility, you can keep Node installed alongside Bun. But this plan assumes Bun-first.

### Changes Required

**File**: `devenv.nix`

Replace entire file with:

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Bun for frontend (replaces Node.js + npm)
  packages = with pkgs; [
    bun
    wasm-pack
    binaryen  # Provides wasm-opt
    curl

    # Docker client tools
    docker
    docker-compose

    # Playwright: Nix provides browsers; Bun runs the Playwright JS runtime
    playwright-driver.browsers
  ];

  # Rust for WASM module
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = [ "wasm32-unknown-unknown" ];
  };

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

**Key Changes:**
- Removed `languages.javascript` block (no more Node.js)
- Added `bun` to packages list
- Changed `npm run dev` → `bun run dev` in processes.vite
- Changed `npm run lint -- --fix` → `bun run lint -- --fix` in git-hooks
- Changed `npx prettier` → `bunx prettier` in git-hooks
- Updated enterShell messages: `npm install` → `bun install`, Node.js version → Bun version, all npm commands → bun commands

### Success Criteria

#### Automated Verification:
- [ ] `devenv shell` enters successfully
- [ ] `bun --version` shows Bun version in devenv shell
- [ ] `devenv up` starts both SurrealDB and Vite processes
- [ ] Git hooks work: `git stash && echo "test" > /tmp/test.txt && git stash pop` (no actual commit needed)

#### Manual Verification:
- [ ] Shell welcome message shows Bun version (not Node.js)
- [ ] Shell instructions reference `bun` commands

**Implementation Note**: After completing this phase, you need to exit and re-enter the devenv shell for changes to take effect. Run `direnv reload` or exit and `cd` back into the directory.

---

## Phase 3: Update scripts/dev-utils.sh

### Overview

Replace all npm commands with bun equivalents in the development utilities script.

### Changes Required

**File**: `scripts/dev-utils.sh`

Replace entire file with:

```bash
#!/usr/bin/env bash
set -e

case "$1" in
  "lint")
    echo "Running ESLint..."
    bun run lint
    ;;
  "typecheck")
    echo "Running TypeScript type check..."
    bun run typecheck
    ;;
  "check")
    echo "Running all checks..."
    bun run lint
    bun run typecheck
    echo ""
    echo "Running service health check..."
    ./scripts/check-services.sh
    ;;
  "test")
    echo "Running unit tests..."
    bun run test
    ;;
  "test:e2e")
    echo "Running E2E tests..."
    bun run test:e2e
    ;;
  "wasm")
    echo "Building WASM module..."
    bun run wasm:build
    ;;
  "clean")
    echo "Cleaning development environment..."
    rm -rf node_modules
    rm -rf .devenv
    rm -rf dist
    rm -rf src/wasm/pkg
    echo "Clean complete. Run 'bun install' to reinstall dependencies."
    ;;
  "reset-db")
    echo "Resetting SurrealDB..."
    docker compose down -v
    docker compose up -d surrealdb
    sleep 3
    if [ -f ./surrealdb/schema.surql ]; then
      docker exec -i musiqasik-surrealdb /surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
    fi
    echo ""
    echo "Threat model note:"
    echo "- Dev-only credentials (root/root)"
    echo "- Bound to localhost"
    echo "- Not stored persistently by this repo"
    echo "- Resettable with: docker compose down -v"
    echo ""
    echo "Database reset complete."
    ;;
  *)
    echo "MusiqasiQ Development Utilities"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  lint      - Run ESLint"
    echo "  typecheck - Run TypeScript type check"
    echo "  check     - Run all checks (lint + typecheck + services)"
    echo "  test      - Run unit tests"
    echo "  test:e2e  - Run E2E tests"
    echo "  wasm      - Build WASM module"
    echo "  clean     - Clean all build artifacts"
    echo "  reset-db  - Reset SurrealDB to clean state"
    exit 1
    ;;
esac
```

**Specific Changes:**
- Line 7: `npm run lint` → `bun run lint`
- Line 11: `npm run typecheck` → `bun run typecheck`
- Lines 15-16: `npm run lint/typecheck` → `bun run lint/typecheck`
- Line 23: `npm run test` → `bun run test`
- Line 27: `npm run test:e2e` → `bun run test:e2e`
- Line 31: `npm run wasm:build` → `bun run wasm:build`
- Line 39: `npm install` → `bun install`

### Success Criteria

#### Automated Verification:
- [ ] `./scripts/dev-utils.sh lint` runs ESLint successfully
- [ ] `./scripts/dev-utils.sh typecheck` runs TypeScript check
- [ ] `./scripts/dev-utils.sh test` runs unit tests
- [ ] `./scripts/dev-utils.sh wasm` builds WASM module
- [ ] `./scripts/dev-utils.sh` (no args) shows help with correct message

#### Manual Verification:
- [ ] Clean command message says "bun install" not "npm install"

---

## Phase 4: Update Documentation

### Overview

Update all documentation files to reference Bun commands instead of npm/npx.

### Changes Required

#### 4.1 README.md

**File**: `README.md`

**Changes:**
- Line 28: `npm install` → `bun install`
- Line 56: "Node.js & npm installed" → "Bun installed"
- Line 68: `npm i` → `bun install`
- Line 71: `npm run dev` → `bun run dev`

#### 4.2 AGENTS.md

**File**: `AGENTS.md`

**Changes:**
- Line 36: `npm run dev` → `bun run dev`
- Line 37: `npm run build` → `bun run build`
- Line 38: `npm run test` → `bun run test`, `npm run test:e2e` → `bun run test:e2e`
- Line 39: `npm run lint` → `bun run lint`

#### 4.3 agent_docs/development-workflow.md

**File**: `agent_docs/development-workflow.md`

**Changes (comprehensive list):**
- Line 7: "Node.js 18+ or Bun" → "Bun"
- Line 13: `npm install` or `bun install` → `bun install`
- Line 27: `npm run dev` → `bun run dev`
- Lines 42-44: All `npm run` → `bun run`
- Lines 48, 52-53, 56-58: All `npm run` → `bun run`
- Lines 188-189, 202, 214, 219, 225, 234: All `npm run` → `bun run`

#### 4.4 agent_docs/common-tasks.md

**File**: `agent_docs/common-tasks.md`

**Changes:**
- Line 263-265: `npx shadcn-ui@latest add button` → `bunx shadcn-ui@latest add button`
- Lines 391-401: All `npm run` → `bun run`
- Lines 408-419: All `npm run` and `npx` → `bun run` and `bunx`
- Lines 425-427, 434, 440-443, 520-524: All `npm run` → `bun run`

#### 4.5 docs/devenv-setup.md

**File**: `docs/devenv-setup.md`

**Changes:**
- Lines 193-194: `npm install` → `bun install`
- Lines 199-200: `npm run wasm:build` → `bun run wasm:build`
- Lines 205-206: `npm run dev` → `bun run dev`
- Lines 359-365: `npm run test:e2e` → `bun run test:e2e`
- Line 376: `npx playwright` → `bunx playwright`
- Lines 401-403: `npm run lint/typecheck` → `bun run lint/typecheck`
- Lines 443, 466-467: `npm install` → `bun install`, `npm run test` → `bun run test`

### Success Criteria

#### Automated Verification:
- [ ] `grep -r "npm run" README.md AGENTS.md agent_docs/ docs/` returns no matches
- [ ] `grep -r "npm install" README.md AGENTS.md agent_docs/ docs/` returns no matches
- [ ] `grep -r "npx " README.md AGENTS.md agent_docs/ docs/` returns no matches

#### Manual Verification:
- [ ] README.md quick start instructions use Bun
- [ ] AGENTS.md getting started section uses Bun

---

## Phase 5: Cleanup and Final Verification

### Overview

Remove npm lockfile and perform comprehensive verification of the migration.

### Changes Required

#### 5.1 Remove package-lock.json

```bash
rm package-lock.json
```

#### 5.2 Regenerate bun.lockb

```bash
rm -rf node_modules
bun install
```

### Lockfile Expectations

Once you switch to Bun:
- `package-lock.json` becomes irrelevant — only `bun.lockb` should exist
- CI pipelines should use `bun install` (not `npm install`)
- Developers should not run `npm install` anymore

This is not enforced in `devenv.nix`, but is important operationally. The enterShell message guides users to use `bun install`.

### Success Criteria

#### Automated Verification:
- [ ] `package-lock.json` does not exist: `test ! -f package-lock.json`
- [ ] `bun.lockb` exists: `test -f bun.lockb`
- [ ] `bun install` completes successfully
- [ ] `bun run dev` starts Vite dev server on port 8080
- [ ] `bun run build` produces valid production build in `dist/`
- [ ] `bun run test` passes all unit tests
- [ ] `bun run test:e2e` passes all E2E tests
- [ ] `bun run wasm:build` compiles WASM module
- [ ] `bun run lint` passes linting
- [ ] `bun run typecheck` passes type checking
- [ ] Git hooks work on commit

#### Manual Verification:
- [ ] Application works correctly in browser at http://localhost:8080
- [ ] Artist search returns results
- [ ] Graph visualization renders correctly
- [ ] No console errors in browser dev tools

**Implementation Note**: This is the final phase. After all verifications pass, the migration is complete.

---

## Testing Strategy

### Unit Tests
- All existing Vitest tests should pass unchanged
- Run via `bun run test` (invokes Vitest through package.json script)

### E2E Tests
- All Playwright tests should pass unchanged
- Run via `bun run test:e2e`
- Playwright still uses Node runtime internally (this is expected)

### Manual Testing Steps
1. Start dev server: `bun run dev`
2. Open http://localhost:8080
3. Search for an artist (e.g., "Radiohead")
4. Verify graph renders with similar artists
5. Test graph interactions (zoom, pan, click nodes)
6. Verify no console errors

---

## Rollback Plan

If issues are encountered:

1. **Restore package-lock.json** from git: `git checkout HEAD -- package-lock.json`
2. **Restore devenv.nix** from git: `git checkout HEAD -- devenv.nix`
3. **Restore all changed files**: `git checkout HEAD -- package.json scripts/dev-utils.sh README.md AGENTS.md agent_docs/ docs/`
4. **Reinstall with npm**: `rm -rf node_modules && npm install`

---

## Performance Considerations

- **Install speed**: Bun installs are typically 30x faster than npm
- **Script execution**: `bun run` has faster startup than `npm run`
- **No runtime changes**: Vite and Vitest still run on their respective runtimes (Bun's Node compat layer)

---

## References

- Research document: `thoughts/shared/research/2025-12-21-bun-migration-from-npm.md`
- Bun documentation: https://bun.sh/docs
- Bun + Vite guide: https://bun.sh/guides/ecosystem/vite
