---
date: 2025-12-11T00:00:00Z
researcher: opencode
git_commit: 603fc9ddaad89d17ddd584e92a805e739a406d44
branch: main
repository: musiqasik
topic: "Research about the current usage of devenv in this codebase so as to make development setup easier"
tags: [research, codebase, devenv, development-environment, setup]
status: complete
last_updated: 2025-12-11
last_updated_by: opencode
---

# Research: Devenv Usage for Development Setup

**Date**: 2025-12-11T00:00:00Z
**Researcher**: opencode
**Git Commit**: 603fc9ddaad89d17ddd584e92a805e739a406d44
**Branch**: main
**Repository**: musiqasik

## Research Question
Research about the current usage of devenv in this codebase so as to make development setup easier.

## Summary
The MusiqasiQ codebase currently does **not** use devenv or any Nix-based development environment. The project relies on traditional Node.js tooling with manual environment setup. Key findings:

- **No devenv configuration exists**: No devenv.nix, devenv.yaml, devenv.lock, or .devenv directory found
- **Manual setup required**: Developers must manually install Node.js 18+, configure environment variables, and start multiple services
- **Multi-service architecture**: Requires orchestrating Vite dev server, Cloudflare Workers (wrangler), and SurrealDB
- **Environment variable complexity**: 6+ backend secrets plus undocumented frontend variables
- **No existing devenv research**: Only tangential mentions in planning documents

Devenv could significantly improve the developer experience by providing:
1. **Declarative environment**: Node.js, wrangler, and other tools in a single configuration
2. **Automated service orchestration**: Start Vite, wrangler, and SurrealDB with one command
3. **Environment variable management**: Secure handling of secrets and configuration
4. **Reproducible environments**: Consistent setup across all team members

## Detailed Findings

### Current Development Setup

#### Frontend Development (`package.json:6-14`)
- **Dev server**: `npm run dev` starts Vite on port 8080
- **Build**: `npm run build` for production builds
- **Linting**: `npm run lint` runs ESLint
- **Type checking**: `npm run typecheck` runs TypeScript compiler
- **Dependencies**: 70+ npm packages including React, TypeScript, Vite, Tailwind CSS

#### Backend Development (`package.json:13-14`, `workers/api/wrangler.toml`)
- **Worker dev**: `npm run dev:worker` starts wrangler in local mode
- **Worker deploy**: `npm run deploy:worker` deploys to Cloudflare
- **Runtime**: Cloudflare Workers with TypeScript
- **Dependencies**: Effect, SurrealDB client, custom types from `src/`

#### Database Requirements (`surrealdb/schema.surql`, `workers/api/index.ts:145-156`)
- **SurrealDB**: Graph database for caching artist data and similarity edges
- **Connection**: Required for both local and production development
- **Schema**: Graph-based with artists table and similarity_edges relations

### Environment Variables

#### Backend/Worker Variables (`AGENTS.md:40-48`, `workers/api/wrangler.toml:5-13`)
All required for Cloudflare Workers:
- `SURREALDB_URL` - SurrealDB instance URL (**secret**)
- `SURREALDB_NAMESPACE` - Database namespace (default: "musiqasik")
- `SURREALDB_DATABASE` - Database name (default: "main")
- `SURREALDB_USER` - Database username (**secret**)
- `SURREALDB_PASS` - Database password (**secret**)
- `LASTFM_API_KEY` - Last.fm API key for artist data (**secret**)

#### Frontend Variables
**Status**: Not well-documented in AGENTS.md
**Location**: Likely `.env` file with `VITE_` prefixes for Vite
**Need investigation**: Frontend code should be searched for `import.meta.env` usage

### Pain Points for Devenv to Solve

1. **Manual Tool Installation**
   - Node.js 18+ must be installed manually
   - wrangler CLI must be installed globally or via npm
   - SurrealDB must be installed and running separately
   - No version pinning for development tools

2. **Multi-Service Orchestration**
   - Developers must run `npm run dev` (Vite) and `npm run dev:worker` (wrangler) in separate terminals
   - SurrealDB must be started separately
   - No unified logging or process management
   - No easy way to start/stop all services together

3. **Environment Variable Management**
   - 6+ secrets must be manually configured in wrangler
   - Frontend environment variables not documented
   - No local secrets management solution
   - Risk of committing secrets to version control

4. **Inconsistent Environments**
   - No guarantee all team members use same Node.js version
   - No guarantee all team members have same tool versions
   - "Works on my machine" problems likely
   - No reproducible environment definition

5. **Setup Complexity for New Contributors**
   - Must follow multi-step setup in `docs/development-workflow.md:3-21`
   - Must create Supabase account and project
   - Must obtain Last.fm API key
   - Must configure multiple environment variable sets
   - High barrier to entry for new developers

### Current Documentation

#### Development Workflow (`docs/development-workflow.md`)
- **Setup instructions**: Manual steps for Node.js, Supabase, Last.fm API
- **Environment variables**: Mentions `.env` file but doesn't document specific variables
- **Database setup**: Assumes Supabase hosted service (no local DB instructions)
- **Scripts**: Documents available npm scripts
- **Missing**: No mention of devenv, nix, or automated environment setup

#### Agent Documentation (`AGENTS.md:40-48`)
- **Backend variables**: Documents Cloudflare Workers environment variables
- **Frontend variables**: Not documented
- **Setup**: References manual installation process
- **Missing**: No automated environment setup instructions

## Code References

### Development Scripts
- `package.json:7` - `dev`: Vite development server
- `package.json:13` - `dev:worker`: wrangler local development
- `package.json:14` - `deploy:worker`: wrangler deployment

### Worker Configuration
- `workers/api/wrangler.toml:5-13` - Environment variables configuration
- `workers/api/index.ts:6-13` - Environment variable usage in worker
- `workers/api/index.ts:16` - Per-request cache implementation

### Documentation
- `docs/development-workflow.md:3-21` - Manual setup instructions
- `AGENTS.md:40-48` - Backend environment variables

## Architecture Insights

### Current Architecture
```
Frontend (Vite/React) ←→ Cloudflare Workers ←→ External APIs
                                      ↓
                                  SurrealDB
```

**Data Flow**:
1. Frontend makes requests to Cloudflare Worker
2. Worker checks SurrealDB cache
3. If cache miss, worker fetches from Last.fm/Deezer APIs
4. Worker stores results in SurrealDB
5. Worker returns data to frontend

**Development Complexity**:
- 3 separate services to orchestrate (Vite, wrangler, SurrealDB)
- 2 external API dependencies (Last.fm, Deezer)
- 6+ environment variables to manage
- No local development database setup documented

### Devenv Opportunities

1. **Unified Service Management**
   ```nix
   # Example devenv.nix services
   services.surrealdb.enable = true;
   processes.vite.exec = "npm run dev";
   processes.wrangler.exec = "npm run dev:worker";
   ```

2. **Declarative Environment**
   ```nix
   # Example devenv.nix packages
   packages = with pkgs; [
     nodejs_18
     nodePackages.wrangler
     surrealdb
   ];
   ```

3. **Environment Variable Management**
   ```nix
   # Example devenv.nix environment
   env.SURREALDB_URL = "ws://localhost:8000/rpc";
   env.LASTFM_API_KEY = config.devenv.dotenv.LASTFM_API_KEY;
   ```

4. **Pre-commit Hooks & Linting**
   ```nix
   # Example devenv.nix pre-commit
   pre-commit.hooks.eslint.enable = true;
   pre-commit.hooks.typecheck.exec = "npm run typecheck";
   ```

## Historical Context (from thoughts/)

### Planning Documents
- `thoughts/shared/plans/2025-12-11-update-agents-md-documentation.md` - Mentions setting up development environment using AGENTS.md
- `thoughts/shared/plans/2025-12-07-musiqasik-tanstack-start-migration.md` - Mentions local development environment variables in TanStack migration context

**Key Insight**: No historical research or implementation of devenv exists. The project has relied on manual setup documentation.

### Development Environment Evolution
1. **Initial Setup**: Manual Node.js + npm workflow
2. **Current State**: Same as initial, no automation improvements
3. **Future Plans**: TanStack migration may affect environment variables but not setup automation

## Related Research

No existing research documents in `thoughts/shared/research/` specifically address development environment setup or devenv usage.

## Open Questions

1. **Frontend Environment Variables**: What VITE_ variables are used in the frontend code? Need to search `src/` for `import.meta.env` usage.

2. **Local SurrealDB Setup**: What is the recommended local SurrealDB setup? Not documented in current workflow.

3. **Supabase vs SurrealDB**: Documentation mentions Supabase but code uses SurrealDB. Which is the current database?

4. **Team Adoption**: Would the team adopt Nix/devenv, or is there resistance to Nix-based tooling?

5. **CI/CD Integration**: How would devenv integrate with existing CI/CD pipelines?

## Recommendations

### Immediate Actions
1. **Audit frontend environment variables**: Search `src/` for `import.meta.env` usage
2. **Clarify database setup**: Document local SurrealDB setup process
3. **Create .env.example**: Add example environment file for frontend variables

### Devenv Implementation Plan
1. **Phase 1**: Basic devenv.nix with Node.js and npm
2. **Phase 2**: Add SurrealDB service and environment variable management
3. **Phase 3**: Add wrangler and multi-service orchestration
4. **Phase 4**: Add pre-commit hooks and development tooling

### Success Metrics
- New contributor setup time reduced from 30+ minutes to <5 minutes
- Eliminate "works on my machine" issues
- All team members using identical development environment
- Secrets managed securely without risk of committing to version control
