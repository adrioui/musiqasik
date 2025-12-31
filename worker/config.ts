import { Context, Layer } from 'effect'

export class WorkerConfig extends Context.Tag('musiqasik/WorkerConfig')<
  WorkerConfig,
  {
    readonly lastFmApiKey: string
    readonly lastFmSharedSecret: string
  }
>() {}

export const makeWorkerConfigLayer = (env: {
  LASTFM_API_KEY: string
  LASTFM_SHARED_SECRET: string
}) =>
  Layer.succeed(WorkerConfig, {
    lastFmApiKey: env.LASTFM_API_KEY,
    lastFmSharedSecret: env.LASTFM_SHARED_SECRET,
  })
