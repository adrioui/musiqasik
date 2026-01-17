import { Effect, Layer, Exit, Cause, Option } from 'effect'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { makeWorkerConfigLayer } from './config'
import { LastFmAuthError, LastFmAuthService, LastFmAuthServiceLive } from './services/lastfm-auth'

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  LASTFM_API_KEY: string
  LASTFM_SHARED_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS for API routes
app.use('/api/*', cors({ origin: '*' }))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Session endpoint
app.post('/api/lastfm/session', async (c) => {
  const body = await c.req.json<{ token?: string }>().catch(() => ({ token: undefined }))

  const token = body.token
  if (!token) {
    return c.json({ error: 'No token provided' }, 400)
  }

  // Security: Input validation
  if (typeof token !== 'string') {
    return c.json({ error: 'Invalid token format' }, 400)
  }
  if (token.length > 256) {
    return c.json({ error: 'Token too long' }, 400)
  }

  // Create Effect layers with CloudFlare env bindings
  const ConfigLayer = makeWorkerConfigLayer({
    LASTFM_API_KEY: c.env.LASTFM_API_KEY,
    LASTFM_SHARED_SECRET: c.env.LASTFM_SHARED_SECRET,
  })

  const AppLayer = Layer.provide(LastFmAuthServiceLive, ConfigLayer)

  const program = Effect.gen(function* () {
    const authService = yield* LastFmAuthService
    return yield* authService.getSession(token)
  }).pipe(Effect.provide(AppLayer))

  const exit = await Effect.runPromiseExit(program)

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value)
  }

  const failureOption = Cause.failureOption(exit.cause)
  if (Option.isSome(failureOption)) {
    const error = failureOption.value
    if (error instanceof LastFmAuthError) {
      const isAuthError =
        error.code === 4 || error.code === 14 || error.code === 401 || error.code === 403
      return c.json({ error: error.message }, isAuthError ? 401 : 500)
    }
  }

  // Security: Log error server-side but return generic message to client to avoid information leakage
  console.error('Unexpected API error:', Cause.pretty(exit.cause))
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 404 for unknown API routes
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

// Fallback to static assets for all other routes
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
