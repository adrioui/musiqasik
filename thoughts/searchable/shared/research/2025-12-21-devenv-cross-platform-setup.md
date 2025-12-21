---
date: 2025-12-21T00:00:00+07:00
researcher: opencode
git_commit: fe1d52229decd24a96fc167ed26413e646d5743a
branch: main
repository: adrioui/musiqasik
topic: "Leveraging devenv for cross-platform development setup (MacOS and Fedora Silverblue)"
tags: [research, codebase, devenv, nix, cross-platform, macos, fedora-silverblue, development-environment]
status: complete
last_updated: 2025-12-21
last_updated_by: opencode
---

# Research: Leveraging devenv for Cross-Platform Development Setup

**Date**: 2025-12-21T00:00:00+07:00
**Researcher**: opencode
**Git Commit**: fe1d52229decd24a96fc167ed26413e646d5743a
**Branch**: main
**Repository**: adrioui/musiqasik

## Research Question

Research about how we can leverage tools like devenv for development because currently it's quite hard to setup. Target platforms: MacOS and Linux with Fedora Silverblue.

## Summary

The MusiqasiQ project has a **complex development setup** requiring multiple tools (Node.js 18+, Rust with WASM target, wasm-pack, optional SurrealDB, Docker, Playwright). An existing implementation plan (`thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md`) provides a comprehensive 4-phase approach for devenv adoption.

**Key findings:**

1. **devenv is the recommended solution** for this project due to:
   - Excellent service orchestration (SurrealDB, Vite, Workers)
   - Full Rust/WASM toolchain support
   - Native performance (no container overhead)
   - Strong cross-platform compatibility (MacOS + Linux)

2. **Both platforms are well-supported**:
   - **MacOS**: Use Determinate Nix Installer for best experience
   - **Fedora Silverblue**: Requires persistent `/nix` bind mount via systemd (detailed steps available)

3. **Alternatives considered**:
   - **Devbox**: Easier onboarding (JSON config) but weaker service management
   - **Dev Containers**: Good IDE integration but performance overhead on MacOS
   - **mise/asdf**: Fast but can't manage system dependencies or services

4. **Existing implementation plan** covers everything needed for adoption.

## Current Setup Complexity

### Development Dependencies

| Dependency | Purpose | Complexity |
|------------|---------|------------|
| Node.js 18+ | Frontend build | Manual version management |
| npm/bun | Package manager | Must match Node version |
| Rust stable | WASM module | Requires rustup + wasm32 target |
| wasm-pack | WASM build tool | Additional installation |
| wasm-opt (binaryen) | WASM optimization | Optional but recommended |
| Docker | SurrealDB hosting | Platform-specific install |
| Playwright | E2E testing | Browser dependencies |

### Environment Variables (9+)

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
2. **Multi-terminal workflow**: Vite, Workers, SurrealDB in separate terminals
3. **Inconsistent environments**: No version pinning
4. **WASM toolchain complexity**: Multiple tools to install manually
5. **Platform differences**: Docker Desktop vs Podman, different install paths

## Tool Comparison

### Comparison Matrix

| Feature | devenv | Devbox | Dev Containers | mise | asdf |
|---------|--------|--------|----------------|------|------|
| **Config Language** | Nix | JSON | JSON/YAML | TOML | `.tool-versions` |
| **Learning Curve** | Moderate-Steep | Low | Low-Moderate | Low | Low |
| **System Dependencies** | ✅ Full | ✅ Full | ✅ Full | ❌ None | ❌ None |
| **Service Orchestration** | ✅ Excellent | ⚠️ Limited | ⚠️ Manual | ❌ None | ❌ None |
| **Rust/WASM Support** | ✅ Full | ✅ Full | ✅ Full | ⚠️ Basic | ⚠️ Limited |
| **Playwright Support** | ✅ Full* | ✅ Full* | ✅ Full | ⚠️ Manual | ⚠️ Manual |
| **MacOS Performance** | ✅ Native | ✅ Native | ⚠️ Container overhead | ✅ Native | ✅ Native |
| **Fedora Silverblue** | ✅ Good | ✅ Good | ✅ Excellent (Podman) | ✅ Good | ✅ Good |

*Requires special configuration with `playwright-driver.browsers` package

### Recommendation: devenv

**Why devenv is optimal for MusiqasiQ:**

1. **Service Management**: Built-in support for SurrealDB + process orchestration via `process-compose`
2. **Complete Toolchain**: Node.js, Rust, wasm-pack, wasm-bindgen all available in nixpkgs
3. **Cross-Platform**: Works identically on MacOS and Linux
4. **Fast Activation**: Sub-100ms with Nix evaluation caching (devenv 1.3+)
5. **Existing Plan**: Implementation plan already exists in `thoughts/shared/plans/`

## Platform-Specific Setup

### MacOS Installation

**Recommended: Determinate Nix Installer**

```bash
# Install Nix with Determinate installer (survives macOS upgrades)
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh

# Install devenv
nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable

# Install direnv (for automatic environment loading)
nix-env -iA direnv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable
```

**Known Considerations:**

- First `nix run` can take 40+ seconds (fetching nixpkgs), subsequent runs ~9s
- Corporate endpoint security (Jamf, Crowdstrike) may slow Nix operations
  - Request IT to add `/nix/store` exemptions
- macOS Sequoia users: Check [NixOS/nix#10892](https://github.com/NixOS/nix/issues/10892) if upgrading

### Fedora Silverblue Installation

**Step-by-step for immutable OS:**

```bash
# 1. Create persistent storage for Nix
sudo mkdir -p /var/nix
sudo chown $USER:$USER /var/nix

# 2. Create systemd service for /nix directory
sudo tee /etc/systemd/system/mkdir-rootfs@.service << 'EOF'
[Unit]
Description=Enable mount points in / for ostree
ConditionPathExists=!%f
DefaultDependencies=no
Requires=local-fs-pre.target
After=local-fs-pre.target

[Service]
Type=oneshot
ExecStartPre=chattr -i /
ExecStart=mkdir -p '%f'
ExecStopPost=chattr +i /

[Install]
WantedBy=local-fs.target
EOF

# 3. Create bind mount unit for /nix
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

# 4. Enable and start mount
sudo systemctl daemon-reload
sudo systemctl enable --now mkdir-rootfs@nix.service
sudo systemctl enable --now nix.mount

# 5. Verify mount
mount | grep /nix  # Should show bind mount

# 6. Fix SELinux contexts
sudo restorecon -RF /nix

# 7. Install Nix (single-user mode recommended for simplicity)
sh <(curl -L https://nixos.org/nix/install) --no-daemon

# 8. Install devenv and direnv
nix-env -iA devenv direnv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable
```

**Alternative: Use Toolbox/Distrobox**

```bash
# Create a mutable container for development
toolbox create nix-dev
toolbox enter nix-dev

# Install Nix normally inside container
sh <(curl -L https://nixos.org/nix/install) --no-daemon
```

### Cross-Platform devenv.nix Configuration

```nix
{ pkgs, lib, config, ... }:

{
  # Node.js for frontend
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;  # Or nodejs_18
  };

  # Rust for WASM module
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = [ "wasm32-unknown-unknown" ];
  };

  # Required packages
  packages = with pkgs; [
    wasm-pack
    wasm-bindgen-cli
    binaryen  # For wasm-opt
    docker-compose
    curl
    # Playwright browsers
    playwright-driver.browsers
  ] ++ lib.optionals stdenv.isLinux [
    # Linux-specific packages if needed
  ] ++ lib.optionals stdenv.isDarwin [
    # macOS-specific packages if needed
  ];

  # Environment variables
  env = {
    NODE_ENV = "development";
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
    
    # SurrealDB defaults (optional)
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
  };

  # Docker Compose for SurrealDB
  services.docker-compose = {
    enable = true;
    docker-compose-file = ./docker-compose.yml;
  };

  # Process management
  processes.vite.exec = "npm run dev";

  # Pre-commit hooks
  git-hooks.hooks = {
    eslint.enable = true;
    prettier.enable = true;
  };

  # Shell initialization
  enterShell = ''
    echo "MusiqasiQ development environment"
    echo "Node.js: $(node --version)"
    echo "Rust: $(rustc --version)"
    echo "wasm-pack: $(wasm-pack --version)"
    echo ""
    echo "Commands:"
    echo "  devenv up    - Start all services"
    echo "  npm run dev  - Start Vite only"
    echo "  npm run wasm:build - Build WASM module"
  '';
}
```

## Existing Implementation Plan

A comprehensive 4-phase implementation plan already exists:

**Reference**: `thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md`

### Phase 1: Basic devenv with Node.js
- Create `devenv.nix` with Node.js 18+
- Create `.envrc` for direnv integration
- Create `.envrc.local.example` for secrets

### Phase 2: Docker-based SurrealDB
- Add `docker-compose.yml` for SurrealDB container
- Configure health checks
- Add database initialization scripts

### Phase 3: Multi-Service Orchestration
- Add Vite and wrangler processes
- Create service health check scripts
- Unified logging with process prefixes

### Phase 4: Pre-commit Hooks
- ESLint and TypeScript hooks
- Secret detection
- Development utilities

**Status**: Plan created on 2025-12-11, awaiting implementation.

## Alternative Approaches

### If Team Prefers Simpler Tooling: Devbox

```json
{
  "packages": [
    "nodejs@20",
    "rustup@latest",
    "wasm-pack@latest",
    "playwright-driver@latest"
  ],
  "shell": {
    "init_hook": [
      "rustup target add wasm32-unknown-unknown",
      "export PLAYWRIGHT_BROWSERS_PATH=$(which playwright-driver | xargs dirname)/../lib/browsers"
    ],
    "scripts": {
      "dev": "npm run dev",
      "build:wasm": "npm run wasm:build"
    }
  }
}
```

### If Team Uses VS Code Heavily: Dev Containers

```json
{
  "name": "MusiqasiQ Dev",
  "build": { "dockerfile": "Dockerfile" },
  "features": {
    "ghcr.io/devcontainers/features/rust:1": {},
    "ghcr.io/devcontainers/features/playwright:1": {}
  },
  "postCreateCommand": "npm install && rustup target add wasm32-unknown-unknown && cargo install wasm-pack",
  "customizations": {
    "vscode": {
      "extensions": [
        "rust-lang.rust-analyzer",
        "ms-playwright.playwright"
      ]
    }
  }
}
```

**Note**: Dev Containers have performance overhead on MacOS due to Docker virtualization. Consider using OrbStack for better performance.

## Migration Path

### Recommended Approach

1. **Week 1-2**: Implement Phase 1-2 of existing plan
   - Basic devenv with Node.js
   - Docker-based SurrealDB

2. **Week 3-4**: Implement Phase 3-4
   - Multi-service orchestration
   - Pre-commit hooks

3. **Ongoing**: Refine based on team feedback
   - Add WASM toolchain configuration
   - Optimize for both platforms

### For Your Specific Setup

**MacOS device:**
- Install Determinate Nix Installer
- Clone repo and run `direnv allow`
- Use `devenv up` for development

**Fedora Silverblue device:**
- Set up persistent `/nix` mount (one-time)
- Or use Toolbox/Distrobox approach
- Same workflow after Nix is installed

## Code References

### Current Setup Files
- `package.json:6-27` - Development scripts including WASM builds
- `rust/graph-wasm/Cargo.toml:1-38` - WASM module configuration
- `rust/graph-wasm/rust-toolchain.toml:1-5` - Rust toolchain pinning
- `rust/graph-wasm/build.sh:1-18` - WASM build script
- `.env.example:1-24` - Environment variable documentation
- `agent_docs/development-workflow.md:1-251` - Current setup documentation

### Existing Implementation Plan
- `thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md:1-1399` - Comprehensive 4-phase implementation plan

### Previous Research
- `thoughts/shared/research/2025-12-11-devenv-usage-research.md:1-245` - Initial devenv research

## Architecture Insights

### Development Environment Architecture (Proposed)

```
┌─────────────────────────────────────────────────────────────┐
│                     devenv.nix                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  languages  │ │  packages   │ │       services          │ │
│  │ javascript  │ │ wasm-pack   │ │  docker-compose         │ │
│  │    rust     │ │ binaryen    │ │   └─ SurrealDB          │ │
│  └─────────────┘ │ playwright  │ │                         │ │
│                  └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   processes                              │ │
│  │  vite (8080) ─────────────────── Frontend               │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ devenv up
┌─────────────────────────────────────────────────────────────┐
│                    Running Services                          │
│  • Vite dev server (localhost:8080)                         │
│  • SurrealDB Docker container (localhost:8000)              │
│  • Unified logging with process prefixes                     │
└─────────────────────────────────────────────────────────────┘
```

## Historical Context (from thoughts/)

- `thoughts/shared/plans/2025-12-11-devenv-integration-implementation.md` - Detailed 4-phase implementation plan with success criteria
- `thoughts/shared/research/2025-12-11-devenv-usage-research.md` - Initial research confirming no existing devenv usage

## Related Research

- `thoughts/shared/research/2025-12-11-devenv-usage-research.md` - Previous devenv research

## Open Questions

1. **Rust toolchain in devenv vs rustup**: Should we use devenv's Rust language support or keep rustup for consistency with rust-toolchain.toml?

2. **Docker requirement**: Is Docker acceptable for both platforms? On Silverblue, Podman is native - does SurrealDB work well with Podman?

3. **Team adoption timeline**: When should we start implementing the existing plan?

4. **CI/CD integration**: Should we use devenv in GitHub Actions for consistency, or keep it development-only?

5. **Playwright browser management**: Test the `playwright-driver.browsers` package to ensure version compatibility with project's Playwright version.

## Recommendations

### Immediate Actions

1. **Start Phase 1 implementation** from existing plan
   - Create basic `devenv.nix` with Node.js 20
   - Set up `.envrc` and `.envrc.local.example`

2. **Test on both platforms**
   - Verify Nix installation works on your Silverblue device
   - Verify devenv works on your MacOS device

3. **Add WASM toolchain to plan**
   - Update `devenv.nix` to include Rust, wasm-pack, binaryen
   - Test WASM build works (`npm run wasm:build`)

### Long-term Improvements

1. **Binary caching with Cachix** - Speed up first-time setup
2. **GitHub Actions integration** - Optional: use devenv in CI
3. **Team documentation** - Update README and AGENTS.md with devenv instructions
