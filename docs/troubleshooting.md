# Troubleshooting

## Common Issues

### 1. Development Server Won't Start

**Symptoms**: `npm run dev` fails or server doesn't start on port 8080.

**Checklist**:

1. **Dependencies installed**: Run `npm install` or `bun install`
2. **Port 8080 available**: Check if another process is using port 8080
3. **Node.js version**: Ensure Node.js 18+ is installed (`node --version`)
4. **Environment variables**: Verify `.env` file exists with required variables
5. **Vite configuration**: Check `vite.config.ts:8-11` for port configuration

**Solutions**:

- Kill process on port 8080: `lsof -ti:8080 | xargs kill -9`
- Use different port: Modify `vite.config.ts` port setting
- Clear node_modules: `rm -rf node_modules && npm install`

### 2. Graph Not Loading

**Symptoms**: Graph visualization shows empty or "Loading..." indefinitely.

**Checklist**:

1. **Last.fm API key**: Verify `LASTFM_API_KEY` is set in Supabase Edge Function environment variables
2. **Supabase credentials**: Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`
3. **Network connectivity**: Check browser console for CORS or network errors
4. **Artist name**: Verify artist exists on Last.fm
5. **Browser console**: Look for error messages in developer tools

**Debug Steps**:

1. Test API directly: `curl "http://localhost:54321/functions/v1/lastfm?action=search&q=radiohead"`
2. Check Edge Function logs in Supabase dashboard
3. Verify CORS headers in `supabase/functions/lastfm/index.ts:3-6`
4. Test with different artist names

### 3. TypeScript Errors

**Symptoms**: Type errors during build or in IDE.

**Checklist**:

1. **TypeScript configuration**: Check `tsconfig.json:4-16` (strict mode is disabled)
2. **Missing types**: Ensure all imports have correct type definitions
3. **Path aliases**: Use `@/` for `src/` imports (`vite.config.ts:13-17`)
4. **Generated types**: Regenerate Supabase types if database changed

**Solutions**:

- Run `npm run lint` to identify issues
- Check `src/integrations/supabase/types.ts:1-237` for database types
- Use TypeScript's loose configuration (strict mode disabled)
- Add type definitions for missing modules

### 4. Build Failures

**Symptoms**: `npm run build` fails with errors.

**Checklist**:

1. **Type errors**: Run `npm run lint` first
2. **Missing dependencies**: Check `package.json` for all required packages
3. **Environment variables**: All `VITE_` variables must be available at build time
4. **Path issues**: Verify path aliases in `vite.config.ts:13-17`

**Solutions**:

- Check build output for specific error messages
- Ensure all environment variables are set
- Clear build cache: `rm -rf dist && npm run build`
- Check Vite configuration in `vite.config.ts:1-19`

### 5. Database Connection Issues

**Symptoms**: "Failed to fetch" or database errors in console.

**Checklist**:

1. **Supabase project**: Verify project is active in Supabase dashboard
2. **RLS policies**: Check `supabase/migrations/*.sql:31-43` for public read access
3. **Table existence**: Verify artists and similarity_edges tables exist
4. **Network requests**: Check browser network tab for failed requests

**Debug Steps**:

1. Test Supabase connection directly
2. Check Supabase dashboard for table data
3. Verify migration was applied: `supabase/migrations/20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`
4. Test Edge Function independently

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
3. **Memory leaks**: Check D3.js simulation cleanup (`ForceGraph.tsx:247-250`)
4. **API calls**: Excessive API calls due to missing caching

**Optimizations**:

- Reduce graph depth in `GraphControls.tsx:1-45`
- Increase similarity threshold to filter edges
- Ensure simulation stops on component unmount
- Implement debouncing for search (`ArtistSearch.tsx:23-37`)

## Debugging Techniques

### Browser Developer Tools

#### Console Errors

Check for JavaScript errors, network failures, or React errors.

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

### Edge Function Debugging

#### Local Testing

Test Edge Function locally with Supabase CLI:

```bash
supabase functions serve lastfm
```

#### Logging

Add console logs to `supabase/functions/lastfm/index.ts`:

```typescript
console.log('Processing request:', { action, artist, depth });
```

#### Direct API Testing

Test endpoints directly:

```bash
# Search artists
curl "http://localhost:54321/functions/v1/lastfm?action=search&q=radiohead"

# Get graph data
curl "http://localhost:54321/functions/v1/lastfm?action=graph&artist=radiohead&depth=2"

# Get artist details
curl "http://localhost:54321/functions/v1/lastfm?action=artist&name=radiohead"
```

### Database Debugging

#### Query Testing

Test database queries directly in Supabase SQL editor:

```sql
-- Check artists table
SELECT * FROM artists WHERE name ILIKE '%radiohead%' LIMIT 5;

-- Check similarity edges
SELECT * FROM similarity_edges
WHERE source_artist_id IN (SELECT id FROM artists WHERE name = 'Radiohead')
LIMIT 10;

-- Check table counts
SELECT COUNT(*) as artist_count FROM artists;
SELECT COUNT(*) as edge_count FROM similarity_edges;
```

#### Index Verification

Ensure indexes exist and are being used:

```sql
-- Check indexes
SELECT * FROM pg_indexes WHERE tablename IN ('artists', 'similarity_edges');

-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM artists WHERE name = 'Radiohead';
```

## Common Error Messages

### "Failed to fetch"

**Cause**: Network error, CORS issue, or API endpoint unavailable.

**Solutions**:

1. Check browser console for CORS errors
2. Verify Edge Function is deployed and running
3. Check Supabase project status
4. Verify CORS headers in `index.ts:3-6`

### "Artist not found"

**Cause**: Artist doesn't exist on Last.fm or API key issue.

**Solutions**:

1. Verify artist name spelling
2. Check Last.fm API key in Supabase dashboard
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

1. Ensure `simulation.stop()` is called in cleanup (`ForceGraph.tsx:247-250`)
2. Check event listener removal
3. Verify component unmounts properly

## Environment-Specific Issues

### Development Environment

#### Hot Reload Not Working

1. Check Vite configuration in `vite.config.ts:12`
2. Restart dev server
3. Clear browser cache

#### ESLint Errors

1. Run `npm run lint` to see all errors
2. Check `eslint.config.js:1-27` for configuration
3. Disable specific rules if needed (e.g., `@typescript-eslint/no-unused-vars` is disabled)

### Production Environment

#### Build Errors

1. Check environment variables are set in build process
2. Verify all dependencies are in `package.json`
3. Test with `npm run build:dev` first

#### Runtime Errors

1. Check browser console for errors
2. Verify Supabase environment variables
3. Test API endpoints directly

#### Performance Issues

1. Enable production optimizations in Vite
2. Check bundle size with `npm run build -- --report`
3. Implement code splitting if needed

## Database Issues

### Migration Problems

#### Migration Not Applied

1. Check Supabase dashboard for migration status
2. Run migration manually if needed
3. Verify table structure matches migration SQL

#### Data Consistency

1. Check foreign key constraints
2. Verify artist names are unique (case-insensitive search)
3. Ensure similarity edges have valid artist IDs

### Query Performance

#### Slow Searches

1. Verify `idx_artists_name` index exists (`supabase/migrations/*.sql:46`)
2. Check query plans with `EXPLAIN ANALYZE`
3. Consider adding more specific indexes

#### Graph Loading Delays

1. Limit BFS depth to 2 or 3 hops
2. Implement client-side caching
3. Optimize similarity edge queries

## API Integration Issues

### Last.fm API Limits

#### Rate Limiting

1. Implement client-side caching
2. Add delay between requests if needed
3. Use database cache to reduce API calls

#### API Changes

1. Check Last.fm API documentation for changes
2. Update Edge Function if API response format changes
3. Handle API version deprecation

### Supabase Edge Function Issues

#### Deployment Failures

1. Check Supabase CLI version
2. Verify environment variables are set
3. Check function size limits

#### Runtime Errors

1. Check Edge Function logs in Supabase dashboard
2. Add more detailed error logging
3. Test with simple requests first

## Getting Help

### Check Existing Documentation

1. `docs/development-workflow.md` - Setup and scripts
2. `docs/architecture-patterns.md` - System design
3. `docs/code-conventions.md` - Coding patterns
4. `docs/common-tasks.md` - Step-by-step guides

### Examine Code Examples

1. `ArtistSearch.tsx:14-37` - Search component pattern
2. `ForceGraph.tsx:19-314` - D3.js integration
3. `useLastFm.ts:7-92` - API hook pattern
4. `supabase/functions/lastfm/index.ts:122-187` - BFS algorithm

### Test Minimal Cases

1. Create minimal reproduction of the issue
2. Test with simplest possible configuration
3. Isolate the problem component or function

### Community Resources

1. Check Supabase documentation for Edge Functions
2. Refer to D3.js documentation for graph issues
3. Check React and TypeScript documentation for framework issues
4. Review Last.fm API documentation for integration issues
