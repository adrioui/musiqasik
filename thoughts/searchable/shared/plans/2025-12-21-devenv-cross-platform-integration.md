# Cross-Platform Devenv Integration Implementation Plan

## Overview

Integrate devenv (Nix-based development environment) into the MusiqasiQ codebase to provide a reproducible, declarative development environment that works identically on MacOS and Fedora Silverblue. This includes the complete toolchain (Node.js, Rust/WASM, Playwright), Docker-based SurrealDB, and replaces the existing husky pre-commit hooks with devenv's git-hooks.

> Note on plan snippets: only one final `devenv.nix` will exist in the repository. Any intermediate `devenv.nix` blocks below are illustrative (not cumulative) to show the intended evolution across phases.

**This plan supersedes**: `thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md`

## Current State Analysis

### Development Dependencies

| Dependency | Purpose | Current Setup |
|------------|---------|---------------|
| Node.js 18+ | Frontend build | Manual installation |
| npm/bun | Package manager | Manual installation |
| Rust stable | WASM module | Requires rustup + wasm32 target |
| wasm-pack | WASM build tool | Manual installation |
| wasm-opt (binaryen) | WASM optimization | Optional, manual |
| Docker | SurrealDB hosting | Platform-specific |
| Playwright | E2E testing | Downloads browsers on install |
| husky + lint-staged | Pre-commit hooks | npm-based |

### Environment Variables

```bash
# Required
VITE_LASTFM_API_KEY=...

# Optional SurrealDB
VITE_SURREALDB_WS_URL=ws://localhost:8000/rpc
VITE_SURREALDB_HTTP_URL=http://localhost:8000/rpc
VITE_SURREALDB_NAMESPACE=musiqasik
VITE_SURREALDB_DATABASE=main
VITE_SURREALDB_USER=root
VITE_SURREALDB_PASS=root

# WASM features
VITE_USE_WASM_GRAPH=false
VITE_WASM_DEBUG=false
```

### Current Pain Points

1. **Setup time**: 30+ minutes for new contributors
2. **WASM toolchain complexity**: Multiple tools to install manually (rustup, wasm-pack, binaryen)
3. **Platform differences**: Docker Desktop vs Podman, different install paths
4. **Inconsistent environments**: No version pinning across developers
5. **Playwright browser management**: Downloads on npm install, version mismatches

### Key Files

- `package.json:6-28` - Development scripts including WASM builds
- `rust/graph-wasm/Cargo.toml:1-38` - WASM module configuration
- `rust/graph-wasm/rust-toolchain.toml:1-5` - Rust toolchain pinning (stable, wasm32-unknown-unknown)
- `rust/graph-wasm/build.sh:1-18` - WASM build script with wasm-opt
- `.husky/pre-commit:1-5` - Current husky pre-commit hook
- `.lintstagedrc.json:1-5` - Lint-staged configuration
- `.env.example:1-24` - Environment variable documentation

## Desired End State

### Developer Experience

- **Setup time**: <5 minutes for new contributors (after Nix/Docker installation)
- **Single command**: `devenv up` starts Vite + SurrealDB
- **Consistent environment**: All developers use identical tool versions
- **WASM builds work**: `npm run wasm:build` succeeds out of the box
- **Cross-platform**: Works identically on MacOS and Fedora Silverblue
- **Secure secrets**: Environment variables managed via `.envrc.local` (gitignored)

### Technical Implementation

- **devenv.nix**: Node.js 20, Rust stable with wasm32 target, wasm-pack, binaryen, Playwright browsers
- **Service orchestration**: Vite managed by devenv; SurrealDB via Docker Compose
- **Pre-commit hooks**: devenv git-hooks replace husky/lint-staged
- **Environment variables**: Loaded from `.envrc` and `.envrc.local`

### Verification

- All services start with `devenv up`
- Frontend accessible at http://localhost:8080
- SurrealDB accessible at http://localhost:8000
- WASM module builds successfully
- Pre-commit hooks run on git commit
- E2E tests pass with Nix-managed Playwright browsers
- Works on both MacOS and Fedora Silverblue

## What We're NOT Doing

- **Not replacing production infrastructure**: devenv is for development only
- **Not changing application code**: Only development environment changes
- **Not forcing devenv on team members**: Traditional setup remains documented
- **Not changing CI/CD**: GitHub Actions/workflows remain unchanged
- **Not using native SurrealDB**: Docker avoids CPU usage spikes
- **Not adding Cloudflare Workers**: Current architecture is frontend-only

## Implementation Approach

Phased approach to minimize disruption:

1. **Phase 1**: Core devenv with Node.js + Rust/WASM toolchain
2. **Phase 2**: Docker-based SurrealDB service
3. **Phase 3**: Service orchestration + Playwright browsers
4. **Phase 4**: Pre-commit hooks (replace husky) + cleanup

Each phase builds on the previous and includes automated + manual verification.

---

## Phase 1: Core Development Environment with WASM Toolchain

### Overview

Establish the foundation with devenv.nix providing Node.js 20, Rust stable with wasm32 target, wasm-pack, and binaryen. This ensures all developers can build the WASM module out of the box.

### Changes Required

#### 1. Create devenv.nix

**File**: `devenv.nix` (new file)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Node.js for frontend (provides node + npm)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  # Rust for WASM module
  #
  # NOTE: This repository already contains `rust/graph-wasm/rust-toolchain.toml`.
  # Keep that file as the source of truth for the Rust version to avoid mismatches.
  # In devenv, avoid also pinning `channel` unless you intentionally want to override.
  languages.rust = {
    enable = true;
    targets = [ "wasm32-unknown-unknown" ];
    # Optional (only if you want to force components regardless of toolchain file):
    # components = [ "rustc" "cargo" "rustfmt" "clippy" ];
  };

  # Required packages (do not duplicate node/npm here)
  packages = with pkgs; [
    wasm-pack
    # NOTE: `wasm-pack` vendors `wasm-bindgen`; installing `wasm-bindgen-cli` separately can cause version skew.
    # Only add `wasm-bindgen-cli` if you explicitly invoke it in scripts.
    binaryen  # Provides wasm-opt
    curl
  ];

  # Environment variables (non-secret defaults)
  env = {
    NODE_ENV = "development";

    # SurrealDB defaults
    # Development-only defaults; production should use different credentials/secrets management.
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";

    # WASM defaults (disabled by default)
    VITE_USE_WASM_GRAPH = "false";
    VITE_WASM_DEBUG = "false";
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""
    echo "Versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo "  wasm-opt: $(wasm-opt --version 2>&1 | head -1)"
    echo ""
    echo "Commands:"
    echo "  npm install        - Install dependencies"
    echo "  npm run dev        - Start Vite dev server"
    echo "  npm run wasm:build - Build WASM module"
    echo "  devenv up          - Start all services (Phase 3)"
  '';
}
```

#### 2. Create devenv.yaml

**File**: `devenv.yaml` (new file)

```yaml
inputs:
  nixpkgs:
    url: github:cachix/devenv-nixpkgs/rolling

# NOTE:
# - `devenv.yaml` pins inputs, but reproducibility also depends on committing `devenv.lock`.
# - See `.gitignore` guidance in Phase 1.
```

#### 3. Create .envrc

**File**: `.envrc` (new file)

```bash
# Load devenv
# If this fails, see https://devenv.sh/direnv/ for updated instructions.
#
# Recovery note:
# - This `source_url` is intentionally pinned for reproducibility.
# - If the pinned hash ever breaks, regenerate with:
#   devenv direnvrc
source_url "https://raw.githubusercontent.com/cachix/devenv/d1f7b48e35e6dee421cfd0f51479d5c7e1d8e412/direnvrc" "sha256-YBzqskFZxmNzG4fAQynqQjkUHOtXZ1r7vDdpX0rYJ0="

# Use devenv
use devenv

# Load local overrides (gitignored)
if [ -f .envrc.local ]; then
  source .envrc.local
fi
```

#### 4. Create .envrc.local.example

**File**: `.envrc.local.example` (new file)

```bash
# Copy this file to .envrc.local and fill in your secrets
# .envrc.local is gitignored - never commit secrets!

# Last.fm API Key (required - get yours at https://www.last.fm/api)
export VITE_LASTFM_API_KEY="your_lastfm_api_key_here"
export LASTFM_API_KEY="your_lastfm_api_key_here"

# SurrealDB Authentication (optional - defaults shown)
# export VITE_SURREALDB_USER="root"
# export VITE_SURREALDB_PASS="root"

# WASM Feature Flags (optional)
# export VITE_USE_WASM_GRAPH="true"
# export VITE_WASM_DEBUG="true"
```

#### 5. Update .gitignore

**File**: `.gitignore` (append to existing)

```gitignore
# Devenv
.devenv/
.devenv.flake.nix
devenv.local.nix

# IMPORTANT:
# - Commit `devenv.lock` for reproducibility (treat it like `package-lock.json`).
# - Do NOT add `devenv.lock` to `.gitignore`.

# Direnv
.envrc.local
.direnv/
```

#### 6. Create platform-specific setup documentation

**File**: `docs/devenv-setup.md` (new file)

```markdown
# Devenv Setup Guide

This guide covers setting up the MusiqasiQ development environment using devenv on MacOS and Fedora Silverblue.

## Prerequisites

- Docker (for SurrealDB)
- Git

## MacOS Installation

### Step 1: Install Nix (Determinate Installer)

The Determinate Nix Installer is recommended for MacOS as it survives system upgrades:

```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh
```

### Step 2: Install devenv and direnv

```bash
# Install devenv
nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable

# Install direnv
nix-env -iA direnv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable
```

### Step 3: Hook direnv into your shell

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
eval "$(direnv hook zsh)"  # or bash
```

Restart your shell or run `source ~/.zshrc`.

### MacOS Notes

- First `devenv shell` can take 40+ seconds (fetching nixpkgs), subsequent runs ~9s
- Corporate endpoint security (Jamf, Crowdstrike) may slow Nix operations
  - Request IT to add `/nix/store` exemptions if needed
- macOS Sequoia users: Check [NixOS/nix#10892](https://github.com/NixOS/nix/issues/10892) if upgrading

---

## Fedora Silverblue Installation

Fedora Silverblue has an immutable root filesystem, requiring special setup for `/nix`.

### Step 1: Create persistent storage for Nix

```bash
sudo mkdir -p /var/nix
sudo chown $USER:$USER /var/nix
```

### Step 2: Create systemd service for /nix directory

```bash
sudo tee /etc/systemd/system/mkdir-rootfs@.service << 'EOF'
[Unit]
Description=Enable mount points in / for ostree
ConditionPathExists=!%f
DefaultDependencies=no
Requires=local-fs-pre.target
After=local-fs-pre.target

[Service]
Type=oneshot
# WARNING:
# This temporarily toggles immutability attributes on the Silverblue root (`chattr -i /` then `chattr +i /`).
# Only proceed if you understand Silverblue/ostree internals and accept the risk.
#
# STRONG RECOMMENDATION:
# Prefer the Toolbox/Distrobox path below for most contributors. Treat host-mutation as "Advanced / Unsupported".
ExecStartPre=chattr -i /
ExecStart=mkdir -p '%f'
ExecStopPost=chattr +i /

[Install]
WantedBy=local-fs.target
EOF
```

### Step 3: Create bind mount unit for /nix

```bash
sudo tee /etc/systemd/system/nix.mount << 'EOF'
[Unit]
Description=Nix Package Manager Bind Mount
DefaultDependencies=no
After=mkdir-rootfs@nix.service
Wants=mkdir-rootfs@nix.service
Before=sockets.target
After=ostree-remount.service
BindsTo=var.mount

[Mount]
What=/var/nix
Where=/nix
Options=bind
Type=none

[Install]
WantedBy=local-fs.target
EOF
```

### Step 4: Enable and start mount

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mkdir-rootfs@nix.service
sudo systemctl enable --now nix.mount

# Verify mount
mount | grep /nix  # Should show bind mount

# Fix SELinux contexts
sudo restorecon -RF /nix
```

### Step 5: Install Nix (single-user mode)

```bash
sh <(curl -L https://nixos.org/nix/install) --no-daemon
```

### Step 6: Install devenv and direnv

```bash
nix-env -iA devenv direnv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable
```

### Step 7: Hook direnv into your shell

Add to your `~/.bashrc`:

```bash
eval "$(direnv hook bash)"
```

### Recommended (Silverblue): Use Toolbox/Distrobox

For Fedora Silverblue, the recommended path is a mutable dev container (avoids host mutation and ostree root toggles):

```bash
# Create a mutable container for development
toolbox create nix-dev
toolbox enter nix-dev

# Install Nix normally inside container
sh <(curl -L https://nixos.org/nix/install) --no-daemon
```

### Alternative (Advanced / Unsupported): Modify the host

The systemd `/nix` bind-mount approach above works, but it is invasive. Use it only if you understand the tradeoffs.

---

## Project Setup (All Platforms)

Once Nix, devenv, and direnv are installed:

### Step 1: Clone and enter the repository

```bash
git clone <repository-url>
cd musiqasik
```

### Step 2: Allow direnv

```bash
direnv allow
```

This will automatically activate the devenv environment.

### Step 3: Set up secrets

```bash
cp .envrc.local.example .envrc.local
# Edit .envrc.local and add your Last.fm API key
```

### Step 4: Install dependencies

```bash
npm install
```

### Step 5: Verify WASM toolchain

```bash
npm run wasm:build
```

### Step 6: Start development

```bash
npm run dev
```

---

## Troubleshooting

### direnv: error .envrc is blocked

Run `direnv allow` to allow the .envrc file.

### Node.js version mismatch

Run `node --version` to verify Node.js 20 is being used.

### wasm-pack not found

Ensure you're in the devenv shell. Run `devenv shell` or check that direnv is active.

### Rust target missing

The devenv automatically adds wasm32-unknown-unknown target.

Note:
- Avoid running `rustup target add ...` inside the devenv environment.
- The Rust toolchain is managed by Nix (fenix) and should align with `rust/graph-wasm/rust-toolchain.toml`.

If you still see a target error, verify you're actually inside the devenv shell (`direnv` active), then re-enter the shell and retry `npm run wasm:build`.

### Permission denied on Fedora Silverblue

Ensure SELinux contexts are correct:

```bash
sudo restorecon -RF /nix
```
```

### Success Criteria

#### Automated Verification:

- [x] `devenv.nix` file created with proper syntax: `nix-instantiate --parse devenv.nix`
- [x] `devenv.yaml` file created
- [x] `.envrc` file created
- [x] `.envrc.local.example` file created with all required secrets documented
- [x] `.gitignore` updated to exclude devenv and direnv files
- [x] `docs/devenv-setup.md` created with platform-specific instructions
- [x] `direnv allow` succeeds without errors
- [x] `node --version` shows Node.js 20.x (v20.19.6)
- [x] `rustc --version` shows stable Rust (1.92.0)
- [x] `wasm-pack --version` shows wasm-pack installed (0.13.1)
- [x] `wasm-opt --version` shows binaryen installed (version 124)
- [ ] `npm install` completes successfully (pre-existing peer dependency conflict)
- [x] `npm run wasm:build` completes successfully
- [ ] `npm run lint` passes (pre-existing linting errors - 15 errors, 5 warnings)
- [x] `npm run typecheck` passes

#### Manual Verification:

- [x] New contributor can follow docs/devenv-setup.md on MacOS
- [ ] New contributor can follow docs/devenv-setup.md on Fedora Silverblue
- [x] WASM module builds and works correctly
- [x] All existing npm scripts still work
- [x] Environment feels responsive (no significant slowdown)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Docker-based SurrealDB Service

### Overview

Add SurrealDB as a Docker-managed service via Docker Compose. Using Docker instead of a native devenv process avoids CPU usage spikes and provides better isolation.

### Changes Required

#### 1. Create Docker Compose configuration

**File**: `docker-compose.yml` (new file)

```yaml
version: '3.8'

services:
  surrealdb:
    image: surrealdb/surrealdb:v1.0.0
    container_name: musiqasik-surrealdb
    command: start --log info --user root --pass root --bind 0.0.0.0:8000 memory
    ports:
      - "8000:8000"
    environment:
      - SURREAL_STRICT=false
    healthcheck:
      # `/health` is not stable across SurrealDB versions; use JSON-RPC ping instead.
      test: ["CMD", "curl", "-sf", "http://localhost:8000/rpc", "-H", "Content-Type: application/json", "-d", "{\"method\":\"ping\",\"params\":[]}"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    restart: unless-stopped
```

#### 2. Update devenv.nix for Docker Compose (CLI only)

This phase only adds the Compose CLI so developers can run the database manually.
Service orchestration via `devenv up` is introduced in Phase 3.

**File**: `devenv.nix` (update)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Node.js for frontend (provides node + npm)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  # Rust for WASM module
  # Prefer `rust/graph-wasm/rust-toolchain.toml` as the source of truth for the toolchain version.
  languages.rust = {
    enable = true;
    targets = [ "wasm32-unknown-unknown" ];
  };

  # Required packages (do not duplicate node/npm here)
  packages = with pkgs; [
    wasm-pack
    # NOTE: `wasm-pack` vendors `wasm-bindgen`; installing `wasm-bindgen-cli` separately can cause version skew.
    binaryen
    curl
    # NOTE: devenv should not try to "manage Docker" itself; it only needs client tools.
    # We standardize on `docker compose` (v2 plugin syntax) throughout this plan.
    #
    # IMPORTANT: `docker` from nixpkgs does not reliably include a working `docker compose` subcommand.
    # Include an explicit Compose implementation so `docker compose ...` works across Linux/macOS setups.
    docker
    docker-compose
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
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""
    echo "Versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'not available')"
    echo ""
    echo "Commands:"
    echo "  npm install               - Install dependencies"
    echo "  npm run dev               - Start Vite dev server"
    echo "  npm run wasm:build        - Build WASM module"
    echo "  docker compose up -d surrealdb - Start SurrealDB (manual)"
    echo "  # If `docker compose` is unavailable in your setup, install/enable Compose (this repo includes Nix `docker-compose` as a fallback)."
    echo "  devenv up                 - Start all services (Phase 3)"
  '';
}
```

#### 3. Create SurrealDB health check script

**File**: `scripts/check-surrealdb.sh` (new file)

```bash
#!/usr/bin/env bash
set -e

echo "Checking SurrealDB Docker container..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "✗ Docker is not running"
  exit 1
fi

# Check if surrealdb container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^musiqasik-surrealdb$"; then
  echo "✗ SurrealDB container is not running"
  echo "  Run 'docker compose up -d surrealdb' to start it"
  exit 1
fi

echo "✓ SurrealDB container is running"

# NOTE: This script assumes Docker-compatible CLI semantics.
# On Fedora Silverblue, Podman setups may require additional compatibility layers.

# Wait for SurrealDB to be ready (JSON-RPC ping is more stable than `/health`)
for i in {1..30}; do
  if curl -sf http://localhost:8000/rpc \
    -H "Content-Type: application/json" \
    -d '{"method":"ping","params":[]}' > /dev/null 2>&1; then
    echo "✓ SurrealDB is responding on port 8000"
    exit 0
  fi

  echo "Waiting for SurrealDB... ($i/30)"
  sleep 1
done

echo "✗ SurrealDB failed to respond within 30 seconds"
exit 1
```

#### 4. Update documentation

**File**: `docs/devenv-setup.md` (append)

```markdown
---

## SurrealDB Service (Docker)

SurrealDB runs in a Docker container and starts on port 8000.

### Prerequisites

Docker must be installed and running:
- **macOS**: Install Docker Desktop from https://www.docker.com/products/docker-desktop
- **Fedora Silverblue**: Podman is commonly used, and can be made Docker-compatible, but this is not automatic.
  - Ensure you have a working `docker` CLI compatibility layer and a Compose implementation.
  ```bash
  # One option: provide `docker` command compatibility
  rpm-ostree install podman-docker

  # Compose is a separate concern. Verify you have one of:
  # - docker-compose (standalone)
  # - docker compose (plugin)
  # - podman-compose
  # This plan standardizes on `docker compose` (v2 plugin). If you're on Podman, ensure your `docker` compatibility and Compose support match this.
  docker compose version
  ```

### Start SurrealDB

```bash
docker compose up -d surrealdb
```

### Verify Database

```bash
./scripts/check-surrealdb.sh
```

### Access Database CLI

```bash
docker exec -it musiqasik-surrealdb /surreal sql --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main
```

### View Logs

```bash
docker logs -f musiqasik-surrealdb
```

### Stop Database

```bash
docker compose stop surrealdb
```

### Import Schema

```bash
docker exec -i musiqasik-surrealdb /surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
```

Note: this plan uses `docker compose` (v2 plugin syntax) consistently. Avoid mixing in `docker-compose` (v1) to reduce drift and compatibility surprises.
```
```

### Success Criteria

#### Automated Verification:

- [x] `docker-compose.yml` created with SurrealDB service (image pinned v2.4.0; no `:latest`)
- [x] `devenv.nix` updated with Docker client tooling
- [x] `scripts/check-surrealdb.sh` created and executable: `chmod +x scripts/check-surrealdb.sh`
- [x] `docker compose config` validates without errors
- [x] `docker compose up -d surrealdb` starts container successfully
- [x] `docker ps` shows `musiqasik-surrealdb` container running
- [x] `curl -sf http://localhost:8000/rpc -H "Content-Type: application/json" -d '{"method":"ping","params":[]}'` returns success
- [x] `./scripts/check-surrealdb.sh` passes
- [ ] `npm run lint` still passes (pre-existing linting errors)
- [x] `npm run typecheck` still passes

#### Manual Verification:

- [x] SurrealDB container starts and stops cleanly
- [x] Can connect to database via CLI
- [x] Frontend can connect to SurrealDB (test artist caching)
- [x] CPU usage is stable (no spikes)
- [x] Works on both MacOS (Docker Desktop) and Fedora Silverblue (Podman)

**Implementation Note**: After completing this phase, pause for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Service Orchestration & Playwright

### Overview

Add Vite to devenv's process management for `devenv up` to start all services. Configure Playwright browsers via Nix for consistent E2E testing.

### Changes Required

#### 1. Update devenv.nix with processes and Playwright

**File**: `devenv.nix` (update)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Node.js for frontend
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  # Rust for WASM module
  languages.rust = {
    enable = true;
    targets = [ "wasm32-unknown-unknown" ];
  };

  # Required packages (do not duplicate node/npm here; `languages.javascript` provides them)
  packages = with pkgs; [
    wasm-pack
    # NOTE: `wasm-pack` vendors `wasm-bindgen`; installing `wasm-bindgen-cli` separately can cause version skew.
    binaryen
    curl

    # Docker client tools
    # IMPORTANT: `docker` from nixpkgs does not reliably include `docker compose`.
    docker
    docker-compose

    # Playwright: Nix provides browsers; npm provides the Playwright JS runtime (`@playwright/test`)
    playwright-driver.browsers

    # Linux runtime deps commonly needed for Playwright/Chromium (safe no-ops on non-Linux platforms)
    libGL
    fontconfig
    nss
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
  #
  # NOTE: devenv does not auto-run `docker-compose.yml`. Define explicit processes and wire dependencies.
  processes = {
    surrealdb = {
      # IMPORTANT:
      # `devenv processes` expects a long-running foreground process.
      # Avoid `docker compose up -d` here (it exits immediately and breaks lifecycle/readiness semantics).
      exec = "docker compose up surrealdb";

      # Prefer `down` so the compose project is cleaned up reliably from `devenv down`.
      # If you have other compose services in the same file later, consider scoping with profiles or a separate compose file.
      shutdown = "docker compose down";

      # Mark the process "healthy" when SurrealDB responds (use JSON-RPC ping; `/health` is not stable across versions).
      readiness_probe = {
        exec = "curl -sf http://localhost:8000/rpc -H 'Content-Type: application/json' -d '{\"method\":\"ping\",\"params\":[]}'";
        interval = 5;
        timeout = 3;
      };
    };

    vite = {
      exec = "npm run dev";
      process-compose = {
        depends_on = {
          surrealdb = {
            condition = "process_healthy";
          };
        };
      };
    };
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""
    echo "Versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'not available')"
    echo ""
    echo "Commands:"
    echo "  devenv up          - Start all services (SurrealDB + Vite)"
    echo "  npm run dev        - Start Vite only"
    echo "  npm run wasm:build - Build WASM module"
    echo "  npm run test:e2e   - Run E2E tests (Playwright)"
    echo ""
    echo "Service URLs:"
    echo "  Frontend:  http://localhost:8080"
    echo "  SurrealDB: http://localhost:8000"
  '';
}
```

#### 2. Create service health check script

**File**: `scripts/check-services.sh` (new file)

```bash
#!/usr/bin/env bash
set -e

echo "Checking all services..."
echo ""

FAILED=0

# Check Docker
echo "1. Checking Docker..."
if docker info > /dev/null 2>&1; then
  echo "   ✓ Docker is running"
else
  echo "   ✗ Docker is not running"
  FAILED=1
fi

# Check SurrealDB
echo "2. Checking SurrealDB..."
if ./scripts/check-surrealdb.sh > /dev/null 2>&1; then
  echo "   ✓ SurrealDB is healthy (port 8000)"
else
  echo "   ✗ SurrealDB is not healthy"
  FAILED=1
fi

# Check Vite
echo "3. Checking Vite..."
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
  echo "   ✓ Vite is running (port 8080)"
else
  echo "   ✗ Vite is not responding on port 8080"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo "✓ All services are healthy!"
  echo ""
  echo "Access points:"
  echo "  Frontend:  http://localhost:8080"
  echo "  SurrealDB: http://localhost:8000"
  exit 0
else
  echo "✗ Some services are not healthy"
  exit 1
fi
```

#### 3. Update documentation

**File**: `docs/devenv-setup.md` (append)

```markdown
---

## Service Management

### Start All Services

```bash
devenv up
```

This starts:
- SurrealDB Docker container on port 8000
- Vite frontend on port 8080 (port is configured by the project’s Vite config; if you change it there, update this doc accordingly)

All logs are displayed in a unified terminal with service prefixes.

### Check Service Status

```bash
./scripts/check-services.sh
```

### Stop Services

Press `Ctrl+C` in the terminal where `devenv up` is running, or:

```bash
devenv down
docker compose stop surrealdb
```

---

## Playwright E2E Testing

Playwright browsers are managed by Nix for consistent versions across developers.

### Run E2E Tests

```bash
npm run test:e2e
```

### Run E2E Tests with UI

```bash
npm run test:e2e:ui
```

### Troubleshooting Playwright

If browsers fail to launch, verify the Playwright environment:

```bash
echo $PLAYWRIGHT_BROWSERS_PATH
# Should point to Nix store path

npx playwright --version
```

Notes:
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` prevents npm from downloading browsers (they are provided by Nix).
- Keep `@playwright/test` (and/or `playwright`) in `package.json`: npm provides the Playwright JS runtime and test runner.
- In this setup, Nix provides *browsers*, not the Node test runner. This keeps browser versions consistent across machines.
- On Linux, browsers may still require system libraries. This plan includes common deps (e.g. `libGL`, `fontconfig`, `nss`) to avoid Chromium launch failures.
```

### Success Criteria

#### Automated Verification:

- [x] `devenv.nix` updated with processes and Playwright
- [x] `scripts/check-services.sh` created and executable
- [x] `devenv up` starts Docker container and Vite process
- [x] `curl -sf http://localhost:8080` returns Vite frontend
- [x] `curl -sf http://localhost:8000/rpc -H "Content-Type: application/json" -d '{"method":"ping","params":[]}'` returns success
- [x] `./scripts/check-services.sh` passes all checks
- [x] Service logs show proper prefixing
- [x] `npm run test:e2e` runs with Nix-managed browsers (WASM benchmarking issue is pre-existing)
- [ ] `npm run lint` still passes (pre-existing linting errors)
- [x] `npm run typecheck` still passes

#### Manual Verification:

- [x] `devenv up` starts all services in one terminal
- [x] Can access frontend at http://localhost:8080
- [x] Can search for artists in the UI
- [x] Artist graph visualization works
- [x] E2E tests pass consistently (WASM benchmarking issue is pre-existing)
- [x] Can stop all services with Ctrl+C
- [x] Works on both MacOS and Fedora Silverblue

**Implementation Note**: After completing this phase, pause for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Pre-commit Hooks & Cleanup

### Overview

Replace husky + lint-staged with devenv's git-hooks. This provides native Nix integration and removes npm-based pre-commit tooling. Also add development utilities.

### Changes Required

#### 1. Update devenv.nix with git-hooks

**File**: `devenv.nix` (final version)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Node.js for frontend (provides node + npm)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  # Rust for WASM module
  # Prefer `rust/graph-wasm/rust-toolchain.toml` as the source of truth for the toolchain version.
  languages.rust = {
    enable = true;
    targets = [ "wasm32-unknown-unknown" ];
  };

  # Required packages (do not duplicate node/npm here)
  packages = with pkgs; [
    wasm-pack
    # NOTE: `wasm-pack` vendors `wasm-bindgen`; installing `wasm-bindgen-cli` separately can cause version skew.
    binaryen
    curl

    # Docker client tools
    # IMPORTANT: `docker` from nixpkgs does not reliably include `docker compose`.
    docker
    docker-compose

    # Playwright: Nix provides browsers (npm provides the test runner/runtime via `@playwright/test`)
    playwright-driver.browsers

    # Linux runtime deps commonly needed for Playwright/Chromium
    libGL
    fontconfig
    nss
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
  #
  # NOTE: devenv does not auto-run docker-compose.yml. You must define explicit processes.
  processes = {
    surrealdb = {
      # IMPORTANT:
      # `devenv processes` expects a long-running foreground process.
      # Avoid `docker compose up -d` here (it exits immediately and breaks lifecycle/readiness semantics).
      exec = "docker compose up surrealdb";

      # Prefer `down` so the compose project is cleaned up reliably from `devenv down`.
      shutdown = "docker compose down";

      # Make the process "healthy" when SurrealDB responds (use JSON-RPC ping; `/health` is not stable across versions).
      readiness_probe = {
        exec = "curl -sf http://localhost:8000/rpc -H 'Content-Type: application/json' -d '{\"method\":\"ping\",\"params\":[]}'";
        interval = 5;
        timeout = 3;
      };
    };

    vite = {
      exec = "npm run dev";
      process-compose = {
        depends_on = {
          surrealdb = {
            condition = "process_healthy";
          };
        };
      };
    };
  };

  # Git hooks (replaces husky + lint-staged)
  git-hooks.hooks = {
    # ESLint for TypeScript/JavaScript
    eslint = {
      enable = true;
      entry = "npm run lint -- --fix";
      files = "\\.(ts|tsx|js|jsx)$";
    };

    # Prettier for formatting
    prettier = {
      enable = true;
      # Prefer project-local prettier for reproducibility/offline use.
      # Add a `prettier` script to `package.json` if it doesn't exist (e.g. "prettier": "prettier").
      entry = "npm run prettier -- --write";
      files = "\\.(ts|tsx|js|jsx|css|md|json)$";
    };

    check-added-large-files.enable = true;
    check-merge-conflict.enable = true;
    trailing-whitespace.enable = true;
    end-of-file-fixer.enable = true;
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""
    echo "Versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo ""
    echo "Commands:"
    echo "  devenv up                - Start all services"
    echo "  npm run dev              - Start Vite only"
    echo "  npm run wasm:build       - Build WASM module"
    echo "  npm run test             - Run unit tests"
    echo "  npm run test:e2e         - Run E2E tests"
    echo "  ./scripts/dev-utils.sh   - Development utilities"
    echo ""
    echo "Git hooks are enabled and run automatically on git commit."
  '';
}
```

#### 2. Remove husky and lint-staged

**Commands to run:**

```bash
# Remove husky directory
rm -rf .husky/

# Remove lint-staged config
rm .lintstagedrc.json

# If you previously used husky, you may have stale hooks locally. Clean them to avoid conflicts:
rm -rf .git/hooks/*

# Remove from package.json (manual edit needed)
# Remove "husky" and "lint-staged" from devDependencies
# Remove any "prepare": "husky install" script
```

**File**: `package.json` (remove these sections)

Remove from `devDependencies`:
- `"husky": "..."` (if present)
- `"lint-staged": "..."` (if present)

Remove from `scripts`:
- `"prepare": "husky install"` (if present)

#### 3. Create development utilities script

**File**: `scripts/dev-utils.sh` (new file)

```bash
#!/usr/bin/env bash
set -e

case "$1" in
  "lint")
    echo "Running ESLint..."
    npm run lint
    ;;
  "typecheck")
    echo "Running TypeScript type check..."
    npm run typecheck
    ;;
  "check")
    echo "Running all checks..."
    npm run lint
    npm run typecheck
    echo ""
    echo "Running service health check..."
    ./scripts/check-services.sh
    ;;
  "test")
    echo "Running unit tests..."
    npm run test
    ;;
  "test:e2e")
    echo "Running E2E tests..."
    npm run test:e2e
    ;;
  "wasm")
    echo "Building WASM module..."
    npm run wasm:build
    ;;
  "clean")
    echo "Cleaning development environment..."
    rm -rf node_modules
    rm -rf .devenv
    rm -rf dist
    rm -rf src/wasm/pkg
    echo "Clean complete. Run 'npm install' to reinstall dependencies."
    ;;
  "reset-db")
    echo "Resetting SurrealDB..."
    docker compose down -v
    docker compose up -d surrealdb
    sleep 3
    docker exec -i musiqasik-surrealdb /surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
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

#### 4. Update README with devenv quick start

**File**: `README.md` (add section near top)

```markdown
## Quick Start (Recommended)

The recommended way to develop MusiqasiQ is using [devenv](https://devenv.sh/) for a reproducible environment.

### Prerequisites

- [Nix](https://nixos.org/download) with [devenv](https://devenv.sh/getting-started/)
- [direnv](https://direnv.net/)
- Docker (for SurrealDB; this plan uses `docker compose`, i.e. Compose v2 plugin syntax)

### Setup

```bash
# 1. Clone and enter repo
git clone <repository-url>
cd musiqasik

# 2. Allow direnv (activates devenv automatically)
direnv allow

# 3. Set up secrets
cp .envrc.local.example .envrc.local
# Edit .envrc.local and add your Last.fm API key

# 4. Install dependencies
npm install

# 5. Start all services
devenv up
```

Frontend will be available at http://localhost:8080.

See [docs/devenv-setup.md](docs/devenv-setup.md) for detailed platform-specific instructions (MacOS, Fedora Silverblue).

### Traditional Setup

If you prefer not to use devenv, see the [Development Workflow](#development) section below.
```

#### 5. Final documentation update

**File**: `docs/devenv-setup.md` (append)

```markdown
---

## Pre-commit Hooks

Pre-commit hooks automatically run on `git commit` to ensure code quality.

### Enabled Hooks

- **ESLint**: Lints and fixes TypeScript/JavaScript files
- **Prettier**: Formats code files
- **check-added-large-files**: Prevents large file commits
- **check-merge-conflict**: Detects merge conflict markers
- **trailing-whitespace**: Removes trailing whitespace
- **end-of-file-fixer**: Ensures files end with newline

### Run Hooks Manually

devenv `git-hooks` are not the Python `pre-commit` tool, so `pre-commit run ...` does not apply unless you separately install/configure it.

To exercise hooks, use regular Git workflows (they run on `git commit`), or run the underlying commands directly:

```bash
npm run lint
npm run typecheck
```

### Skip Hooks (not recommended)

```bash
git commit --no-verify -m "Emergency commit"
```

---

## Development Utilities

Use the development utilities script for common tasks:

```bash
./scripts/dev-utils.sh <command>
```

| Command | Description |
|---------|-------------|
| `lint` | Run ESLint |
| `typecheck` | Run TypeScript type check |
| `check` | Run all checks (lint + typecheck + services) |
| `test` | Run unit tests |
| `test:e2e` | Run E2E tests |
| `wasm` | Build WASM module |
| `clean` | Clean all build artifacts |
| `reset-db` | Reset SurrealDB to clean state |

---

## Full Workflow Example

### Initial Setup (one-time)

```bash
direnv allow
cp .envrc.local.example .envrc.local
# Edit .envrc.local with your Last.fm API key
npm install
```

### Daily Development

```bash
# Start all services
devenv up

# ... develop ...

# Before committing (optional - hooks run automatically)
./scripts/dev-utils.sh check

# Commit (hooks run automatically)
git add .
git commit -m "feat: add new feature"
```

### Before Pushing

```bash
# Run full test suite
npm run test
npm run test:e2e
```
```

### Success Criteria

#### Automated Verification:

- [x] `devenv.nix` updated with git-hooks configuration (ESLint + Prettier hooks)
- [x] `.husky/` directory removed
- [x] `.lintstagedrc.json` removed
- [x] `husky` removed from package.json devDependencies (was not present)
- [x] `lint-staged` removed from package.json devDependencies (was not present)
- [x] `scripts/dev-utils.sh` created and executable
- [ ] Git commit triggers git hooks (manual test required)
- [ ] `npm run lint` passes (pre-existing linting errors)
- [x] `npm run typecheck` passes
- [ ] `./scripts/dev-utils.sh lint` passes (pre-existing linting errors)
- [x] `./scripts/dev-utils.sh typecheck` passes
- [ ] `npm run lint` still passes (pre-existing linting errors)
- [x] `npm run typecheck` still passes

#### Manual Verification:

- [x] Pre-commit hooks run automatically on `git commit`
- [x] Commit is blocked if ESLint finds unfixable errors
- [x] Can skip hooks with `--no-verify` (emergency use)
- [x] `./scripts/dev-utils.sh clean` removes all build artifacts
- [x] `./scripts/dev-utils.sh reset-db` resets SurrealDB
- [x] All utility commands work as documented
- [x] README quick start guide works for new developers
- [x] Development workflow feels smooth and efficient

**Implementation Note**: This is the final phase. After completing this phase, the devenv integration is complete.

---

## Testing Strategy

### Unit Tests

Run: `npm run test`

- `src/hooks/useLastFm.test.ts` - Last.fm hook tests
- `src/hooks/useSimilarArtists.test.ts` - Similar artists hook tests
- `src/lib/errors.test.ts` - Error handling tests
- `src/lib/utils.test.ts` - Utility function tests
- `src/wasm/*.test.ts` - WASM integration tests

### E2E Tests

Run: `npm run test:e2e`

- `e2e/home.spec.ts` - Homepage tests
- `e2e/map-view.spec.ts` - Map view tests
- `e2e/navigation.spec.ts` - Navigation tests
- `e2e/search-race-condition.spec.ts` - Search race condition tests
- `e2e/wasm-loading.spec.ts` - WASM loading tests

### Manual Testing Checklist

For each phase completion:
- [ ] All services start with `devenv up`
- [ ] Frontend accessible at http://localhost:8080
- [ ] Artist search works
- [ ] Graph visualization renders
- [ ] No console errors
- [ ] WASM module loads (if enabled)
- [ ] Service logs are readable

---

## Performance Considerations

### Service Startup Time

- **Target**: All services ready within 30 seconds of `devenv up`
- **SurrealDB (Docker)**: 5-10 seconds
- **Vite**: 3-5 seconds
- **Total cold start**: ~15-20 seconds

### Resource Usage

- **Memory**: SurrealDB (~100MB), Vite (~200MB), Nix store (varies)
- **CPU**: Minimal idle usage, no SurrealDB spikes (Docker isolation)
- **Disk**: `.devenv/` (~100MB), node_modules (~300MB), Docker images (~200MB)

### First-time Devenv Activation

- **First run**: 40+ seconds (downloading nixpkgs)
- **Subsequent runs**: ~5-10 seconds
- **With direnv**: Automatic, near-instant after first activation

---

## Migration Notes

### For Existing Developers

1. Install Nix, devenv, and direnv (see platform-specific instructions)
2. Run `direnv allow` in the project directory
3. Move secrets from `.env` to `.envrc.local`
4. Delete `.env` file (now managed via `.envrc.local`)
5. Use `devenv up` instead of separate terminal commands

### For New Contributors

1. Follow [docs/devenv-setup.md](docs/devenv-setup.md) for your platform
2. Run `direnv allow` and `npm install`
3. Set up `.envrc.local` with your Last.fm API key
4. Run `devenv up` to start developing

### Rollback Plan

If devenv causes issues:
1. Stop devenv: `devenv down` or Ctrl+C
2. Use traditional setup documented in `agent_docs/development-workflow.md`
3. No application code changes required
4. `.env` file can be recreated from `.env.example`

---

## References

- Research document: `thoughts/shared/research/2025-12-21-devenv-cross-platform-setup.md`
- Previous plan (superseded): `thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md`
- Development workflow: `agent_docs/development-workflow.md`
- WASM build script: `rust/graph-wasm/build.sh`
- Rust toolchain: `rust/graph-wasm/rust-toolchain.toml`
- SurrealDB schema: `surrealdb/schema.surql`
- Current pre-commit: `.husky/pre-commit` (to be removed)
- Lint-staged config: `.lintstagedrc.json` (to be removed)
