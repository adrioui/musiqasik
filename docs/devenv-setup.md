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

### Slow first run

The first `devenv shell` or `direnv allow` can take 40+ seconds as it fetches nixpkgs. Subsequent runs will be much faster (~9s).

### Docker not available

On Fedora Silverblue, you may need to install podman-docker for compatibility:

```bash
rpm-ostree install podman-docker
```

Or create an alias: `alias docker=podman`

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

---

## Service Management

### Start All Services

```bash
devenv up
```

This starts:
- SurrealDB Docker container on port 8000
- Vite frontend on port 8080 (port is configured by the project's Vite config; if you change it there, update this doc accordingly)

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

---

## Pre-commit Hooks

Pre-commit hooks automatically run on `git commit` to ensure code quality. These hooks are managed by devenv and replace the previous husky + lint-staged setup.

### Enabled Hooks

- **ESLint**: Lints and fixes TypeScript/JavaScript files (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)
- **Prettier**: Formats code files (`*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.css`, `*.md`, `*.json`)

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
