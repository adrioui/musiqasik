# Devenv Setup Guide

This guide covers setting up the MusiqasiQ development environment using devenv on MacOS and Fedora Silverblue.

## Prerequisites

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
bun install
```

### Step 5: Start development

```bash
bun run dev
```

---

## Troubleshooting

### direnv: error .envrc is blocked

Run `direnv allow` to allow the .envrc file.

### Bun version mismatch

Run `bun --version` to verify Bun is being used from the devenv shell.

### Permission denied on Fedora Silverblue

Ensure SELinux contexts are correct:

```bash
sudo restorecon -RF /nix
```

### Slow first run

The first `devenv shell` or `direnv allow` can take 40+ seconds as it fetches nixpkgs. Subsequent runs will be much faster (~9s).

---

## Service Management

### Start All Services

```bash
devenv up
```

This starts:

- Wrangler API server on port 8787
- Vite frontend on port 8080

All logs are displayed in a unified terminal with service prefixes.

### Check Service Status

```bash
./scripts/check-services.sh
```

### Stop Services

Press `Ctrl+C` in the terminal where `devenv up` is running.

---

## Playwright E2E Testing

Playwright browsers are managed by Nix for consistent versions across developers.

### Run E2E Tests

```bash
bun run test:e2e
```

### Run E2E Tests with UI

```bash
bun run test:e2e:ui
```

### Troubleshooting Playwright

If browsers fail to launch, verify the Playwright environment:

```bash
echo $PLAYWRIGHT_BROWSERS_PATH
# Should point to Nix store path

bunx playwright --version
```

Notes:

- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` prevents bun from downloading browsers (they are provided by Nix).
- Keep `@playwright/test` (and/or `playwright`) in `package.json`: bun provides the Playwright JS runtime and test runner.
- In this setup, Nix provides _browsers_, not the Node test runner. This keeps browser versions consistent across machines.

---

## Pre-commit Hooks

Pre-commit hooks automatically run on `git commit` to ensure code quality. These hooks are managed by devenv and replace the previous husky + lint-staged setup.

### Enabled Hooks

- **Biome**: Lints and formats TypeScript/JavaScript files (`*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.json`)

### Run Hooks Manually

devenv `git-hooks` are not the Python `pre-commit` tool, so `pre-commit run ...` does not apply unless you separately install/configure it.

To exercise hooks, use regular Git workflows (they run on `git commit`), or run the underlying commands directly:

```bash
bun run lint
bun run typecheck
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

| Command     | Description                                  |
| ----------- | -------------------------------------------- |
| `lint`      | Run Biome linter                             |
| `typecheck` | Run TypeScript type check                    |
| `check`     | Run all checks (lint + typecheck + services) |
| `test`      | Run unit tests                               |
| `test:e2e`  | Run E2E tests                                |
| `clean`     | Clean all build artifacts                    |

---

## Full Workflow Example

### Initial Setup (one-time)

```bash
direnv allow
cp .envrc.local.example .envrc.local
# Edit .envrc.local with your Last.fm API key
bun install
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
bun run test
bun run test:e2e
```
