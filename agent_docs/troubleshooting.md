# Troubleshooting

## Common Issues

### 1. Development Server Won't Start

**Symptoms**: `bun run dev` fails or server doesn't start on port 8080.

**Checklist**:

1. **Dependencies installed**: Run `bun install`
2. **Port 8080 available**: Check if another process is using port 8080
3. **Bun version**: Ensure Bun is installed (`bun --version`)
4. **Environment variables**: Verify `.env` file exists with required variables
5. **Vite configuration**: Check `vite.config.ts:8-11` for port configuration

**Solutions**:

- Kill process on port 8080: `lsof -ti:8080 | xargs kill -9`
- Use different port: Modify `vite.config.ts` port setting
- Clear node_modules: `rm -rf node_modules && bun install`

### 2. Graph Not Loading

**Symptoms**: Graph visualization shows empty or "Loading..." indefinitely.

**Checklist**:

1. **Last.fm API key**: Verify `VITE_LASTFM_API_KEY` is set in `.env`
2. **Network connectivity**: Check browser console for CORS or network errors
3. **Artist name**: Verify artist exists on Last.fm
4. **Browser console**: Look for error messages in developer tools
5. **Effect errors**: Check for typed error messages (NetworkError, LastFmApiError)

**Debug Steps**:

1. Check browser console for Effect error traces
2. Test Last.fm API directly with curl (see Direct API Testing below)
3. Verify environment variables are loaded correctly
4. Test with different artist names

### 3. TypeScript Errors

**Symptoms**: Type errors during build or in IDE.

**Checklist**:

1. **TypeScript configuration**: Check `tsconfig.json:4-16` (strict mode is disabled)
2. **Missing types**: Ensure all imports have correct type definitions
3. **Path aliases**: Use `@/` for `src/` imports (`vite.config.ts:13-17`)
4. **Effect types**: Ensure Effect service types match implementations

**Solutions**:

- Run `bun run lint` to identify issues
- Check `src/types/artist.ts` for data types
- Use TypeScript's loose configuration (strict mode disabled)
- Add type definitions for missing modules

### 4. Build Failures

**Symptoms**: `bun run build` fails with errors.

**Checklist**:

1. **Type errors**: Run `bun run lint` first
2. **Missing dependencies**: Check `package.json` for all required packages
3. **Environment variables**: All `VITE_` variables must be available at build time
4. **Path issues**: Verify path aliases in `vite.config.ts:13-17`

**Solutions**:

- Check build output for specific error messages
- Ensure all environment variables are set
- Clear build cache: `rm -rf dist && bun run build`
- Check Vite configuration in `vite.config.ts:1-19`

### 5. Database Connection Issues (SurrealDB)

**Symptoms**: "Failed to fetch" or database errors in console.

**Note**: SurrealDB is optional. The app works without it by fetching directly from Last.fm.

**Checklist**:

1. **SurrealDB running**: Verify SurrealDB is running on configured port
2. **Connection URL**: Check `VITE_SURREALDB_WS_URL` and `VITE_SURREALDB_HTTP_URL` in `.env`
3. **Authentication**: Verify `VITE_SURREALDB_USER` and `VITE_SURREALDB_PASS`
4. **Schema applied**: Ensure `surrealdb/schema.surql` was imported

**Debug Steps**:

1. Check SurrealDB status: `surreal status`
2. Test connection: `surreal sql --conn http://localhost:8000 --ns musiqasik --db main`
3. Verify schema: `SELECT * FROM artist LIMIT 1;`
4. Check browser console for Effect error messages
5. The app should gracefully fall back to Last.fm-only mode if DB unavailable

### 6. Styling Issues

**Symptoms**: CSS not loading or Tailwind classes not working.

**Checklist**:

1. **Tailwind configuration**: Check `tailwind.config.ts:1-92`
2. **CSS imports**: Verify `src/index.css` is imported in `src/main.tsx`
3. **Class names**: Use correct Tailwind class names
4. **`cn()` utility**: Use for conditional classes (`src/lib/utils.ts:4-6`)

**Solutions**:

- Restart dev server to regenerate CSS
- Check Tailwind content configuration in `tailwind.config.ts:4-12`
- Verify CSS variables in `src/index.css:6-100`
- Use browser dev tools to inspect computed styles

### 7. Performance Issues

**Symptoms**: Slow graph rendering, laggy interactions, high memory usage.

**Checklist**:

1. **Graph depth**: Limit BFS depth to 3 hops (`MapView.tsx:19-24`)
2. **Node count**: Too many nodes can slow down D3.js simulation
3. **Memory leaks**: Check D3.js simulation cleanup
4. **API calls**: Excessive API calls due to missing caching

**Optimizations**:

- Reduce graph depth in `GraphControls.tsx:1-45`
- Increase similarity threshold to filter edges
- Ensure simulation stops on component unmount
- Implement debouncing for search (`ArtistSearch.tsx:23-37`)

## Debugging Techniques

### Browser Developer Tools

#### Console Errors

Check for JavaScript errors, network failures, or React errors. Effect provides detailed typed error traces.

#### Network Tab

1. **API calls**: Verify Last.fm API calls are successful
2. **Response data**: Check if graph data is being returned
3. **CORS errors**: Look for preflight request failures
4. **Timing**: Identify slow requests

#### React DevTools

1. **Component tree**: Inspect component hierarchy
2. **Props and state**: Check data flow through components
3. **Performance**: Profile component renders
4. **Hooks**: Debug custom hook behavior

### Effect Service Debugging

#### Logging

Add logging to Effect services using Effect.log:

```typescript
Effect.gen(function* () {
  yield* Effect.log('Processing request', { action, artist, depth });
  // ... rest of implementation
});
```

#### Error Tracing

Effect provides detailed error traces. Check browser console for:

- Effect stack traces
- Typed error information (NetworkError, LastFmApiError, DatabaseError)

#### Direct API Testing

Test Last.fm API directly:

```bash
# Search artists (replace YOUR_API_KEY)
curl "https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=radiohead&api_key=YOUR_API_KEY&format=json"

# Get artist info
curl "https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=radiohead&api_key=YOUR_API_KEY&format=json"

# Get similar artists
curl "https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=radiohead&api_key=YOUR_API_KEY&format=json"
```

#### SurrealDB Queries

Test database queries:

```bash
# Connect to SurrealDB
surreal sql --conn http://localhost:8000 --ns musiqasik --db main

# Check artist cache
SELECT * FROM artist WHERE name = 'Radiohead';

# Check similarity edges
SELECT * FROM similarity_edge WHERE source.name = 'Radiohead';
```

### Database Debugging (SurrealDB)

#### Query Testing

Connect to SurrealDB and test queries:

```bash
surreal sql --conn http://localhost:8000 --ns musiqasik --db main
```

```surql
-- Check artists table
SELECT * FROM artist WHERE name CONTAINS 'radiohead' LIMIT 5;

-- Check similarity edges
SELECT * FROM similarity_edge
WHERE source IN (SELECT id FROM artist WHERE name = 'Radiohead')
LIMIT 10;

-- Check table counts
SELECT count() FROM artist GROUP ALL;
SELECT count() FROM similarity_edge GROUP ALL;
```

#### Index Verification

```surql
-- Check table info including indexes
INFO FOR TABLE artist;
INFO FOR TABLE similarity_edge;
```

#### Connection Test

```typescript
// Test SurrealDB connection in browser console
import { surrealClient } from '@/integrations/surrealdb/client';
const result = await surrealClient.query('SELECT * FROM artist LIMIT 1');
console.log(result);
```

## Common Error Messages

### "Failed to fetch"

**Cause**: Network error, CORS issue, or API endpoint unavailable.

**Solutions**:

1. Check browser console for specific error messages
2. Verify `VITE_LASTFM_API_KEY` is set correctly
3. Check Last.fm API status
4. If using SurrealDB, verify database is running (or disable it)
5. Check Effect error traces for typed error information

### "Artist not found"

**Cause**: Artist doesn't exist on Last.fm or API key issue.

**Solutions**:

1. Verify artist name spelling
2. Check Last.fm API key in `.env`
3. Test API directly with curl
4. Check Last.fm service status

### "TypeError: Cannot read property"

**Cause**: Missing data or undefined values.

**Solutions**:

1. Add null checks in code
2. Check API response structure
3. Add default values for optional properties
4. Use optional chaining (`?.`) and nullish coalescing (`??`)

### "Maximum update depth exceeded"

**Cause**: Infinite render loop in React.

**Solutions**:

1. Check `useEffect` dependencies
2. Verify state updates aren't causing re-renders
3. Use `useCallback` and `useMemo` for expensive operations
4. Check for circular dependencies

### "D3.js simulation not stopping"

**Cause**: Memory leak from not cleaning up simulation.

**Solutions**:

1. Ensure `simulation.stop()` is called in cleanup
2. Check event listener removal
3. Verify component unmounts properly

### "Service not found" (Effect)

**Cause**: Effect service not provided in Layer composition.

**Solutions**:

1. Verify service is exported from `src/services/index.ts`
2. Check Layer composition in hook
3. Ensure all dependencies are provided via `Effect.provide()`

## Environment-Specific Issues

### Development Environment

#### Hot Reload Not Working

1. Check Vite configuration in `vite.config.ts:12`
2. Restart dev server
3. Clear browser cache

#### ESLint Errors

1. Run `bun run lint` to see all errors
2. Check `eslint.config.js:1-27` for configuration
3. Disable specific rules if needed (e.g., `@typescript-eslint/no-unused-vars` is disabled)

### Production Environment

#### Build Errors

1. Check environment variables are set in build process
2. Verify all dependencies are in `package.json`
3. Test with `bun run build` first

#### Runtime Errors

1. Check browser console for errors
2. Verify environment variables are set
3. Test API endpoints directly

#### Performance Issues

1. Enable production optimizations in Vite
2. Check bundle size with `bun run build -- --report`
3. Implement code splitting if needed

## Database Issues (SurrealDB)

### Schema Problems

#### Schema Not Applied

1. Check SurrealDB is running
2. Run schema import: `surreal import --conn http://localhost:8000 --ns musiqasik --db main surrealdb/schema.surql`
3. Verify table structure with `INFO FOR TABLE artist;`

#### Data Consistency

1. Check field types match schema
2. Verify artist names are unique
3. Ensure similarity edges have valid artist references

### Query Performance

#### Slow Searches

1. Verify indexes exist: `INFO FOR TABLE artist;`
2. Check query complexity
3. Consider adding more specific indexes

#### Graph Loading Delays

1. Limit BFS depth to 2 or 3 hops
2. Implement client-side caching
3. Optimize similarity edge queries

## API Integration Issues

### Last.fm API Limits

#### Rate Limiting

1. Effect services include error handling for rate limits
2. SurrealDB caching reduces API calls
3. Add delay between requests if needed

#### API Changes

1. Check Last.fm API documentation for changes
2. Update LastFmService if API response format changes
3. Handle API version deprecation

### Effect Service Issues

#### Service Not Found

1. Verify service is exported from `src/services/index.ts`
2. Check Layer composition in hook
3. Ensure all dependencies are provided

#### Type Errors

1. Check service interface in `src/services/tags.ts`
2. Verify Effect.gen function signatures
3. Check error types in `src/lib/errors.ts`

### SurrealDB Issues (Optional)

#### Connection Failures

1. Verify SurrealDB is running
2. Check connection URL in `.env`
3. App should gracefully fall back to Last.fm-only mode

#### Query Errors

1. Test queries directly in SurrealDB CLI
2. Check schema matches `surrealdb/schema.surql`
3. Verify TypeScript types match schema

## Getting Help

### Check Existing Documentation

1. `agent_docs/development-workflow.md` - Setup and scripts
2. `agent_docs/architecture-patterns.md` - System design
3. `agent_docs/code-conventions.md` - Coding patterns
4. `agent_docs/common-tasks.md` - Step-by-step guides

### Examine Code Examples

1. `src/components/ArtistSearch.tsx:14-37` - Search component pattern
2. `src/components/ForceGraph/index.tsx` - D3.js integration
3. `src/hooks/useLastFm.ts` - Effect service integration
4. `src/services/graph.ts:28-192` - BFS graph algorithm
5. `src/services/lastfm.ts:57-201` - Effect service pattern

### Test Minimal Cases

1. Create minimal reproduction of the issue
2. Test with Last.fm-only mode (disable SurrealDB)
3. Isolate the problem service or hook

### Community Resources

1. Check Effect documentation for service patterns
2. Check SurrealDB documentation for query issues
3. Refer to D3.js documentation for graph issues
4. Check React and TypeScript documentation for framework issues
5. Review Last.fm API documentation for integration issues
