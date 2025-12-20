import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { cn, isPlaceholderImage } from '@/lib/utils';
import type { GraphNode } from '@/types/artist';
import { useElementDimensions } from './hooks/useElementDimensions';
import { useGraphData } from './hooks/useGraphData';
import { useD3Zoom } from './hooks/useD3Zoom';
import { useD3Simulation } from './hooks/useD3Simulation';
import type { ForceGraphProps, ForceGraphHandle } from './types';

// Internal type for D3 force simulation links (source/target are always GraphNode after simulation starts)
interface SimulationLink {
  source: GraphNode;
  target: GraphNode;
  weight: number;
}

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(
    { nodes, edges, centerArtist, threshold, showLabels, onNodeClick, className },
    ref
  ) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    // Refs for D3 selections that need to be updated on tick
    const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown> | null>(null);
    const nodeSelectionRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);

    // Use extracted hooks
    const dimensions = useElementDimensions(containerRef);
    const { filteredNodes, graphLinks } = useGraphData({
      nodes,
      edges,
      centerArtist,
      threshold,
    });
    const { zoomIn, zoomOut, reset, applyZoom } = useD3Zoom({ svgRef });

    // Prepare graph data with mutable copies for D3 - memoized to prevent unnecessary recalculations
    const { graphNodes, links } = useMemo(() => {
      const nodes: GraphNode[] = filteredNodes.map((node) => ({ ...node }));
      const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]));

      // Build links with resolved node references
      const resolvedLinks: SimulationLink[] = [];
      for (const link of graphLinks) {
        const sourceName = typeof link.source === 'string' ? link.source : link.source.name;
        const targetName = typeof link.target === 'string' ? link.target : link.target.name;
        const source = nodeMap.get(sourceName.toLowerCase());
        const target = nodeMap.get(targetName.toLowerCase());
        if (source && target) {
          resolvedLinks.push({ source, target, weight: link.weight });
        }
      }

      return { graphNodes: nodes, links: resolvedLinks };
    }, [filteredNodes, graphLinks]);

    // Tick handler for simulation - updates D3 selections
    const handleTick = useCallback(() => {
      if (linkSelectionRef.current) {
        linkSelectionRef.current
          .attr('x1', (d) => d.source.x!)
          .attr('y1', (d) => d.source.y!)
          .attr('x2', (d) => d.target.x!)
          .attr('y2', (d) => d.target.y!);
      }

      if (nodeSelectionRef.current) {
        nodeSelectionRef.current.attr('transform', (d) => `translate(${d.x},${d.y})`);
      }
    }, []);

    // Use the D3 simulation hook
    const { simulation, restart } = useD3Simulation({
      nodes: graphNodes,
      links: links as unknown as import('@/types/artist').GraphLink[],
      width: dimensions.width,
      height: dimensions.height,
      onTick: handleTick,
    });

    // Expose zoom methods via ref
    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      reset,
    }), [zoomIn, zoomOut, reset]);

    // Create and update the D3 visualization (DOM elements only, simulation is handled by hook)
    useEffect(() => {
      if (!svgRef.current || filteredNodes.length === 0 || !simulation) return;

      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;

      // Clear previous content
      svg.selectAll('*').remove();

      // Create container group for zoom
      const g = svg.append('g').attr('class', 'graph-container');

      // Apply zoom behavior
      applyZoom(g);

      // Draw links and store reference
      const linkSelection = g
        .append('g')
        .attr('class', 'links')
        .selectAll<SVGLineElement, SimulationLink>('line')
        .data(links)
        .join('line')
        .attr('stroke', 'hsl(var(--graph-edge))')
        .attr('stroke-opacity', (d) => 0.2 + d.weight * 0.6)
        .attr('stroke-width', (d) => 1 + d.weight * 2);

      linkSelectionRef.current = linkSelection;

      // Draw nodes and store reference
      const nodeSelection = g
        .append('g')
        .attr('class', 'nodes')
        .selectAll<SVGGElement, GraphNode>('g')
        .data(graphNodes)
        .join('g')
        .attr('class', 'graph-node')
        .style('cursor', 'pointer')
        .call(
          d3
            .drag<SVGGElement, GraphNode>()
            .on('start', (event, d) => {
              if (!event.active) restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active && simulation) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      nodeSelectionRef.current = nodeSelection;

      // Node circles
      nodeSelection
        .append('circle')
        .attr('r', (d) => (d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8))
        .attr('fill', (d) => (d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'))
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 3)
        .style('transition', 'fill 0.2s ease-out')
        .on('mouseenter', function () {
          d3.select(this).attr('fill', 'hsl(var(--graph-node-hover))');
        })
        .on('mouseleave', function (_event, d) {
          d3.select(this).attr(
            'fill',
            d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))'
          );
        });

      // Node images (skip Last.fm placeholder images)
      nodeSelection.each(function (d) {
        if (!isPlaceholderImage(d.image_url) && d.image_url) {
          const nodeG = d3.select(this);
          const radius = d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8;

          // Create clipPath
          const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
          svg
            .append('defs')
            .append('clipPath')
            .attr('id', clipId)
            .append('circle')
            .attr('r', radius - 2);

          nodeG
            .insert('image', 'circle')
            .attr('xlink:href', d.image_url)
            .attr('x', -(radius - 2))
            .attr('y', -(radius - 2))
            .attr('width', (radius - 2) * 2)
            .attr('height', (radius - 2) * 2)
            .attr('clip-path', `url(#${clipId})`)
            .style('pointer-events', 'none');
        }
      });

      // Node labels
      nodeSelection
        .append('text')
        .text((d) => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => (d.isCenter ? 45 : 35))
        .attr('class', 'fill-foreground text-xs font-medium')
        .style('pointer-events', 'none')
        .style('opacity', showLabels ? 1 : 0)
        .style('transition', 'opacity 0.2s ease-out');

      // Node click handler
      nodeSelection.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

      // Tooltip
      if (!tooltipRef.current) {
        tooltipRef.current = document.createElement('div');
        tooltipRef.current.className = 'graph-tooltip';
        tooltipRef.current.style.opacity = '0';
        tooltipRef.current.style.display = 'none';
        document.body.appendChild(tooltipRef.current);
      }
      const tooltip = d3.select(tooltipRef.current);

      nodeSelection
        .on('mouseenter', (event, d) => {
          tooltip
            .style('display', 'block')
            .style('opacity', '1')
            .html(
              `
            <div class="font-semibold">${d.name}</div>
            ${d.listeners ? `<div class="text-sm text-muted-foreground">${(d.listeners / 1000000).toFixed(1)}M listeners</div>` : ''}
            ${d.tags && d.tags.length > 0 ? `<div class="text-xs text-muted-foreground mt-1">${d.tags.slice(0, 3).join(', ')}</div>` : ''}
          `
            )
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`);
        })
        .on('mouseleave', () => {
          tooltip.style('opacity', '0').style('display', 'none');
        });

      // Cleanup refs on effect cleanup
      return () => {
        linkSelectionRef.current = null;
        nodeSelectionRef.current = null;
      };
    }, [centerArtist, dimensions, onNodeClick, showLabels, applyZoom, simulation, restart, graphNodes, links]);

    // Update labels visibility
    useEffect(() => {
      if (!svgRef.current) return;
      d3.select(svgRef.current)
        .selectAll('.nodes text')
        .style('opacity', showLabels ? 1 : 0);
    }, [showLabels]);

    // Cleanup tooltip on unmount
    useEffect(() => {
      return () => {
        if (tooltipRef.current) {
          tooltipRef.current.remove();
          tooltipRef.current = null;
        }
      };
    }, []);

    if (filteredNodes.length === 0) {
      return (
        <div
          className={cn('flex h-full items-center justify-center text-muted-foreground', className)}
        >
          <p>Search for an artist to explore their similarity map</p>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={cn('h-full w-full', className)}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="bg-background"
        />
      </div>
    );
  }
);

export type { ForceGraphHandle, ForceGraphProps } from './types';
