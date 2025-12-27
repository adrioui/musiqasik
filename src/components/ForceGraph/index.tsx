import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { cn, isPlaceholderImage } from '@/lib/utils';
import type { SimulationNode, SimulationLink } from './types';
import { useElementDimensions } from './hooks/useElementDimensions';
import { useGraphData } from './hooks/useGraphData';
import { useD3Zoom } from './hooks/useD3Zoom';
import { useD3Simulation } from './hooks/useD3Simulation';
import { useGenreColors } from './hooks/useGenreColors';
import { useNodeAnimation } from './hooks/useNodeAnimation';
import { GraphLegend } from './GraphLegend';
import type { ForceGraphProps, ForceGraphHandle } from './types';

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  { nodes, edges, centerArtist, threshold = 0, showLabels = true, onNodeClick, onEdgeClick, className },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Refs for D3 selections that need to be updated on tick
  const linkSelectionRef = useRef<d3.Selection<
    SVGLineElement,
    SimulationLink,
    SVGGElement,
    unknown
  > | null>(null);
  const nodeSelectionRef = useRef<d3.Selection<
    SVGGElement,
    SimulationNode,
    SVGGElement,
    unknown
  > | null>(null);

  // Use extracted hooks
  const dimensions = useElementDimensions(containerRef);
  const { filteredNodes, graphLinks } = useGraphData({
    nodes,
    edges,
    centerArtist,
    threshold,
  });
  const { zoomIn, zoomOut, reset, applyZoom } = useD3Zoom({ svgRef });
  const { getNodeColor, genreColorMap } = useGenreColors({ nodes: filteredNodes });
  const { animateNodesIn, resetAnimation } = useNodeAnimation({ enabled: true });

  // Reset animation when center artist changes
  useEffect(() => {
    resetAnimation();
  }, [centerArtist, resetAnimation]);

  // Build adjacency map for efficient neighbor lookups (used for highlighting)
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of graphLinks) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name;
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name;
      const sourceKey = sourceName.toLowerCase();
      const targetKey = targetName.toLowerCase();

      if (!map.has(sourceKey)) map.set(sourceKey, new Set());
      if (!map.has(targetKey)) map.set(targetKey, new Set());
      map.get(sourceKey)!.add(targetKey);
      map.get(targetKey)!.add(sourceKey);
    }
    return map;
  }, [graphLinks]);

  // Prepare graph data with mutable copies for D3 - memoized to prevent unnecessary recalculations
  const { graphNodes, links } = useMemo(() => {
    // Clone nodes for D3 mutation with required position fields
    const nodes: SimulationNode[] = filteredNodes.map((node) => ({
      ...node,
      x: node.x ?? 0,
      y: node.y ?? 0,
    }));
    const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]));

    // Build links with resolved node references
    // graphLinks contain string-based source/target from useGraphData
    const resolvedLinks: SimulationLink[] = [];
    for (const link of graphLinks) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name;
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name;
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
        .attr('x1', (d) => (d.source as SimulationNode).x)
        .attr('y1', (d) => (d.source as SimulationNode).y)
        .attr('x2', (d) => (d.target as SimulationNode).x)
        .attr('y2', (d) => (d.target as SimulationNode).y);
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
  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      reset,
    }),
    [zoomIn, zoomOut, reset]
  );

  // Create and update the D3 visualization (DOM elements only, simulation is handled by hook)
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0 || !simulation) return;

    const svg = d3.select(svgRef.current);

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
      .attr('stroke-width', (d) => 1 + d.weight * 2)
      .attr('class', 'cursor-pointer')
      .style('transition', 'stroke-opacity 0.15s ease-out, stroke 0.15s ease-out')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onEdgeClick) {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          // Find shared tags
          const sourceTags = new Set(source.tags || []);
          const sharedTags = (target.tags || []).filter((tag) => sourceTags.has(tag));

          onEdgeClick({
            source: source.name,
            target: target.name,
            weight: d.weight,
            position: { x: midX, y: midY },
            sharedTags,
          });
        }
      })
      .on('mouseenter', function () {
        d3.select(this)
          .attr('stroke', 'hsl(var(--primary))')
          .attr('stroke-opacity', 0.8);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this)
          .attr('stroke', 'hsl(var(--graph-edge))')
          .attr('stroke-opacity', 0.2 + d.weight * 0.6);
      });

    linkSelectionRef.current = linkSelection;

    // Draw nodes and store reference
    const nodeSelection = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(graphNodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.15s ease-out');

    nodeSelectionRef.current = nodeSelection;

    // Hover highlighting function (pure D3, no React state)
    const applyHighlight = (highlightedName: string | null) => {
      if (!highlightedName) {
        // Reset all to normal
        linkSelection.attr('stroke-opacity', (d) => 0.2 + d.weight * 0.6);
        nodeSelection.style('opacity', 1);
        return;
      }

      const highlightKey = highlightedName.toLowerCase();
      const neighbors = adjacencyMap.get(highlightKey) || new Set<string>();

      // Update links
      linkSelection.attr('stroke-opacity', (d) => {
        const sourceKey = (d.source as SimulationNode).name.toLowerCase();
        const targetKey = (d.target as SimulationNode).name.toLowerCase();
        if (sourceKey === highlightKey || targetKey === highlightKey) {
          return 0.8;
        }
        return 0.05;
      });

      // Update nodes
      nodeSelection.style('opacity', (d) => {
        const nodeKey = d.name.toLowerCase();
        if (nodeKey === highlightKey || neighbors.has(nodeKey)) {
          return 1;
        }
        return 0.2;
      });
    };

    // Apply drag behavior
    nodeSelection.call(
      d3
        .drag<SVGGElement, SimulationNode>()
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
          d.fx = undefined;
          d.fy = undefined;
        })
    );

    // Outer glow ring for center nodes
    nodeSelection
      .filter((d) => d.isCenter)
      .insert('circle', ':first-child')
      .attr('r', 44)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--primary) / 0.3)')
      .attr('stroke-width', 2)
      .attr('class', 'graph-node-pulse');

    // Node circles with enhanced sizing
    const getNodeRadius = (d: SimulationNode) => {
      if (d.isCenter) return 32;
      const baseSize = 20;
      const listenersBonus = Math.min((d.listeners || 0) / 10000000, 1) * 10;
      return baseSize + listenersBonus;
    };

    nodeSelection
      .append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', (d) => getNodeColor(d))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', (d) => (d.isCenter ? 4 : 3))
      .attr('class', (d) => (d.isCenter ? 'node-glow-active' : 'node-glow'))
      .style('transition', 'fill 0.2s ease-out, filter 0.2s ease-out');

    // Node images (skip Last.fm placeholder images)
    nodeSelection.each(function (d) {
      if (!isPlaceholderImage(d.image_url) && d.image_url) {
        const nodeG = d3.select(this);
        const radius = getNodeRadius(d);

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

    // Node labels with backdrop
    const labelGroup = nodeSelection.append('g').attr('class', 'label-group');

    // Text label
    labelGroup
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.isCenter ? 50 : 42))
      .attr('class', 'fill-foreground text-xs font-medium')
      .style('pointer-events', 'none')
      .style('opacity', showLabels ? 1 : 0)
      .style('transition', 'opacity 0.2s ease-out');

    // Add backdrop rect behind text (measure after text is created)
    labelGroup.each(function () {
      const group = d3.select(this);
      const text = group.select('text');
      const textNode = text.node() as SVGTextElement | null;

      if (textNode) {
        const bbox = textNode.getBBox();
        group
          .insert('rect', 'text')
          .attr('class', 'label-backdrop')
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('x', bbox.x - 6)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 12)
          .attr('height', bbox.height + 4)
          .attr('fill', 'hsl(var(--card) / 0.85)')
          .style('opacity', showLabels ? 0.9 : 0)
          .style('transition', 'opacity 0.2s ease-out');
      }
    });

    // Trigger bubble-in animation
    animateNodesIn(nodeSelection);

    // Click handler for node selection (opens artist panel)
    nodeSelection.on('click', (_event, d) => {
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

    // Hover highlighting and tooltip
    nodeSelection
      .on('mouseenter', function (event, d) {
        applyHighlight(d.name);
        d3.select(this).select('circle').attr('fill', 'hsl(var(--graph-node-hover))');

        // Show tooltip
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
      .on('mouseleave', function (_event, d) {
        applyHighlight(null);
        d3.select(this).select('circle').attr('fill', getNodeColor(d));

        // Hide tooltip
        tooltip.style('opacity', '0').style('display', 'none');
      });

    // Cleanup refs on effect cleanup
    return () => {
      linkSelectionRef.current = null;
      nodeSelectionRef.current = null;
    };
  }, [
    centerArtist,
    dimensions,
    onNodeClick,
    onEdgeClick,
    showLabels,
    applyZoom,
    simulation,
    restart,
    graphNodes,
    links,
    filteredNodes.length,
    getNodeColor,
    adjacencyMap,
    animateNodesIn,
  ]);

  // Update labels visibility
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.label-group text').style('opacity', showLabels ? 1 : 0);
    svg.selectAll('.label-backdrop').style('opacity', showLabels ? 0.9 : 0);
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
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-background"
      />
      <div className="absolute bottom-4 left-4 z-10 max-w-[200px]">
        <GraphLegend colorMap={genreColorMap} />
      </div>
    </div>
  );
});

export type { ForceGraphHandle, ForceGraphProps } from './types';
