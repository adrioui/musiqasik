import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

// Request/Response schemas
export const SessionRequest = Schema.Struct({
  token: Schema.String,
})

export const SessionResponse = Schema.Struct({
  sessionKey: Schema.String,
  username: Schema.String,
})

export const HealthResponse = Schema.Struct({
  status: Schema.Literal('ok'),
  timestamp: Schema.String,
})

// Separate error schemas for different status codes
export class BadRequestError extends Schema.TaggedError<BadRequestError>()('BadRequestError', {
  error: Schema.String,
}) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {
    error: Schema.String,
  },
) {}

export class ServerError extends Schema.TaggedError<ServerError>()('ServerError', {
  error: Schema.String,
}) {}

// Define endpoints
const healthEndpoint = HttpApiEndpoint.get('health', '/api/health').addSuccess(HealthResponse)

const sessionEndpoint = HttpApiEndpoint.post('session', '/api/lastfm/session')
  .setPayload(SessionRequest)
  .addSuccess(SessionResponse)
  .addError(BadRequestError, { status: 400 })
  .addError(UnauthorizedError, { status: 401 })
  .addError(ServerError, { status: 500 })

// Group endpoints
const apiGroup = HttpApiGroup.make('api').add(healthEndpoint).add(sessionEndpoint)

// Export the full API definition
export class MusiqasiQApi extends HttpApi.make('MusiqasiQ').add(apiGroup) {}
