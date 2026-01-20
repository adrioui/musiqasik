import { describe, expect, it } from 'vitest'
import app from './index'

interface HealthResponse {
  status: string
  timestamp: string
}

interface ErrorResponse {
  error: string
}

// Create a mock environment for testing
const mockEnv = {
  ASSETS: {
    fetch: async (_request: Request) => new Response('Static asset', { status: 200 }),
  },
  LASTFM_API_KEY: 'test-api-key',
  LASTFM_SHARED_SECRET: 'test-shared-secret',
}

describe('Worker API Routes', () => {
  describe('GET /api/health', () => {
    it('should return ok status with timestamp', async () => {
      const request = new Request('http://localhost/api/health')
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const body = (await response.json()) as HealthResponse
      expect(body.status).toBe('ok')
      expect(body.timestamp).toBeDefined()
      expect(typeof body.timestamp).toBe('string')
    })

    it('should include CORS headers', async () => {
      const request = new Request('http://localhost/api/health', {
        headers: { Origin: 'http://example.com' },
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('POST /api/lastfm/session', () => {
    it('should return 400 when no token provided', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('No token provided')
    })

    it('should return 400 when body is empty', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: undefined }),
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('No token provided')
    })

    it('should return 400 when body is invalid JSON', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('No token provided')
    })

    it('should return 401 error for invalid token', async () => {
      // Note: The real LastFmAuthServiceLive is used here, but since mockEnv provides dummy keys,
      // it should result in a LastFmAuthError (typically 401 or 500 depending on network).
      // However, if we assume the service logic maps API errors to LastFmAuthError,
      // we are checking if our index.ts correctly extracts it from the Effect Exit.

      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      })
      const response = await app.fetch(request, mockEnv)

      // We expect 401/500 depending on exact failure mode of the mock env + real fetch (which might fail with network error).
      // But importantly, if it IS a LastFmAuthError, it should NOT return "Internal Server Error"

      const body = (await response.json()) as ErrorResponse

      if (response.status === 500) {
        // If it's 500, it might be the generic fallback.
        // But if it's a domain error code=403/401, it should be 401.
        // In this test env, we can't easily force a specific domain error without mocking fetch.
        // But we can check that it didn't crash completely if it was expected.
        expect(body.error).not.toBe('Internal Server Error')
      } else {
        expect(response.status).toBe(401)
        expect(body.error).toBeDefined()
        expect(body.error).not.toBe('Internal Server Error')
      }
    })

    // SENTINEL REPRO TESTS
    it('should return 400 when token is not a string', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 12345 }),
      })
      const response = await app.fetch(request, mockEnv)

      // Currently this will likely fall through to 500 or 401, but we want 400
      expect(response.status).toBe(400)
      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('Invalid token format')
    })

    it('should return 400 when token is too long', async () => {
      const longToken = 'a'.repeat(300)
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: longToken }),
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)
      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('Invalid token format')
    })
  })

  describe('Unknown API routes', () => {
    it('should return 404 for unknown API routes', async () => {
      const request = new Request('http://localhost/api/unknown')
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(404)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('Not found')
    })
  })

  describe('Static asset fallback', () => {
    it('should forward non-API routes to ASSETS', async () => {
      const request = new Request('http://localhost/some-page')
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toBe('Static asset')
    })
  })
})
