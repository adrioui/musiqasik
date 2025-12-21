import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink } from '@/types/artist';

interface UseD3SimulationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  onTick: () => void;
}

interface UseD3SimulationResult {
  simulation: d3.Simulation<GraphNode, GraphLink> | null;
  restart: () => void;
  stop: () => void;
}

export function useD3Simulation({
  nodes,
  links,
  width,
  height,
  onTick,
}: UseD3SimulationProps): UseD3SimulationResult {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const onTickRef = useRef(onTick);

  // Keep onTick ref up to date without triggering effect
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Only recreate simulation when nodes/links identity changes (not threshold filtering)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.name)
          .distance((d) => 100 + (1 - d.weight) * 100)
          .strength((d) => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(55))
      .on('tick', () => {
        onTickRef.current();
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  const restart = useCallback(() => {
    simulationRef.current?.alpha(0.3).restart();
  }, []);

  const stop = useCallback(() => {
    simulationRef.current?.stop();
  }, []);

  return {
    simulation: simulationRef.current,
    restart,
    stop,
  };
}
