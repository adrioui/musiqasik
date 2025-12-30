import { afterAll, beforeAll } from 'bun:test'

// Global setup for server tests
beforeAll(() => {
  // Set test environment variables
  process.env.PORT = '3099'
  process.env.VITE_LASTFM_API_KEY = 'test-key'
  process.env.LASTFM_SHARED_SECRET = 'test-secret'
})

afterAll(() => {
  // Cleanup if needed
})
