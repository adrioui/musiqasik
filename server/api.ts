import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform';
import { Schema } from 'effect';

// Request/Response schemas
export const SessionRequest = Schema.Struct({
  token: Schema.String,
});

export const SessionResponse = Schema.Struct({
  sessionKey: Schema.String,
  username: Schema.String,
});

export const HealthResponse = Schema.Struct({
  status: Schema.Literal('ok'),
  timestamp: Schema.String,
});

export const ErrorResponse = Schema.Struct({
  error: Schema.String,
});

// Define endpoints
const healthEndpoint = HttpApiEndpoint.get('health', '/api/health').addSuccess(HealthResponse);

const sessionEndpoint = HttpApiEndpoint.post('session', '/api/lastfm/session')
  .setPayload(SessionRequest)
  .addSuccess(SessionResponse)
  .addError(ErrorResponse, { status: 400 })
  .addError(ErrorResponse, { status: 401 })
  .addError(ErrorResponse, { status: 500 });

// Group endpoints
const apiGroup = HttpApiGroup.make('api').add(healthEndpoint).add(sessionEndpoint);

// Export the full API definition
export class MusiqasiQApi extends HttpApi.make('MusiqasiQ').add(apiGroup) {}
