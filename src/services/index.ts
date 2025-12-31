import { Layer } from 'effect'

// Re-export service tags
export { ConfigService, GraphService, LastFmService } from './tags'

import { ConfigService } from './tags'

// ConfigLive layer - provides configuration from environment
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
})

// Re-export service implementations
export { GraphServiceLive } from './graph'
export { LastFmServiceLive } from './lastfm'
