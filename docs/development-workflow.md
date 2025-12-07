# Development Workflow

## Setup

### Prerequisites
- Node.js 18+ or Bun
- Supabase account with project
- Last.fm API key

### Installation
1. Install dependencies: `npm install` or `bun install`
2. Create `.env` file in project root with:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```
3. Set Edge Function environment variables in Supabase dashboard:
   - `LASTFM_API_KEY`: Your Last.fm API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Database Setup
The database schema is automatically applied via the migration in `supabase/migrations/`. No additional setup is needed for local development if using Supabase's hosted service.

## Available Scripts

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build:dev` - Build for development mode
- `npm run preview` - Preview production build locally

### Production
- `npm run build` - Build for production (outputs to `dist/` directory)

### Code Quality
- `npm run lint` - Run ESLint with TypeScript and React rules

### Development Server
- **Port**: 8080
- **Host**: All interfaces (`::`)
- **Hot Reload**: Enabled via Vite
- **Component Tagging**: `lovable-tagger` plugin in development mode (`vite.config.ts:12`)

## Build Configuration

### Vite Configuration (`vite.config.ts:1-19`)
- Uses SWC for fast React compilation
- Path aliases: `@/` maps to `./src/` (`vite.config.ts:13-17`)
- Development plugin: `lovable-tagger` for component tagging
- Port 8080 with host `::` (all interfaces)

### TypeScript Configuration
- **Main config**: `tsconfig.json` with loose settings (strict mode disabled)
- **App config**: `tsconfig.app.json` for React application
- **Node config**: `tsconfig.node.json` for build tools
- Path aliases configured in all TypeScript configs

### Tailwind CSS (`tailwind.config.ts:1-92`)
- Custom theme with CSS variables
- Extended colors, font family, and animations
- Supports dark mode via CSS variables

### ESLint Configuration (`eslint.config.js:1-27`)
- TypeScript + React rules
- React Hooks plugin enabled
- React Refresh plugin for fast refresh
- `@typescript-eslint/no-unused-vars` disabled

## Environment Configuration

### Frontend (`.env`)
Required variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key

### Supabase Edge Function
Set in Supabase dashboard under Edge Function environment variables:
- `LASTFM_API_KEY`: Last.fm API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### CORS Configuration
Edge Function CORS headers are configured in `supabase/functions/lastfm/index.ts:3-6`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Development Practices

### Code Organization
- **Components**: `src/components/` with PascalCase naming
- **Hooks**: `src/hooks/` for custom React hooks
- **Pages**: `src/pages/` for route components
- **Types**: `src/types/` for TypeScript definitions
- **Utilities**: `src/lib/` for shared functions

### Import Order
Follow existing patterns in components:
1. External libraries
2. Internal types
3. UI components
4. Custom hooks
5. Utilities

Example from `ArtistSearch.tsx:1-6`:
```typescript
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Artist } from '../types/artist'
import { Input } from './ui/input'
import { useLastFm } from '../hooks/useLastFm'
import { cn } from '../lib/utils'
```

### Component Structure
Use named exports with TypeScript interfaces for props. Example from `ArtistSearch.tsx:14`:
```typescript
export function ArtistSearch({ onSelect }: ArtistSearchProps) {
  // Implementation
}
```

### Styling
- Use Tailwind utility classes
- Use `cn()` utility for conditional class merging (`src/lib/utils.ts:4-6`)
- Follow shadcn/ui component patterns
- Use CSS custom properties for theming (`src/index.css:6-100`)

## Database Development

### Migrations
- Located in `supabase/migrations/`
- Use SQL format with proper constraints and indexes
- Single migration file: `20251206090945_d06f88bc-a267-4bf6-a9e5-579419654fc7.sql`

### Schema Changes
1. Create new migration file in `supabase/migrations/`
2. Write SQL with proper constraints and indexes
3. Update TypeScript types in `src/integrations/supabase/types.ts:1-237`
4. Test with local Supabase instance

### Database Schema
- **artists table**: Caches Last.fm artist data (`supabase/migrations/*.sql:5-17`)
- **similarity_edges table**: Stores artist similarity relationships with match scores (`sql:20-28`)
- **Indexes**: Optimized for name searches and edge lookups (`sql:46-49`)
- **RLS Policies**: Public read access for guest-only app (`sql:31-43`)

## Testing

### Manual Testing
- Development server: `npm run dev`
- Browser console for errors
- React DevTools for component inspection
- Network tab for API calls

### Linting
- Run `npm run lint` to check code quality
- ESLint configuration: `eslint.config.js:1-27`
- TypeScript checking via Vite build

### No Automated Tests
The project currently relies on manual testing and ESLint for code quality. Consider adding tests for critical paths if the project grows.

## Deployment

### Production Build
1. Run `npm run build`
2. Output goes to `dist/` directory
3. Deploy `dist/` contents to your hosting service

### Supabase Deployment
1. Push migrations: `supabase db push`
2. Deploy Edge Function: `supabase functions deploy lastfm`
3. Set environment variables in Supabase dashboard

### Environment Variables
Ensure all environment variables are set in production:
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge Function: `LASTFM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`