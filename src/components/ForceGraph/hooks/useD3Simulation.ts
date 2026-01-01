import * as d3 from 'd3'
import { useCallback, useEffect, useRef } from 'react'
import type { GraphLink, GraphNode } from '@/types/artist'

interface UseD3SimulationProps {
  nodes: GraphNode[]
  links: GraphLink[]
  width: number
  height: number
  onTick: () => void
}

interface UseD3SimulationResult {
  simulation: d3.Simulation<GraphNode, GraphLink> | null
  restart: () => void
  stop: () => void
}

export function useD3Simulation({
  nodes,
  links,
  width,
  height,
  onTick,
}: UseD3SimulationProps): UseD3SimulationResult {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const onTickRef = useRef(onTick)

  // Keep onTick ref up to date without triggering effect
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  // Only recreate simulation when nodes/links identity changes (not threshold filtering)
  useEffect(() => {
    if (nodes.length === 0) return

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    const centerX = width / 2
    const centerY = height / 2

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.name)
          .distance((d) => 120 + (1 - d.weight) * 150)
          .strength((d) => d.weight * 0.3),
      )
      // Radial orbital layout: center anchored, others orbit by role
      .force(
        'radial',
        d3
          .forceRadial<GraphNode>(
            (d) => {
              if (d.isCenter) return 0
              if (d.orbit === 'inner') return 180
              if (d.orbit === 'distant') return 320
              if (d.orbit === 'discovery') return 400
              return 250
            },
            centerX,
            centerY,
          )
          .strength(0.6),
      )
      .force('collision', d3.forceCollide().radius(60))
      .force('charge', d3.forceManyBody().strength(-100))
      .alphaDecay(0.03)
      .velocityDecay(0.4)
      .on('tick', () => {
        onTickRef.current()
      })

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [nodes, links, width, height])

  const restart = useCallback(() => {
    simulationRef.current?.alpha(0.3).restart()
  }, [])

  const stop = useCallback(() => {
    simulationRef.current?.stop()
  }, [])

  return {
    simulation: simulationRef.current,
    restart,
    stop,
  }
}
