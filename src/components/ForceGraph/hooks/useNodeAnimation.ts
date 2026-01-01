import * as d3 from 'd3'
import { useCallback, useRef } from 'react'
import type { SimulationNode } from '../types'

interface UseNodeAnimationOptions {
  enabled?: boolean
  staggerDelay?: number
  duration?: number
}

export function useNodeAnimation(options: UseNodeAnimationOptions = {}) {
  const { enabled = true, staggerDelay = 30, duration = 400 } = options
  const hasAnimatedRef = useRef(false)

  const animateNodesIn = useCallback(
    (nodeSelection: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>) => {
      if (!enabled || nodeSelection.empty()) return

      // Reset per-run so newly entered nodes can animate on later updates
      hasAnimatedRef.current = false

      // Select inner content groups (animation controls scale, not position)
      const contentGroups = nodeSelection.select<SVGGElement>('.node-content')

      // Set initial state - scale 0, opacity 0 (position is handled by tick handler)
      contentGroups.style('opacity', 0).attr('transform', 'scale(0)')

      // Animate each node with stagger
      contentGroups.each(function (_d, i) {
        d3.select(this)
          .transition()
          .delay(i * staggerDelay)
          .duration(duration)
          .ease(d3.easeBackOut.overshoot(1.2))
          .style('opacity', 1)
          .attr('transform', 'scale(1)')
      })

      hasAnimatedRef.current = true
    },
    [enabled, staggerDelay, duration],
  )

  const resetAnimation = useCallback(() => {
    hasAnimatedRef.current = false
  }, [])

  return { animateNodesIn, resetAnimation }
}
