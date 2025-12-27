import { Effect, Layer, pipe } from 'effect';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { ServerConfig, ServerConfigLive } from './config';
import { LastFmAuthService, LastFmAuthServiceLive, LastFmAuthError } from './services/lastfm-auth';

// Parse JSON body from request
function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// Type for auth service methods
type AuthServiceType = {
  readonly getSession: (
    token: string
  ) => Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError>;
};

// Type for config
type ConfigType = {
  readonly port: number;
  readonly lastFmApiKey: string;
  readonly lastFmSharedSecret: string;
};

// Create the request handler
function createHandler(config: ConfigType, authService: AuthServiceType) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${config.port}`);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // Health check
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    // Last.fm session exchange
    if (req.method === 'POST' && url.pathname === '/api/lastfm/session') {
      try {
        const body = (await parseBody(req)) as { token?: string };

        if (!body.token) {
          sendJson(res, { error: 'No token provided' }, 400);
          return;
        }

        const effect = pipe(
          authService.getSession(body.token),
          Effect.map((result) => ({ success: true as const, data: result })),
          Effect.catchAll((error: LastFmAuthError) =>
            Effect.succeed({
              success: false as const,
              error: error.message,
              status: error.code === 4 ? 401 : 500,
            })
          )
        );

        const result = await Effect.runPromise(effect);

        if (result.success) {
          sendJson(res, result.data);
        } else {
          sendJson(res, { error: result.error }, result.status);
        }
      } catch (error) {
        console.error('Session exchange error:', error);
        sendJson(res, { error: 'Internal server error' }, 500);
      }
      return;
    }

    // 404
    sendJson(res, { error: 'Not found' }, 404);
  };
}

// Main program using Effect
const main = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const authService = yield* LastFmAuthService;

  const handler = createHandler(config, authService);
  const server = createServer(handler);

  yield* Effect.sync(() => {
    server.listen(config.port, () => {
      console.log(`🚀 Server running at http://localhost:${config.port}`);
      console.log('   POST /api/lastfm/session - Exchange OAuth token');
      console.log('   GET  /api/health         - Health check');
    });
  });

  // Keep server running
  yield* Effect.never;
});

// Compose layers: LastFmAuthServiceLive requires ServerConfig
const AppLayer = Layer.merge(
  ServerConfigLive,
  LastFmAuthServiceLive.pipe(Layer.provide(ServerConfigLive))
);

// Run with composed layers
const program = Effect.provide(main, AppLayer);

Effect.runPromise(program).catch(console.error);
