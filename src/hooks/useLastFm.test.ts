import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Artist, GraphData } from '@/types/artist'

// Create proper mock service implementations
const mockSearchArtists = vi.fn().mockReturnValue([])
const mockGetArtistInfo = vi.fn().mockReturnValue(null)
const mockGetSimilarArtists = vi.fn().mockReturnValue([])
const mockBuildGraph = vi.fn().mockReturnValue({
  nodes: [],
  edges: [],
  center: null,
})

// Mock the services module with proper Effect implementations
vi.mock('@/services', () => {
  const { Context, Effect, Layer } = require('effect')

  const LastFmService = Context.GenericTag('LastFmService')
  const GraphService = Context.GenericTag('GraphService')
  const ConfigService = Context.GenericTag('ConfigService')

  const LastFmServiceLive = Layer.succeed(LastFmService, {
    searchArtists: (query: string) => Effect.sync(() => mockSearchArtists(query)),
    getArtistInfo: (name: string) => Effect.sync(() => mockGetArtistInfo(name)),
    getSimilarArtists: (name: string) => Effect.sync(() => mockGetSimilarArtists(name)),
  })

  const GraphServiceLive = Layer.succeed(GraphService, {
    buildGraph: (artistName: string, maxDepth: number) =>
      Effect.sync(() => mockBuildGraph(artistName, maxDepth)),
  })

  const ConfigLive = Layer.succeed(ConfigService, {
    lastFmApiKey: 'test-api-key',
  })

  return {
    LastFmService,
    GraphService,
    ConfigService,
    LastFmServiceLive,
    GraphServiceLive,
    ConfigLive,
  }
})

describe('useLastFm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.searchArtists).toBe('function')
    expect(typeof result.current.getGraph).toBe('function')
    expect(typeof result.current.getArtist).toBe('function')
  })

  it('should handle empty queries for searchArtists', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    let searchResult: Artist[] | undefined
    await act(async () => {
      searchResult = await result.current.searchArtists('   ')
    })

    expect(searchResult).toEqual([])
    expect(result.current.isLoading).toBe(false)
    // Mock should not be called for empty queries
    expect(mockSearchArtists).not.toHaveBeenCalled()
  })

  it('should handle empty artist name for getGraph', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    let graphResult: GraphData | null | undefined
    await act(async () => {
      graphResult = await result.current.getGraph('   ')
    })

    expect(graphResult).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(mockBuildGraph).not.toHaveBeenCalled()
  })

  it('should handle empty name for getArtist', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    let artistResult: Artist | null | undefined
    await act(async () => {
      artistResult = await result.current.getArtist('   ')
    })

    expect(artistResult).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(mockGetArtistInfo).not.toHaveBeenCalled()
  })

  it('should set isLoading to false after searchArtists completes', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    await act(async () => {
      await result.current.searchArtists('radiohead')
    })

    // After completion, isLoading should be false
    expect(result.current.isLoading).toBe(false)
  })

  it('should manage loading state during operations', async () => {
    const { useLastFm } = await import('./useLastFm')
    const { result } = renderHook(() => useLastFm())

    // Initially not loading
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.getGraph('radiohead', 1)
    })

    // After completion, not loading
    expect(result.current.isLoading).toBe(false)
  })
})
