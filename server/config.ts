import { Context, Layer } from 'effect';

export class ServerConfig extends Context.Tag('musiqasik/ServerConfig')<
  ServerConfig,
  {
    readonly port: number;
    readonly lastFmApiKey: string;
    readonly lastFmSharedSecret: string;
  }
>() {}

export const ServerConfigLive = Layer.succeed(ServerConfig, {
  port: parseInt(process.env.PORT || '3001', 10),
  lastFmApiKey: process.env.VITE_LASTFM_API_KEY || '',
  lastFmSharedSecret: process.env.LASTFM_SHARED_SECRET || '',
});
