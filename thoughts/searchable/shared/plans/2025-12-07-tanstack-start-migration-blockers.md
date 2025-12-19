# TanStack Start Migration - Blockers & Issues

**Date**: 2025-12-07  
**Status**: Blocked  
**Related Plan**: `2025-12-07-musiqasik-tanstack-start-migration.md`

## Summary

The TanStack Start migration is blocked due to **version incompatibility issues** in the TanStack ecosystem. The packages have misaligned versions that cause runtime import errors.

## Core Problem

TanStack Start depends on multiple internal packages (`@tanstack/router-generator`, `@tanstack/router-plugin`, `@tanstack/start-config`, `@tanstack/start-plugin-core`, `@tanstack/react-start-plugin`) that have **different version release cycles** and **breaking API changes** between versions.

### Error Encountered

```
SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'CONSTANTS'
```

And subsequently:

```
SyntaxError: The requested module '@tanstack/router-generator' does not provide an export named 'Generator'
```

### Root Cause

The `@tanstack/start@1.120.20` (latest stable) depends on:

- `@tanstack/start-config@1.120.20` which depends on:
  - `@tanstack/react-start-plugin@1.131.50` (newer version)
  - `@tanstack/start-plugin-core@1.131.50` (newer version)
  - `@tanstack/router-plugin@1.131.50` (newer version)

But npm resolves `@tanstack/router-generator` to `1.140.0` (latest), which has different exports than what the older packages expect.

### Version Matrix Problem

| Package                        | Expected by start-config        | Resolved by npm         |
| ------------------------------ | ------------------------------- | ----------------------- |
| `@tanstack/router-generator`   | 1.120.x exports                 | 1.140.0 (different API) |
| `@tanstack/react-start-plugin` | N/A (doesn't exist at 1.120.20) | 1.131.50                |
| `@tanstack/start-plugin-core`  | N/A (doesn't exist at 1.120.20) | 1.131.50                |

## Attempted Solutions

### 1. Version Pinning (Failed)

Tried pinning all TanStack packages to `^1.120.20`:

```json
{
  "@tanstack/react-router": "^1.120.20",
  "@tanstack/start": "^1.120.20",
  "@tanstack/router-plugin": "^1.120.20"
}
```

**Result**: npm still resolves transitive dependencies to newer versions.

### 2. npm Overrides (Partially Failed)

Tried using npm overrides to force version alignment:

```json
{
  "overrides": {
    "@tanstack/router-generator": "1.120.20",
    "@tanstack/router-plugin": "1.120.20",
    "@tanstack/start-config": "1.120.20",
    "@tanstack/start-plugin-core": "1.120.20",
    "@tanstack/react-start-plugin": "1.120.20"
  }
}
```

**Result**: `@tanstack/react-start-plugin@1.120.20` doesn't exist (package was created later).

### 3. Simplified Override (Failed)

Tried overriding only `@tanstack/router-generator`:

```json
{
  "overrides": {
    "@tanstack/router-generator": "1.120.20"
  }
}
```

**Result**: Nested `node_modules` in `@tanstack/start-plugin-core` still uses incompatible version.

## Known GitHub Issues

This is a known issue in the TanStack ecosystem:

- https://github.com/TanStack/router/issues/4380
- https://github.com/TanStack/router/issues/4190

The TanStack team is aware but the ecosystem is in rapid development with frequent breaking changes.

## Possible Solutions

### Option A: Wait for Stable Release

Wait for TanStack Start to reach a more stable state where all packages are versioned together. Currently, the ecosystem is fragmented with packages at different version numbers.

### Option B: Use Exact Working Version Combination

Find a specific combination of versions that work together. This requires:

1. Checking the TanStack Start examples repository for working `package.json`
2. Testing specific version combinations
3. Using a lockfile from a known working project

### Option C: Use Alternative Framework

Consider alternatives if TanStack Start remains unstable:

- **Remix** - Mature, stable SSR framework
- **Next.js** - Well-established with Cloudflare adapter
- **Astro** - Good for content-heavy sites with React islands

### Option D: Stay with Vite SPA

Keep the current Vite React SPA architecture and:

- Add client-side URL state management manually
- Use React Query more extensively for caching
- Deploy to Cloudflare Pages (static) instead of Workers

## Files Created During Attempt

The following files were created and should be reviewed/removed if abandoning migration:

```
app.config.ts           # TanStack Start config
wrangler.toml           # Cloudflare Workers config
.dev.vars               # Local env vars (gitignored)
src/routes/__root.tsx   # Root route
src/routes/index.tsx    # Home route
src/routes/artist/$artistName.tsx  # Artist route (placeholder)
src/router.tsx          # Router configuration
src/client.tsx          # Client entry point
src/ssr.tsx             # SSR entry point
```

## Package.json Changes

Changes made to `package.json`:

- Added TanStack Start dependencies
- Changed scripts from Vite to Vinxi
- Upgraded Vite from v5 to v6
- Added npm overrides (not working)

## Recommendation

**Recommended Action**: Pause the TanStack Start migration and either:

1. **Monitor TanStack Start releases** for a stable version where all packages align
2. **Check TanStack Discord/GitHub** for recommended version combinations
3. **Consider Option D** (stay with Vite SPA) if timeline is critical

The TanStack Start framework is powerful but currently in a state of rapid development that makes production migrations risky.

## Next Steps If Continuing

If we want to continue attempting the migration:

1. Clone the official TanStack Start example: https://github.com/TanStack/router/tree/main/examples/react/start-basic
2. Copy their exact `package.json` dependencies
3. Incrementally add our project's dependencies
4. Test at each step

This approach uses a known-working baseline rather than trying to resolve version conflicts manually.
