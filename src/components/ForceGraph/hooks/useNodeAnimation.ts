import * as d3 from "d3";
import { useCallback, useRef } from "react";
import type { SimulationNode } from "../types";

interface UseNodeAnimationOptions {
  enabled?: boolean;
  staggerDelay?: number;
  duration?: number;
}

export function useNodeAnimation(options: UseNodeAnimationOptions = {}) {
  const { enabled = true, staggerDelay = 30, duration = 400 } = options;
  const hasAnimatedRef = useRef(false);

  const animateNodesIn = useCallback(
    (
      nodeSelection: d3.Selection<
        SVGGElement,
        SimulationNode,
        SVGGElement,
        unknown
      >,
    ) => {
      if (!enabled || hasAnimatedRef.current) return;

      hasAnimatedRef.current = true;

      // Set initial state - scale 0, opacity 0
      nodeSelection
        .style("opacity", 0)
        .attr("transform", (d) => `translate(${d.x},${d.y}) scale(0)`);

      // Animate each node with stagger
      nodeSelection.each(function (d, i) {
        d3.select(this)
          .transition()
          .delay(i * staggerDelay)
          .duration(duration)
          .ease(d3.easeBackOut.overshoot(1.2))
          .style("opacity", 1)
          .attrTween("transform", () => {
            const interpolate = d3.interpolate(0, 1);
            return (t) => `translate(${d.x},${d.y}) scale(${interpolate(t)})`;
          });
      });
    },
    [enabled, staggerDelay, duration],
  );

  const resetAnimation = useCallback(() => {
    hasAnimatedRef.current = false;
  }, []);

  return { animateNodesIn, resetAnimation };
}
