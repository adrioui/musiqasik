import { Layer } from 'effect'

// Re-export service tags
export { ConfigService, GraphService, LastFmService } from './tags'

import { ConfigService } from './tags'

// ConfigLive layer - provides configuration from environment
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
})

// Development warning for missing API key
if (import.meta.env.DEV && !import.meta.env.VITE_LASTFM_API_KEY) {
  console.warn(
    '[MusiqasiQ] VITE_LASTFM_API_KEY is not set - API calls will fail. ' +
      'Copy .env.example to .env and add your Last.fm API key.',
  )
}

// Re-export service implementations
export { GraphServiceLive } from './graph'
export { LastFmServiceLive } from './lastfm'
