import * as d3 from 'd3'
import { useCallback, useEffect, useRef } from 'react'
import type { GraphLink, GraphNode } from '@/types/artist'

// Force simulation tuning constants - adjust these if nodes overlap or feel too spread
const FORCE_CONFIG = {
  // Link distances
  linkDistanceBase: 200, // Was 120
  linkDistanceVariance: 200, // Was 150
  linkStrengthMultiplier: 0.25,

  // Radial orbit distances
  orbitInner: 280, // Was 180
  orbitDefault: 350, // Was 250
  orbitDistant: 420, // Was 320
  orbitDiscovery: 520, // Was 400
  radialStrength: 0.5,

  // Collision
  centerNodePadding: 130, // 120px radius + 10px padding
  orbitalNodePadding: 15,

  // Charge
  chargeStrength: -300, // Was -100
} as const

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
          .distance(
            (d) =>
              FORCE_CONFIG.linkDistanceBase + (1 - d.weight) * FORCE_CONFIG.linkDistanceVariance,
          )
          .strength((d) => d.weight * FORCE_CONFIG.linkStrengthMultiplier),
      )
      // Radial orbital layout: center anchored, others orbit by role
      .force(
        'radial',
        d3
          .forceRadial<GraphNode>(
            (d) => {
              if (d.isCenter) return 0
              if (d.orbit === 'inner') return FORCE_CONFIG.orbitInner
              if (d.orbit === 'distant') return FORCE_CONFIG.orbitDistant
              if (d.orbit === 'discovery') return FORCE_CONFIG.orbitDiscovery
              return FORCE_CONFIG.orbitDefault
            },
            centerX,
            centerY,
          )
          .strength(FORCE_CONFIG.radialStrength),
      )
      .force(
        'collision',
        d3.forceCollide<GraphNode>().radius((d) => {
          // Dynamic collision based on actual node size
          if (d.isCenter) return FORCE_CONFIG.centerNodePadding
          const baseSize = 40
          const listenersBonus = Math.min((d.listeners || 0) / 10000000, 1) * 24
          return baseSize + listenersBonus + FORCE_CONFIG.orbitalNodePadding
        }),
      )
      .force('charge', d3.forceManyBody().strength(FORCE_CONFIG.chargeStrength))
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
