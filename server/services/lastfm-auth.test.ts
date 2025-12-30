import { describe, expect, it } from 'bun:test'
import { Effect, Layer } from 'effect'
import { ServerConfig } from '../config'
import { LastFmAuthService, LastFmAuthServiceLive } from './lastfm-auth'

describe('LastFmAuthService', () => {
  const TestConfigLive = Layer.succeed(ServerConfig, {
    port: 3099,
    lastFmApiKey: 'test-key',
    lastFmSharedSecret: 'test-secret',
  })

  const TestLayer = LastFmAuthServiceLive.pipe(Layer.provide(TestConfigLive))

  it('should fail with invalid token', async () => {
    const program = Effect.gen(function* () {
      const service = yield* LastFmAuthService
      return yield* service.getSession('invalid-token')
    }).pipe(Effect.provide(TestLayer), Effect.either)

    const result = await Effect.runPromise(program)

    expect(result._tag).toBe('Left')
  })

  it('should have LastFmAuthError tag on failure', async () => {
    const program = Effect.gen(function* () {
      const service = yield* LastFmAuthService
      return yield* service.getSession('invalid-token')
    }).pipe(
      Effect.provide(TestLayer),
      Effect.catchTag('musiqasik/LastFmAuthError', (error) =>
        Effect.succeed({ caught: true, error }),
      ),
    )

    const result = await Effect.runPromise(program)

    expect(result).toHaveProperty('caught', true)
  })
})
