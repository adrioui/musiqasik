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
      expect(body.error).toBe('Invalid token format')
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
      expect(body.error).toBe('Invalid token format')
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
      expect(body.error).toBe('Invalid token format')
    })

    it('should return 400 when token is too long', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'a'.repeat(65) }),
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('Token too long')
    })

    it('should return 400 when token contains invalid characters', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token!' }),
      })
      const response = await app.fetch(request, mockEnv)

      expect(response.status).toBe(400)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBe('Invalid token characters')
    })

    it('should return error for invalid token (upstream error)', async () => {
      const request = new Request('http://localhost/api/lastfm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalidtoken' }),
      })
      const response = await app.fetch(request, mockEnv)

      // Should return 500 or 401 depending on the error from Last.fm
      // Note: Since we are mocking Env but not fetch deeply, it might fail in different ways
      expect([401, 500]).toContain(response.status)

      const body = (await response.json()) as ErrorResponse
      expect(body.error).toBeDefined()
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
