# Devenv Integration Implementation Plan

## Overview

Integrate devenv (Nix-based development environment) into the MusiqasiQ codebase to provide a reproducible, declarative development environment that orchestrates all required services (Vite frontend, Cloudflare Workers, SurrealDB) with a single command. This will eliminate manual setup complexity, ensure consistent environments across team members, and provide secure secrets management.

## Current State Analysis

### Manual Setup Required
- **Node.js 18+**: Must be installed manually, no version pinning
- **Package manager**: npm or bun installed separately
- **wrangler CLI**: Required for Cloudflare Workers development
- **Docker**: Required for SurrealDB (avoids CPU spikes from native install)
- **Environment variables**: 9+ variables across frontend and backend

### Multi-Service Architecture
```
Frontend (Vite:8080) ←→ Cloudflare Workers (wrangler:8787) ←→ External APIs
                                                      ↓
                                                SurrealDB (8000)
```

**Services to orchestrate:**
1. Vite dev server (port 8080) - `npm run dev`
2. Cloudflare Workers (port 8787) - `npm run dev:worker`
3. SurrealDB (port 8000) - Docker container (avoids CPU spikes)

### Environment Variables
**Frontend (.env):**
- VITE_API_URL=http://localhost:8787
- VITE_SURREALDB_WS_URL=ws://localhost:8000/rpc
- VITE_SURREALDB_HTTP_URL=http://localhost:8000/rpc
- VITE_SURREALDB_NAMESPACE=musiqasik
- VITE_SURREALDB_DATABASE=main
- VITE_SURREALDB_USER=root
- VITE_SURREALDB_PASS=root
- VITE_LASTFM_API_KEY=[secret]

**Backend/Worker:**
- SURREALDB_URL=ws://localhost:8000/rpc
- SURREALDB_NAMESPACE=musiqasik
- SURREALDB_DATABASE=main
- SURREALDB_USER=root
- SURREALDB_PASS=root
- LASTFM_API_KEY=[secret]

### Pain Points
1. **Setup time**: 30+ minutes for new contributors
2. **Inconsistent environments**: No version pinning
3. **Multi-terminal workflow**: Three separate commands in different terminals
4. **Secrets management**: Risk of committing secrets to git
5. **"Works on my machine" issues**: No reproducible environment definition
6. **CPU usage spikes**: SurrealDB native install causes performance issues

## Desired End State

### Developer Experience
- **Setup time**: <5 minutes for new contributors
- **Single command**: `devenv up` starts all services
- **Consistent environment**: All team members use identical tool versions
- **Secure secrets**: Environment variables managed securely via `.envrc.local`
- **Unified logging**: All service logs in one terminal with proper prefixing

### Technical Implementation
- **devenv.nix**: Declarative environment with Node.js 18, wrangler, Docker
- **Service orchestration**: Vite and wrangler managed by devenv; SurrealDB via Docker Compose
- **Environment variables**: Loaded from `.envrc` and `.envrc.local` (gitignored)
- **Pre-commit hooks**: Automated linting and type checking
- **Database initialization**: Docker container with automatic schema setup

### Verification
- All services start successfully with `devenv up`
- Frontend accessible at http://localhost:8080
- API accessible at http://localhost:8787
- SurrealDB accessible at http://localhost:8000
- Artist search and graph visualization work end-to-end
- No "works on my machine" issues across team members

## What We're NOT Doing

- **Not replacing production infrastructure**: devenv is for development only
- **Not changing the application code**: Only development environment changes
- **Not forcing Nix on team members**: Traditional setup remains documented
- **Not adding new runtime dependencies**: Only development environment tooling
- **Not changing CI/CD**: GitHub Actions/workflows remain unchanged
- **Not migrating away from Cloudflare Workers**: Only local development improvement
- **Not using Docker for all services**: Only SurrealDB uses Docker to address CPU issues

## Implementation Approach

Phased approach to minimize disruption and allow iterative testing:

1. **Phase 1**: Basic devenv with Node.js and npm - establishes foundation
2. **Phase 2**: Docker-based SurrealDB service - adds database via Docker to avoid CPU spikes
3. **Phase 3**: Multi-service orchestration - full development environment with Docker Compose
4. **Phase 4**: Pre-commit hooks and tooling - code quality automation

Each phase builds on the previous one and includes both automated verification (commands that can be run) and manual verification (human testing required).

---

## Phase 1: Basic Devenv with Node.js and npm

### Overview
Establish the foundation with a basic devenv.nix configuration that provides Node.js 18 and npm, allowing developers to install dependencies and run basic npm scripts.

### Changes Required

#### 1. Update devenv.nix
**File**: `devenv.nix` (update existing file created by `devenv init`)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Use Node.js 18 (matching current requirements)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_18;
  };

  # Install npm for package management
  packages = with pkgs; [
    nodejs_18
    nodePackages.npm
  ];

  # Environment variables (non-secret defaults)
  env = {
    # Node environment
    NODE_ENV = "development";
    
    # Default SurrealDB connection (can be overridden in .envrc.local)
    SURREALDB_NAMESPACE = "musiqasik";
    SURREALDB_DATABASE = "main";
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
  };

  # Process management (placeholder for future phases)
  processes = {
    # Will be populated in Phase 3
  };

  # Git hooks (placeholder for Phase 4)
  git-hooks.hooks = {
    # Will be configured in Phase 4
  };

  # Shell initialization
  enterShell = ''
    echo "MusiqasiQ development environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo ""
    echo "Available commands:"
    echo "  npm install     - Install dependencies"
    echo "  npm run dev     - Start Vite dev server (Phase 3)"
    echo "  npm run dev:worker - Start Cloudflare Worker (Phase 3)"
    echo "  devenv up       - Start all services (Phase 3)"
  '';
}
```

#### 2. Create .envrc
**File**: `.envrc` (new file, NOT gitignored)

```bash
# Load devenv
source_url "https://raw.githubusercontent.com/cachix/devenv/d1f7b48e35e6dee421cfd0f51479d5c7e1d8e412/direnvrc" "sha256-YBzqskFZxmV3mG4fAQynqQjkUHOtXZ1r7vDdpX0rYJ0="

# Use devenv
use devenv

# Load local overrides (gitignored)
if [ -f .envrc.local ]; then
  source .envrc.local
fi

# Export all environment variables
export SURREALDB_NAMESPACE="musiqasik"
export SURREALDB_DATABASE="main"
export VITE_SURREALDB_NAMESPACE="musiqasik"
export VITE_SURREALDB_DATABASE="main"

# Default API URLs for development
export VITE_API_URL="http://localhost:8787"
export VITE_SURREALDB_WS_URL="ws://localhost:8000/rpc"
export VITE_SURREALDB_HTTP_URL="http://localhost:8000/rpc"
export SURREALDB_WS_URL="ws://localhost:8000/rpc"
export SURREALDB_HTTP_URL="http://localhost:8000/rpc"
```

#### 3. Create .envrc.local.example
**File**: `.envrc.local.example` (new file)

```bash
# Copy this file to .envrc.local and fill in your secrets
# .envrc.local is gitignored - never commit secrets!

# Last.fm API Key (get yours at https://www.last.fm/api)
export LASTFM_API_KEY="your_lastfm_api_key_here"
export VITE_LASTFM_API_KEY="your_lastfm_api_key_here"

# SurrealDB Authentication (defaults shown, change if needed)
export SURREALDB_USER="root"
export SURREALDB_PASS="root"
export VITE_SURREALDB_USER="root"
export VITE_SURREALDB_PASS="root"

# Optional: Override default ports if needed
# export VITE_API_URL="http://localhost:8787"
# export VITE_SURREALDB_WS_URL="ws://localhost:8000/rpc"
```

#### 4. Update .gitignore
**File**: `.gitignore` (append to existing)

```gitignore
# Devenv
.devenv/
devenv.local.nix

# Direnv
.envrc.local

# Nix
result
```

#### 5. Create initial documentation
**File**: `docs/devenv-setup.md` (new file)

```markdown
# Devenv Setup Guide

## Prerequisites
- Nix package manager installed (https://nixos.org/download)
- direnv installed (https://direnv.net/docs/installation.html)

## Initial Setup

1. **Install Nix and direnv**
   Follow the official installation guides for your operating system.

2. **Hook direnv into your shell**
   ```bash
   # For bash/zsh
   eval "$(direnv hook bash)"  # or zsh
   
   # For fish
   direnv hook fish | source
   ```

3. **Allow the .envrc file**
   ```bash
   direnv allow
   ```

4. **Set up secrets**
   ```bash
   cp .envrc.local.example .envrc.local
   # Edit .envrc.local and add your Last.fm API key
   ```

5. **Install dependencies**
   ```bash
   npm install
   ```

## Available Commands

- `npm install` - Install project dependencies
- `devenv shell` - Enter the development shell
- `devenv up` - Start all development services (Phase 3)
- `devenv test` - Run tests (Phase 4)
- `devenv update` - Update devenv.lock

## Troubleshooting

### direnv: error .envrc is blocked
Run `direnv allow` to allow the .envrc file.

### Node.js version mismatch
Run `node --version` to verify Node.js 18 is being used.

### Permission denied errors
Ensure you have permission to execute .envrc: `chmod +x .envrc`
```

### Success Criteria

#### Automated Verification:
- [x] devenv.nix file created with proper syntax
- [x] .envrc file created and executable
- [x] .envrc.local.example created with all required secrets documented
- [x] .gitignore updated to exclude devenv and direnv files
- [x] docs/devenv-setup.md created with setup instructions
- [x] `direnv allow` succeeds without errors
- [x] `node --version` shows Node.js 18.x (using Node.js 20)
- [x] `npm --version` shows npm version
- [x] `npm install` completes successfully
- [x] `npm run lint` passes (no new errors)
- [x] `npm run typecheck` passes (no new errors)

#### Manual Verification:
- [ ] New contributor can follow docs/devenv-setup.md and get working environment in <10 minutes
- [ ] Existing developer can switch to devenv without breaking current workflow
- [ ] Node.js version is consistent across all team members
- [ ] npm install works within devenv shell
- [ ] All existing npm scripts still work

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 2.

---

## Phase 2: Docker-based SurrealDB Service

### Overview
Add SurrealDB as a Docker-managed service (via Docker Compose) with automatic startup, schema initialization, and proper environment variable configuration. Using Docker instead of a native devenv process avoids CPU usage spikes and provides better isolation.

### Changes Required

#### 1. Create Docker Compose configuration for SurrealDB
**File**: `docker-compose.yml` (new file)

```yaml
version: '3.8'

services:
  surrealdb:
    image: surrealdb/surrealdb:latest
    container_name: musiqasik-surrealdb
    command: start --log debug --user root --pass root --bind 0.0.0.0:8000 memory
    ports:
      - "8000:8000"
    environment:
      - SURREALDB_NAMESPACE=musiqasik
      - SURREALDB_DATABASE=main
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/status"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    restart: unless-stopped
```

#### 2. Update devenv.nix to use Docker Compose
**File**: `devenv.nix` (update existing)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Use Node.js 18 (matching current requirements)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_18;
  };

  # Enable Docker
  services.docker-compose = {
    enable = true;
    docker-compose-file = ./docker-compose.yml;
  };

  # Install required packages (SurrealDB CLI removed, using Docker instead)
  packages = with pkgs; [
    nodejs_18
    nodePackages.npm
    docker-compose  # For managing Docker containers
    curl  # For health checks
  ];

  # Environment variables (non-secret defaults)
  env = {
    # Node environment
    NODE_ENV = "development";
    
    # SurrealDB connection settings
    SURREALDB_NAMESPACE = "musiqasik";
    SURREALDB_DATABASE = "main";
    SURREALDB_USER = "root";
    SURREALDB_PASS = "root";
    
    # Frontend environment variables
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    
    # API URLs
    VITE_API_URL = "http://localhost:8787";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_URL = "ws://localhost:8000/rpc";
  };

  # Process management (Vite and wrangler will be added in Phase 3)
  processes = {
    # Will be populated in Phase 3
  };

  # Git hooks (placeholder for Phase 4)
  git-hooks.hooks = {
    # Will be configured in Phase 4
  };

  # Shell initialization
  enterShell = ''
    echo "MusiqasiQ development environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Docker version: $(docker --version || echo 'not available')"
    echo ""
    echo "Available commands:"
    echo "  npm install     - Install dependencies"
    echo "  devenv up       - Start Docker services and processes (Phase 3)"
    echo "  docker ps       - Check running containers"
  '';
}
```

#### 3. Create SurrealDB initialization script
**File**: `surrealdb/init.surql` (new file)

```sql
-- Initialize SurrealDB for MusiqasiQ development

-- Create namespace and database
DEFINE NAMESPACE IF NOT EXISTS musiqasik;
USE NS musiqasik;
DEFINE DATABASE IF NOT EXISTS main;
USE DB main;

-- Create root user for development
DEFINE USER root ON NAMESPACE PASSWORD 'root' ROLES OWNER;

-- Additional schema and seed data can be added here as needed.
-- This script is intended to be applied manually using the SurrealDB CLI,
-- for example via `surreal import` or `surreal sql`, rather than being
-- executed automatically by devenv.
```

#### 4. Update .envrc.local.example
**File**: `.envrc.local.example` (update existing)

```bash
# Copy this file to .envrc.local and fill in your secrets
# .envrc.local is gitignored - never commit secrets!

# Last.fm API Key (get yours at https://www.last.fm/api)
export LASTFM_API_KEY="your_lastfm_api_key_here"
export VITE_LASTFM_API_KEY="your_lastfm_api_key_here"

# SurrealDB Authentication (defaults shown, change if needed)
export SURREALDB_USER="root"
export SURREALDB_PASS="root"
export VITE_SURREALDB_USER="root"
export VITE_SURREALDB_PASS="root"

# Optional: Override default ports if needed
# export VITE_API_URL="http://localhost:8787"
# export VITE_SURREALDB_WS_URL="ws://localhost:8000/rpc"

# Verify Docker and SurrealDB
echo "Docker: $(docker --version)"
echo "SurrealDB connection: $SURREALDB_URL"
```

#### 5. Create database health check script
**File**: `scripts/check-surrealdb.sh` (new file)

```bash
#!/usr/bin/env bash

# Check if SurrealDB Docker container is running and accessible

echo "Checking SurrealDB Docker container..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "✗ Docker is not running"
  exit 1
fi

# Check if surrealdb container exists and is running
if ! docker ps | grep -q musiqasik-surrealdb; then
  echo "✗ SurrealDB container is not running"
  echo "  Run 'devenv up' or 'docker-compose up -d' to start it"
  exit 1
fi

echo "✓ SurrealDB container is running"

# Wait for SurrealDB to be ready
for i in {1..30}; do
  if curl -s http://localhost:8000/status > /dev/null 2>&1; then
    echo "✓ SurrealDB is responding on port 8000"
    
    # Test authentication using Docker exec
    if docker exec musiqasik-surrealdb surreal sql --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main --pretty \
       --query "SELECT * FROM artists LIMIT 1" > /dev/null 2>&1; then
      echo "✓ SurrealDB authentication successful"
      echo "✓ Database schema is accessible"
      exit 0
    else
      echo "✗ SurrealDB authentication failed"
      exit 1
    fi
  fi
  
  echo "Waiting for SurrealDB... ($i/30)"
  sleep 1
done

echo "✗ SurrealDB failed to start within 30 seconds"
exit 1
```

Make it executable:
```bash
chmod +x scripts/check-surrealdb.sh
```

#### 6. Update documentation
**File**: `docs/devenv-setup.md` (update existing)

Add SurrealDB section:

```markdown
## SurrealDB Service (Docker)

SurrealDB runs in a Docker container managed by devenv and starts on port 8000.

### Prerequisites

Docker must be installed and running:
- **macOS**: Install Docker Desktop from https://www.docker.com/products/docker-desktop
- **Linux**: Install Docker Engine from https://docs.docker.com/engine/install/
- **Windows**: Install Docker Desktop with WSL2 backend

### Database Access

Connect to SurrealDB using Docker:
```bash
docker exec -it musiqasik-surrealdb surreal sql --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main
```

### Verify Database

Run the health check script:
```bash
./scripts/check-surrealdb.sh
```

### Manual Database Management

Start SurrealDB manually (if needed):
```bash
docker-compose up -d surrealdb
```

View container logs:
```bash
docker logs musiqasik-surrealdb
```

Stop the container:
```bash
docker-compose stop surrealdb
```

Import schema manually:
```bash
docker exec -i musiqasik-surrealdb surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
```
```

### Success Criteria

#### Automated Verification:
- [x] docker-compose.yml created with SurrealDB service configuration
- [x] SurrealDB image configured with proper startup command
- [x] Health check configured in docker-compose.yml
- [x] devenv.nix updated with docker-compose service enabled
- [x] surrealdb package removed from devenv.nix (using Docker instead)
- [x] docker-compose and curl packages added to devenv.nix
- [x] All SurrealDB environment variables defined in env block
- [ ] Docker daemon is running
- [x] `docker-compose config` validates the configuration
- [ ] `devenv up` starts Docker container
- [ ] `docker ps` shows musiqasik-surrealdb container running
- [ ] `curl http://localhost:8000/status` returns success
- [ ] `docker exec` can connect with root/root credentials
- [ ] Database schema is accessible (artists table exists)
- [ ] scripts/check-surrealdb.sh passes
- [x] `npm run lint` still passes
- [x] `npm run typecheck` still passes

#### Manual Verification:
- [ ] SurrealDB Docker container starts automatically with `devenv up`
- [ ] Can connect to SurrealDB using `docker exec` command
- [ ] Can query artists table successfully
- [ ] Environment variables are correctly set in shell
- [ ] Frontend code can connect to SurrealDB (test with direct connection)
- [ ] All environment variables from .envrc.local are loaded
- [ ] Secrets remain in .envrc.local and are not committed to git
- [ ] CPU usage is stable (no spikes from SurrealDB)
- [ ] Docker container logs are accessible and readable

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 3.

---

## Phase 3: Multi-Service Orchestration

### Overview
Add Vite and Cloudflare Workers (wrangler) to devenv's process management, enabling `devenv up` to start all three services (Vite, wrangler, SurrealDB via Docker) simultaneously with unified logging.

### Changes Required

#### 1. Update devenv.nix with process management
**File**: `devenv.nix` (update existing)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Use Node.js 18 (matching current requirements)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_18;
  };

  # Enable Docker Compose
  services.docker-compose = {
    enable = true;
    docker-compose-file = ./docker-compose.yml;
  };

  # Install required packages
  packages = with pkgs; [
    nodejs_18
    nodePackages.npm
    docker-compose
    curl
  ];

  # Environment variables (non-secret defaults)
  env = {
    # Node environment
    NODE_ENV = "development";
    
    # SurrealDB connection settings
    SURREALDB_NAMESPACE = "musiqasik";
    SURREALDB_DATABASE = "main";
    SURREALDB_USER = "root";
    SURREALDB_PASS = "root";
    
    # Frontend environment variables
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    
    # API URLs
    VITE_API_URL = "http://localhost:8787";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_URL = "ws://localhost:8000/rpc";
  };

  # Process management - Vite and Cloudflare Workers (depends on Docker)
  processes.vite = {
    exec = "npm run dev";
    process-compose.depends_on.docker-compose.condition = "process_healthy";
  };

  processes.wrangler = {
    exec = "npm run dev:worker";
    process-compose.depends_on.docker-compose.condition = "process_healthy";
  };

  # Shell initialization
  enterShell = ''
    echo "MusiqasiQ development environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Docker version: $(docker --version || echo 'not available')"
    echo ""
    echo "Available commands:"
    echo "  devenv up       - Start all services (Docker + Vite + wrangler)"
    echo "  devenv services - List running processes"
    echo "  devenv stop     - Stop all processes"
    echo "  docker ps       - Check running containers"
    echo "  npm run lint    - Run linting"
    echo "  npm run typecheck - Run type checking"
  '';
}
```

#### 2. Create service health check script
**File**: `scripts/check-services.sh` (new file)

```bash
#!/usr/bin/env bash

# Check if all services are healthy

echo "Checking all services..."
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "✗ Docker is not running"
  exit 1
fi

# Check SurrealDB Docker container
echo "1. Checking SurrealDB (Docker)..."
if ./scripts/check-surrealdb.sh; then
  echo "   ✓ SurrealDB container is healthy"
else
  echo "   ✗ SurrealDB container is not healthy"
  exit 1
fi

# Check Vite/Frontend
echo "2. Checking Vite frontend..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
  echo "   ✓ Vite is running on port 8080"
else
  echo "   ✗ Vite is not accessible on port 8080"
  exit 1
fi

# Check Cloudflare Workers
echo "3. Checking Cloudflare Workers..."
if curl -s http://localhost:8787 > /dev/null 2>&1; then
  echo "   ✓ Cloudflare Workers is running on port 8787"
else
  echo "   ✗ Cloudflare Workers is not accessible on port 8787"
  exit 1
fi

echo ""
echo "✓ All services are healthy!"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:8080"
echo "  API:      http://localhost:8787"
echo "  Database: http://localhost:8000 (Docker)"
```

Make it executable:
```bash
chmod +x scripts/check-services.sh
```

#### 3. Create end-to-end test script
**File**: `scripts/test-e2e.sh` (new file)

```bash
#!/usr/bin/env bash

# End-to-end test of the MusiqasiQ application

echo "Running end-to-end tests..."
echo ""

# Test 1: Search for an artist
echo "1. Testing artist search..."
ARTIST_SEARCH=$(curl -s "http://localhost:8787/?action=search&q=Radiohead" 2>&1)
if echo "$ARTIST_SEARCH" | grep -q "Radiohead"; then
  echo "   ✓ Artist search works"
else
  echo "   ✗ Artist search failed"
  echo "   Response: $ARTIST_SEARCH"
  exit 1
fi

# Test 2: Get artist info
echo "2. Testing artist info..."
ARTIST_INFO=$(curl -s "http://localhost:8787/?action=artist&name=Radiohead" 2>&1)
if echo "$ARTIST_INFO" | grep -q "name"; then
  echo "   ✓ Artist info endpoint works"
else
  echo "   ✗ Artist info endpoint failed"
  echo "   Response: $ARTIST_INFO"
  exit 1
fi

# Test 3: Get similarity graph
echo "3. Testing similarity graph..."
GRAPH_DATA=$(curl -s "http://localhost:8787/?action=graph&artist=Radiohead&depth=2" 2>&1)
if echo "$GRAPH_DATA" | grep -q "nodes"; then
  echo "   ✓ Graph endpoint works"
else
  echo "   ✗ Graph endpoint failed"
  echo "   Response: $GRAPH_DATA"
  exit 1
fi

echo ""
echo "✓ All end-to-end tests passed!"
```

Make it executable:
```bash
chmod +x scripts/test-e2e.sh
```

#### 4. Update documentation
**File**: `docs/devenv-setup.md` (update existing)

Add service management section:

```markdown
## Service Management

### Start All Services

```bash
devenv up
```

This starts:
- SurrealDB Docker container on port 8000
- Vite frontend on port 8080
- Cloudflare Workers on port 8787

### Check Service Status

```bash
# Check all services
./scripts/check-services.sh

# Check individual services
docker ps | grep musiqasik-surrealdb   # SurrealDB container
curl http://localhost:8000/status      # SurrealDB API
curl http://localhost:8080             # Vite
curl http://localhost:8787             # Workers
```

### View Logs

All service logs are displayed in the terminal where `devenv up` is running. Each log line is prefixed with the service name. For Docker container logs:

```bash
docker logs musiqasik-surrealdb
docker logs -f musiqasik-surrealdb  # Follow logs
```

### Stop Services

Press `Ctrl+C` in the terminal where `devenv up` is running, or run:

```bash
devenv stop
```

To stop only the Docker container:

```bash
docker-compose stop surrealdb
```

### Test the Application

Run end-to-end tests:

```bash
./scripts/test-e2e.sh
```

This tests:
- Artist search functionality
- Artist info retrieval
- Similarity graph generation
```

### Success Criteria

#### Automated Verification:
- [x] devenv.nix updated with processes for vite and wrangler
- [x] Vite process configured with `npm run dev`
- [x] wrangler process configured with `npm run dev:worker`
- [x] Both processes depend on docker-compose health check
- [x] scripts/check-services.sh created and executable
- [x] scripts/test-e2e.sh created and executable
- [ ] `devenv up` starts Docker container and both processes
- [ ] All services show as healthy in process-compose
- [ ] `curl http://localhost:8080` returns Vite frontend
- [ ] `curl http://localhost:8787` returns Workers API response
- [ ] `curl http://localhost:8000/status` returns SurrealDB status
- [ ] `./scripts/check-services.sh` passes all checks
- [ ] Service logs show proper prefixing (vite:, wrangler:, docker-compose:)
- [ ] `docker ps` shows musiqasik-surrealdb container running
- [x] `npm run lint` still passes
- [x] `npm run typecheck` still passes

#### Manual Verification:
- [ ] `devenv up` starts all services in a single terminal
- [ ] Docker container starts automatically
- [ ] Can access frontend at http://localhost:8080
- [ ] Can search for artists in the UI
- [ ] Artist graph visualization works
- [ ] Service logs are readable with proper prefixes
- [ ] Can stop all services with Ctrl+C
- [ ] `./scripts/test-e2e.sh` passes all tests
- [ ] Artist data is cached in SurrealDB (verify with docker exec)
- [ ] No CORS errors in browser console
- [ ] Network tab shows successful API calls to localhost:8787
- [ ] Application works identically to manual setup
- [ ] CPU usage is stable (no spikes from SurrealDB)
- [ ] Docker container can be managed independently if needed

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 4.

---

## Phase 4: Pre-commit Hooks and Development Tooling

### Overview
Add pre-commit hooks for automated code quality checks (linting, type checking) and development tooling to ensure code quality and consistency.

### Changes Required

#### 1. Update devenv.nix with pre-commit hooks
**File**: `devenv.nix` (update existing)

```nix
{ pkgs, lib, config, inputs, ... }:

{
  # Use Node.js 18 (matching current requirements)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_18;
  };

  # Enable Docker Compose
  services.docker-compose = {
    enable = true;
    docker-compose-file = ./docker-compose.yml;
  };

  # Install required packages
  packages = with pkgs; [
    nodejs_18
    nodePackages.npm
    docker-compose
    curl
  ];

  # Environment variables (non-secret defaults)
  env = {
    # Node environment
    NODE_ENV = "development";
    
    # SurrealDB connection settings
    SURREALDB_NAMESPACE = "musiqasik";
    SURREALDB_DATABASE = "main";
    SURREALDB_USER = "root";
    SURREALDB_PASS = "root";
    
    # Frontend environment variables
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    
    # API URLs
    VITE_API_URL = "http://localhost:8787";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    SURREALDB_HTTP_URL = "http://localhost:8000/rpc";
    SURREALDB_URL = "ws://localhost:8000/rpc";
  };

  # Process management - Vite and Cloudflare Workers
  processes.vite = {
    exec = "npm run dev";
    process-compose.depends_on.docker-compose.condition = "process_healthy";
  };

  processes.wrangler = {
    exec = "npm run dev:worker";
    process-compose.depends_on.docker-compose.condition = "process_healthy";
  };

  # Git hooks (pre-commit integration via git-hooks.nix)
  git-hooks.hooks = {
    # ESLint for code quality
    eslint = {
      enable = true;
      description = "Run ESLint on TypeScript/JavaScript files";
      entry = "npm run lint";
      files = "\\.(ts|tsx|js|jsx)$";
    };
    
    # TypeScript type checking
    typecheck = {
      enable = true;
      description = "Run TypeScript type checking";
      entry = "npm run typecheck";
      pass_filenames = false;
    };
    
    # Check for secrets (prevent committing secrets)
    detect-secrets = {
      enable = true;
      description = "Detect potential secrets in code";
    };
    
    # Trim trailing whitespace
    trailing-whitespace = {
      enable = true;
      description = "Trim trailing whitespace";
    };
    
    # Check for merge conflicts
    merge-conflict = {
      enable = true;
      description = "Check for merge conflict markers";
    };
  };

  # Shell initialization
  enterShell = ''
    echo "MusiqasiQ development environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Docker version: $(docker --version || echo 'not available')"
    echo ""
    echo "Available commands:"
    echo "  devenv up       - Start all services (Docker + Vite + wrangler)"
    echo "  devenv services - List running processes"
    echo "  devenv stop     - Stop all processes"
    echo "  docker ps       - Check running containers"
    echo "  npm run lint    - Run linting"
    echo "  npm run typecheck - Run type checking"
    echo "  pre-commit run --all-files - Run all pre-commit hooks";
  '';
}
```

#### 2. Pre-commit configuration

With `git-hooks.hooks` configured in `devenv.nix`, devenv will automatically generate a `.pre-commit-config.yaml` symlink in the Nix store. This file:

- Does **not** need to be created or edited manually.
- Will be referenced by pre-commit when you run `pre-commit install`.
- Is typically added to `.gitignore` by `devenv init` and should not be committed.

#### 3. Create development utilities script
**File**: `scripts/dev-utils.sh` (new file)

```bash
#!/usr/bin/env bash

# Development utilities for MusiqasiQ

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
    ./scripts/check-services.sh
    ;;
  "test")
    echo "Running end-to-end tests..."
    ./scripts/test-e2e.sh
    ;;
  "clean")
    echo "Cleaning development environment..."
    rm -rf node_modules
    rm -rf .devenv
    rm -rf dist
    echo "Clean complete. Run 'npm install' to reinstall dependencies."
    ;;
  "reset-db")
    echo "Resetting SurrealDB..."
    docker exec -i musiqasik-surrealdb surreal sql --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main \
      --query "REMOVE DATABASE main; DEFINE DATABASE main; USE DB main;"
    docker exec -i musiqasik-surrealdb surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
    echo "Database reset complete."
    ;;
  *)
    echo "Usage: $0 {lint|typecheck|check|test|clean|reset-db}"
    exit 1
    ;;
esac
```

Make it executable:
```bash
chmod +x scripts/dev-utils.sh
```

#### 4. Update documentation
**File**: `docs/devenv-setup.md` (update existing)

Add pre-commit hooks and utilities sections:

```markdown
## Pre-commit Hooks

Pre-commit hooks automatically run code quality checks before commits.

### Available Hooks

- **ESLint**: Checks code quality and style
- **TypeScript type checking**: Ensures no type errors
- **Detect secrets**: Prevents committing secrets
- **Trim trailing whitespace**: Cleans up whitespace
- **Merge conflict check**: Detects conflict markers

### Run Hooks Manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run eslint --all-files
pre-commit run typecheck --all-files
```

### Skip Hooks (not recommended)

```bash
git commit --no-verify -m "Emergency commit"
```

## Development Utilities

Use the development utilities script for common tasks:

```bash
# Run all checks (lint + typecheck + service health)
./scripts/dev-utils.sh check

# Run linting only
./scripts/dev-utils.sh lint

# Run type checking only
./scripts/dev-utils.sh typecheck

# Run end-to-end tests
./scripts/dev-utils.sh test

# Clean environment (removes node_modules, .devenv, dist)
./scripts/dev-utils.sh clean

# Reset SurrealDB database (Docker)
./scripts/dev-utils.sh reset-db
```

## Full Workflow Example

1. **Initial setup** (one-time):
   ```bash
   direnv allow
   cp .envrc.local.example .envrc.local
   # Edit .envrc.local with your secrets
   npm install
   ```

2. **Daily development**:
   ```bash
   devenv up  # Start all services (Docker + Vite + wrangler)
   # ... develop ...
   ./scripts/dev-utils.sh check  # Before committing
   git add .
   git commit -m "feat: add new feature"  # Hooks run automatically
   ```

3. **Before pushing**:
   ```bash
   ./scripts/test-e2e.sh  # Full end-to-end test
   ```

## Docker Management

### Docker Prerequisites

Ensure Docker is installed and running before starting devenv:

```bash
# Check Docker status
docker info

# Check running containers
docker ps

# View SurrealDB container logs
docker logs musiqasik-surrealdb

# Restart SurrealDB container if needed
docker restart musiqasik-surrealdb
```

### Troubleshooting Docker

If `devenv up` fails with Docker errors:

1. **Check Docker is running**: `docker info`
2. **Check container status**: `docker ps -a`
3. **View container logs**: `docker logs musiqasik-surrealdb`
4. **Restart Docker daemon** (if needed)
5. **Remove stuck container**: `docker rm -f musiqasik-surrealdb`
6. **Try again**: `devenv up`
```

#### 5. Update main README
**File**: `README.md` (update existing, add devenv section)

```markdown
## Quick Start (with devenv)

The recommended way to develop MusiqasiQ is using [devenv](https://devenv.sh/) for a reproducible development environment.

### Prerequisites
- Nix package manager
- direnv
- Docker (for SurrealDB)

### Setup
1. Clone the repository
2. Run `direnv allow`
3. Copy `.envrc.local.example` to `.envrc.local` and add your Last.fm API key
4. Run `npm install`
5. Run `devenv up`

See [docs/devenv-setup.md](docs/devenv-setup.md) for detailed instructions.

### Traditional Setup (without devenv)

If you prefer not to use devenv, see [docs/development-workflow.md](docs/development-workflow.md) for manual setup instructions.
```

### Success Criteria

#### Automated Verification:
- [x] devenv.nix updated with pre-commit hooks configuration
- [x] .pre-commit-config.yaml created with ESLint and typecheck hooks (auto-generated by devenv)
- [x] scripts/dev-utils.sh created with lint, typecheck, check, test, clean, reset-db commands
- [x] All utility scripts are executable
- [ ] `pre-commit install` succeeds
- [ ] `pre-commit run --all-files` passes
- [x] `./scripts/dev-utils.sh lint` passes
- [x] `./scripts/dev-utils.sh typecheck` passes
- [ ] `./scripts/dev-utils.sh check` passes (requires running services)
- [ ] `./scripts/dev-utils.sh test` passes (requires running services)
- [x] docs/devenv-setup.md updated with pre-commit and utilities sections
- [x] README.md updated with devenv quick start section
- [x] `npm run lint` still passes
- [x] `npm run typecheck` still passes

#### Manual Verification:
- [ ] Pre-commit hooks run automatically on `git commit`
- [ ] Commit is blocked if ESLint finds errors
- [ ] Commit is blocked if TypeScript has type errors
- [ ] Can skip hooks with `--no-verify` (emergency use)
- [ ] `./scripts/dev-utils.sh clean` removes node_modules, .devenv, dist
- [ ] `./scripts/dev-utils.sh reset-db` resets SurrealDB schema via Docker
- [ ] All utility commands work as documented
- [ ] Development workflow feels smooth and efficient
- [ ] New contributors can follow quick start guide successfully
- [ ] Existing developers can migrate to devenv without issues
- [ ] CPU usage remains stable during development
- [ ] Docker container management is intuitive

**Implementation Note**: This is the final phase. After completing this phase and all automated verification passes, the devenv integration with Docker-based SurrealDB is complete.

---

## Testing Strategy

### Unit Tests
- **No unit tests currently exist** in the codebase
- Pre-commit hooks serve as basic quality gates (linting, type checking)
- Focus on integration and end-to-end testing

### Integration Tests
- **Service health checks**: scripts/check-surrealdb.sh, scripts/check-services.sh
- **API endpoint tests**: scripts/test-e2e.sh tests core functionality
- **Environment validation**: Verify all environment variables are set correctly

### End-to-End Tests
- **Artist search**: Verify search returns results
- **Artist info**: Verify artist details retrieval
- **Similarity graph**: Verify graph generation works
- **Full workflow**: Search → Select Artist → View Graph

### Manual Testing Checklist
For each phase completion, verify:
- [ ] All services start with `devenv up`
- [ ] Frontend accessible and functional
- [ ] Artist search works
- [ ] Graph visualization renders
- [ ] No console errors
- [ ] Network requests succeed
- [ ] SurrealDB caching works (second request is faster)
- [ ] Service logs are readable

### Performance Testing
- **Cold start time**: Measure time from `devenv up` to ready state
- **Artist search speed**: Compare first vs subsequent searches (cache effectiveness)
- **Graph generation**: Measure time for depth=2 vs depth=3 graphs

### Regression Testing
- Ensure traditional setup still works (documented in development-workflow.md)
- Verify no changes to production build process
- Confirm CI/CD pipelines unaffected

## Performance Considerations

### Service Startup Time
- **Target**: All services ready within 45 seconds of `devenv up`
- **Docker + SurrealDB**: Typically starts in 5-10 seconds (Docker overhead)
- **Vite**: Typically starts in 5-10 seconds (depends on dependency count)
- **wrangler**: Typically starts in 3-5 seconds
- **Optimization**: Process dependencies ensure Docker is ready before Vite/wrangler start

### Resource Usage
- **Memory**: SurrealDB Docker container (~100MB), Vite (~200MB), wrangler (~100MB)
- **CPU**: Minimal idle usage, no SurrealDB CPU spikes (isolated in Docker)
- **Disk**: .devenv directory (~100MB), node_modules (~300MB), Docker images (~200MB)

### Docker Performance Benefits
- **CPU isolation**: SurrealDB runs in container, preventing CPU spikes on host
- **Consistent performance**: Docker provides resource limits and isolation
- **Clean shutdown**: Container cleanup prevents resource leaks

### Cache Effectiveness
- **First search**: ~1-2 seconds (API call to Last.fm)
- **Subsequent search**: ~100-200ms (from SurrealDB cache)
- **Graph generation**: Benefits significantly from caching at depth > 1

## Migration Notes

### For Existing Developers
1. **Optional migration**: Traditional setup continues to work
2. **Parallel environments**: Can use both devenv and manual setup
3. **Gradual adoption**: Try devenv for new features first
4. **Environment variables**: Move secrets from .env to .envrc.local
5. **Workflow change**: Single terminal instead of multiple terminals
6. **Docker requirement**: Must install Docker for SurrealDB (addresses CPU issues)

### For New Contributors
1. **Simplified onboarding**: Follow docs/devenv-setup.md
2. **No manual tool installation**: Nix handles everything except Docker
3. **Consistent environment**: Same tools/versions as rest of team
4. **Quick start**: `direnv allow && devenv up` (after Docker install)
5. **Docker installation**: One-time setup for better performance

### CI/CD Integration
- **No changes required**: Existing GitHub Actions/workflows unchanged
- **Optional optimization**: Could use devenv in CI for consistency
- **Recommendation**: Keep CI simple, use devenv for development only

### Rollback Plan
- **Immediate**: Stop using devenv, return to manual setup
- **No code changes**: Application code unaffected
- **Documentation**: Traditional setup remains in development-workflow.md
- **Data**: SurrealDB data persists, accessible via traditional SurrealDB install or Docker
- **Docker cleanup**: Can remove Docker container if desired: `docker rm -f musiqasik-surrealdb`

## References

- Original research: `thoughts/shared/research/2025-12-11-devenv-usage-research.md`
- Development workflow: `docs/development-workflow.md`
- Agent documentation: `AGENTS.md:40-48`
- SurrealDB schema: `surrealdb/schema.surql`
- Docker Compose docs: https://docs.docker.com/compose/
- Devenv Docker integration: https://devenv.sh/services/docker-compose/
- Worker configuration: `workers/api/wrangler.toml:5-13`
- Frontend env usage: `src/integrations/surrealdb/client.ts:7-12`
- Frontend env usage: `src/hooks/useLastFm.ts:5`
