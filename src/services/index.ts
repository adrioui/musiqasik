import { Layer } from 'effect';

// Re-export service tags
export {
  LastFmService,
  DatabaseService,
  ConfigService,
  GraphService,
} from './tags';

import { ConfigService } from './tags';

// ConfigLive layer - provides configuration from environment
export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
  surrealdbWsUrl: import.meta.env.VITE_SURREALDB_WS_URL || '',
  surrealdbHttpUrl: import.meta.env.VITE_SURREALDB_HTTP_URL || '',
  surrealdbNamespace: import.meta.env.VITE_SURREALDB_NAMESPACE || 'musiqasik',
  surrealdbDatabase: import.meta.env.VITE_SURREALDB_DATABASE || 'main',
  surrealdbUser: import.meta.env.VITE_SURREALDB_USER || '',
  surrealdbPass: import.meta.env.VITE_SURREALDB_PASS || '',
});

// Re-export service implementations
export { GraphServiceLive } from './graph';
export { LastFmServiceLive } from './lastfm';
export { DatabaseServiceLive } from './database';
