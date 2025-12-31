import { Effect, Layer, ManagedRuntime } from 'effect'
import { useCallback, useState } from 'react'
import {
  ConfigLive,
  GraphService,
  GraphServiceLive,
  LastFmService,
  LastFmServiceLive,
} from '@/services'
import type { Artist, GraphData } from '@/types/artist'

// Build layers with proper dependency order
const LastFmLayer = Layer.provide(LastFmServiceLive, ConfigLive)
const GraphLayer = Layer.provide(GraphServiceLive, LastFmLayer)
const AppLayer = Layer.mergeAll(LastFmLayer, GraphLayer)

// Lazy runtime initialization
type AppRuntimeType = ManagedRuntime.ManagedRuntime<LastFmService | GraphService, unknown>

let appRuntime: AppRuntimeType | null = null
let appRuntimePromise: Promise<AppRuntimeType | null> | null = null

const getRuntime = async (): Promise<AppRuntimeType | null> => {
  if (appRuntime) {
    return appRuntime
  }

  if (!appRuntimePromise) {
    appRuntimePromise = (async () => {
      try {
        appRuntime = ManagedRuntime.make(AppLayer)
        return appRuntime
      } catch (err) {
        console.warn('Runtime initialization failed:', err)
        return null
      }
    })()
  }

  return appRuntimePromise
}

export function useLastFm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchArtists = useCallback(
    async (query: string, signal?: AbortSignal): Promise<Artist[]> => {
      if (!query.trim()) return []

      setIsLoading(true)
      setError(null)

      try {
        const runtime = await getRuntime()

        if (!runtime) {
          throw new Error('Service not available. Check your API key configuration.')
        }

        const effect = Effect.gen(function* () {
          const lastFm = yield* LastFmService
          return yield* lastFm.searchArtists(query)
        })

        // Handle abort signal
        if (signal) {
          return await new Promise<Artist[]>((resolve, reject) => {
            const abortHandler = () => {
              reject(new DOMException('Aborted', 'AbortError'))
            }
            signal.addEventListener('abort', abortHandler)
            runtime
              .runPromise(effect)
              .then(resolve)
              .catch(reject)
              .finally(() => {
                signal.removeEventListener('abort', abortHandler)
              })
          })
        }

        return await runtime.runPromise(effect)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err
        }
        const message = err instanceof Error ? err.message : 'Search failed'
        console.error('Search error:', err)
        setError(message)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const getGraph = useCallback(
    async (artistName: string, depth: number = 1): Promise<GraphData | null> => {
      if (!artistName.trim()) return null

      setIsLoading(true)
      setError(null)

      try {
        const runtime = await getRuntime()

        if (!runtime) {
          throw new Error('Service not available')
        }

        const effect = Effect.gen(function* () {
          const graph = yield* GraphService
          return yield* graph.buildGraph(artistName, Math.min(depth, 2))
        })

        return await runtime.runPromise(effect)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch graph'
        console.error('Graph error:', err)
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const getArtist = useCallback(async (name: string): Promise<Artist | null> => {
    if (!name.trim()) return null

    setIsLoading(true)
    setError(null)

    try {
      const runtime = await getRuntime()

      if (!runtime) {
        throw new Error('Service not available')
      }

      const effect = Effect.gen(function* () {
        const lastFm = yield* LastFmService
        return yield* lastFm.getArtistInfo(name)
      })

      return await runtime.runPromise(effect)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artist'
      console.error('Get artist error:', err)
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    searchArtists,
    getGraph,
    getArtist,
    isLoading,
    error,
  }
}
