import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { Artist, GraphNode, GraphLink, SimilarityEdge } from '@/types/artist';
import { cn } from '@/lib/utils';

interface ForceGraphProps {
  nodes: Artist[];
  edges: SimilarityEdge[];
  centerArtist: string | null;
  threshold: number;
  showLabels: boolean;
  onNodeClick: (artist: Artist) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  className?: string;
}

export function ForceGraph({
  nodes,
  edges,
  centerArtist,
  threshold,
  showLabels,
  onNodeClick,
  className,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filter edges by threshold
  const filteredEdges = edges.filter((e) => e.weight >= threshold);

  // Get connected node names
  const connectedNodes = new Set<string>();
  filteredEdges.forEach((e) => {
    connectedNodes.add(e.source.toLowerCase());
    connectedNodes.add(e.target.toLowerCase());
  });

  // Filter nodes to only include connected ones (or center)
  const filteredNodes = nodes.filter(
    (n) => connectedNodes.has(n.name.toLowerCase()) || n.name.toLowerCase() === centerArtist?.toLowerCase()
  );

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Create and update the force simulation
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create container group for zoom
    const g = svg.append('g').attr('class', 'graph-container');

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Prepare graph data
    const graphNodes: GraphNode[] = filteredNodes.map((node) => ({
      ...node,
      isCenter: node.name.toLowerCase() === centerArtist?.toLowerCase(),
    }));

    const nodeMap = new Map(graphNodes.map((n) => [n.name.toLowerCase(), n]));

    const graphLinks: GraphLink[] = filteredEdges
      .map((edge) => {
        const source = nodeMap.get(edge.source.toLowerCase());
        const target = nodeMap.get(edge.target.toLowerCase());
        if (source && target) {
          return { source, target, weight: edge.weight } as GraphLink;
        }
        return null;
      })
      .filter((link): link is GraphLink => link !== null);

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(graphNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphLinks)
        .id((d) => d.name)
        .distance((d) => 100 + (1 - d.weight) * 100)
        .strength((d) => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphLinks)
      .join('line')
      .attr('stroke', 'hsl(var(--graph-edge))')
      .attr('stroke-opacity', (d) => 0.2 + d.weight * 0.6)
      .attr('stroke-width', (d) => 1 + d.weight * 2);

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphNodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node circles
    node.append('circle')
      .attr('r', (d) => d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8)
      .attr('fill', (d) => d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))')
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 3)
      .style('transition', 'fill 0.2s ease-out')
      .on('mouseenter', function () {
        d3.select(this).attr('fill', 'hsl(var(--graph-node-hover))');
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).attr('fill', d.isCenter ? 'hsl(var(--graph-center))' : 'hsl(var(--graph-node))');
      });

    // Node images (optional)
    node.each(function (d) {
      if (d.image_url) {
        const nodeG = d3.select(this);
        const radius = d.isCenter ? 28 : 18 + Math.min((d.listeners || 0) / 10000000, 1) * 8;
        
        // Create clipPath
        const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        svg.append('defs')
          .append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('r', radius - 2);
        
        nodeG.insert('image', 'circle')
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
    const labels = node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.isCenter ? 45 : 35))
      .attr('class', 'fill-foreground text-xs font-medium')
      .style('pointer-events', 'none')
      .style('opacity', showLabels ? 1 : 0)
      .style('transition', 'opacity 0.2s ease-out');

    // Node click handler
    node.on('click', (event, d) => {
      event.stopPropagation();
      onNodeClick(d);
    });

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'graph-tooltip')
      .style('opacity', 0)
      .style('display', 'none');

    node.on('mouseenter', (event, d) => {
      tooltip
        .style('display', 'block')
        .style('opacity', 1)
        .html(`
          <div class="font-semibold">${d.name}</div>
          ${d.listeners ? `<div class="text-sm text-muted-foreground">${(d.listeners / 1000000).toFixed(1)}M listeners</div>` : ''}
          ${d.tags && d.tags.length > 0 ? `<div class="text-xs text-muted-foreground mt-1">${d.tags.slice(0, 3).join(', ')}</div>` : ''}
        `)
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 10}px`);
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 10}px`);
    })
    .on('mouseleave', () => {
      tooltip.style('opacity', 0).style('display', 'none');
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [filteredNodes, filteredEdges, centerArtist, threshold, dimensions, onNodeClick]);

  // Update labels visibility
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll('.nodes text')
      .style('opacity', showLabels ? 1 : 0);
  }, [showLabels]);

  // Expose zoom methods
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.4);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  // Expose methods via ref
  useEffect(() => {
    (window as any).__graphZoomIn = handleZoomIn;
    (window as any).__graphZoomOut = handleZoomOut;
    (window as any).__graphReset = handleReset;
  }, [handleZoomIn, handleZoomOut, handleReset]);

  if (filteredNodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p>Search for an artist to explore their similarity map</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-background"
      />
    </div>
  );
}