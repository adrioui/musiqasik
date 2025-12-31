import { Effect, Layer, pipe } from 'effect'
import type { Artist } from '@/types/artist'
import { DatabaseService, GraphService, LastFmService } from './tags'

// Concurrency limiter for parallel API calls
const parallelMapWithLimit = <T, U, E>(
  items: T[],
  mapper: (item: T) => Effect.Effect<U | null, E>,
  concurrency: number,
): Effect.Effect<(U | null)[], E> => {
  // Process in batches
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency))
  }

  return Effect.reduce(batches, [] as (U | null)[], (acc, batch) =>
    pipe(
      Effect.all(batch.map(mapper), { concurrency }),
      Effect.map((results) => [...acc, ...results]),
    ),
  )
}

const makeGraphService = Effect.gen(function* () {
  const lastFm = yield* LastFmService
  const db = yield* DatabaseService

  return GraphService.of({
    buildGraphFromLastFmOnly: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const visited = new Set<string>()
        const nodes: Artist[] = []
        const edges: Array<{ source: string; target: string; weight: number }> = []
        let center: Artist | null = null

        const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }]

        while (queue.length > 0) {
          const current = queue.shift()!
          const normalizedName = current.name.toLowerCase()

          if (visited.has(normalizedName)) continue
          visited.add(normalizedName)

          const artistResult = yield* lastFm
            .getArtistInfo(current.name)
            .pipe(Effect.catchAll(() => Effect.succeed(null)))

          if (!artistResult) continue

          nodes.push(artistResult)
          if (current.depth === 0) {
            center = artistResult
          }

          if (current.depth < maxDepth) {
            const similar = yield* lastFm
              .getSimilarArtists(current.name)
              .pipe(Effect.catchAll(() => Effect.succeed([])))

            for (const sim of similar.slice(0, 10)) {
              edges.push({
                source: artistResult.name,
                target: sim.name,
                weight: sim.match,
              })

              if (!visited.has(sim.name.toLowerCase())) {
                queue.push({ name: sim.name, depth: current.depth + 1 })
              }
            }
          }
        }

        return { nodes, edges, center }
      }),

    buildGraph: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const startTime = Date.now()
        const visited = new Set<string>()
        const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }]
        const nodes: Artist[] = []
        const edges: Array<{ source: string; target: string; weight: number }> = []
        let center: Artist | null = null

        // Per-request cache
        const requestCache = new Map<string, Artist>()

        while (queue.length > 0) {
          const current = queue.shift()!
          const normalizedName = current.name.toLowerCase()

          if (visited.has(normalizedName)) continue
          visited.add(normalizedName)

          // Check cache first, then database
          let artist = requestCache.get(normalizedName)
          if (!artist) {
            const dbArtist = yield* db.getArtist(current.name)
            if (dbArtist) {
              artist = dbArtist
            }
          }

          if (!artist) {
            // Fetch from Last.fm
            const artistInfo = yield* lastFm.getArtistInfo(current.name)
            if (!artistInfo) continue

            artist = yield* db.upsertArtist(artistInfo)
          }

          if (artist) {
            requestCache.set(normalizedName, artist)
            nodes.push(artist)

            if (current.depth === 0) {
              center = artist
            }

            // Get similar artists if not at max depth
            if (current.depth < maxDepth) {
              // Check for cached edges first
              const cachedEdges = yield* db.getCachedEdges(artist.id!)

              if (cachedEdges.length > 0) {
                // Use cached edges
                for (const edge of cachedEdges) {
                  if (edge.target) {
                    edges.push({
                      source: artist.name,
                      target: edge.target.name,
                      weight: edge.match_score,
                    })

                    if (!visited.has(edge.target.name.toLowerCase())) {
                      queue.push({
                        name: edge.target.name,
                        depth: current.depth + 1,
                      })
                    }
                  }
                }
              } else {
                // Fetch from Last.fm
                const similar = yield* lastFm.getSimilarArtists(current.name)

                // Process all similar artists with concurrency limit
                const currentArtist = artist // Capture for closure
                const currentDepth = current.depth

                const results = yield* parallelMapWithLimit(
                  similar,
                  (sim) =>
                    Effect.gen(function* () {
                      // Get or create target artist
                      let targetArtist =
                        requestCache.get(sim.name.toLowerCase()) || (yield* db.getArtist(sim.name))

                      if (!targetArtist) {
                        const targetInfo = yield* lastFm.getArtistInfo(sim.name)
                        if (targetInfo) {
                          targetArtist = yield* db.upsertArtist(targetInfo)
                        }
                      }

                      if (targetArtist) {
                        requestCache.set(sim.name.toLowerCase(), targetArtist)

                        return {
                          edge: {
                            source: currentArtist.name,
                            target: targetArtist.name,
                            weight: sim.match,
                          },
                          shouldQueue: !visited.has(sim.name.toLowerCase()),
                          name: sim.name,
                          depth: currentDepth + 1,
                          sourceId: currentArtist.id!,
                          targetId: targetArtist.id!,
                          matchScore: sim.match,
                        }
                      }
                      return null
                    }).pipe(Effect.catchAll(() => Effect.succeed(null))),
                  5, // Limit to 5 concurrent requests
                )

                // Collect edges to upsert
                const edgesToUpsert: Array<{
                  source_artist_id: string
                  target_artist_id: string
                  match_score: number
                  depth: number
                }> = []

                // Process results
                for (const result of results) {
                  if (result) {
                    edges.push(result.edge)
                    if (result.shouldQueue) {
                      queue.push({ name: result.name, depth: result.depth })
                    }
                    edgesToUpsert.push({
                      source_artist_id: result.sourceId,
                      target_artist_id: result.targetId,
                      match_score: result.matchScore,
                      depth: result.depth,
                    })
                  }
                }

                // Batch upsert edges
                if (edgesToUpsert.length > 0) {
                  yield* db.upsertEdges(edgesToUpsert)
                }
              }
            }
          }
        }

        const endTime = Date.now()
        const duration = endTime - startTime

        return {
          nodes,
          edges,
          center,
          metrics: {
            duration,
            nodeCount: nodes.length,
          },
        }
      }),
  })
})

export const GraphServiceLive = Layer.effect(GraphService, makeGraphService)

// Separate layer for LastFm-only graph building (no DB dependency)
const makeGraphServiceLastFmOnly = Effect.gen(function* () {
  const lastFm = yield* LastFmService

  return GraphService.of({
    buildGraphFromLastFmOnly: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const visited = new Set<string>()
        const nodes: Artist[] = []
        const edges: Array<{ source: string; target: string; weight: number }> = []
        let center: Artist | null = null

        const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }]

        while (queue.length > 0) {
          const current = queue.shift()!
          const normalizedName = current.name.toLowerCase()

          if (visited.has(normalizedName)) continue
          visited.add(normalizedName)

          const artistResult = yield* lastFm
            .getArtistInfo(current.name)
            .pipe(Effect.catchAll(() => Effect.succeed(null)))

          if (!artistResult) continue

          nodes.push(artistResult)
          if (current.depth === 0) {
            center = artistResult
          }

          if (current.depth < maxDepth) {
            const similar = yield* lastFm
              .getSimilarArtists(current.name)
              .pipe(Effect.catchAll(() => Effect.succeed([])))

            for (const sim of similar.slice(0, 10)) {
              edges.push({
                source: artistResult.name,
                target: sim.name,
                weight: sim.match,
              })

              if (!visited.has(sim.name.toLowerCase())) {
                queue.push({ name: sim.name, depth: current.depth + 1 })
              }
            }
          }
        }

        return { nodes, edges, center }
      }),

    // Stub implementation - throws if called without DB
    buildGraph: () =>
      Effect.fail(
        new Error('buildGraph requires DatabaseService - use buildGraphFromLastFmOnly instead'),
      ) as Effect.Effect<never, never>,
  })
})

export const GraphServiceLastFmOnlyLive = Layer.effect(GraphService, makeGraphServiceLastFmOnly)
