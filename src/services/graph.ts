import { Effect, Layer } from 'effect'
import type { Artist } from '@/types/artist'
import { GraphService, LastFmService } from './tags'

const makeGraphService = Effect.gen(function* () {
  const lastFm = yield* LastFmService

  return GraphService.of({
    buildGraph: (artistName: string, maxDepth: number) =>
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
  })
})

export const GraphServiceLive = Layer.effect(GraphService, makeGraphService)
