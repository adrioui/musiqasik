import * as d3 from "d3";
import { Effect } from "effect";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { svgToPng } from "@/lib/graph-export";
import { cn, isPlaceholderImage } from "@/lib/utils";
import { GraphLegend } from "./GraphLegend";
import { useD3Simulation } from "./hooks/useD3Simulation";
import { useD3Zoom } from "./hooks/useD3Zoom";
import { useElementDimensions } from "./hooks/useElementDimensions";
import { useGenreColors } from "./hooks/useGenreColors";
import { useGraphData } from "./hooks/useGraphData";
import { useNodeAnimation } from "./hooks/useNodeAnimation";
import type {
  ForceGraphHandle,
  ForceGraphProps,
  SimulationLink,
  SimulationNode,
} from "./types";

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(
    {
      nodes,
      edges,
      centerArtist,
      threshold = 0,
      showLabels = true,
      onNodeClick,
      onEdgeClick,
      className,
    },
    ref,
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
    const { getNodeColor, genreColorMap } = useGenreColors({
      nodes: filteredNodes,
    });
    const { animateNodesIn, resetAnimation } = useNodeAnimation({
      enabled: true,
    });

    // Reset animation when center artist changes
    useEffect(() => {
      resetAnimation();
    }, [resetAnimation]);

    // Build adjacency map for efficient neighbor lookups (used for highlighting)
    const adjacencyMap = useMemo(() => {
      const map = new Map<string, Set<string>>();
      for (const link of graphLinks) {
        const sourceName =
          typeof link.source === "string"
            ? link.source
            : (link.source as SimulationNode).name;
        const targetName =
          typeof link.target === "string"
            ? link.target
            : (link.target as SimulationNode).name;
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
          typeof link.source === "string"
            ? link.source
            : (link.source as SimulationNode).name;
        const targetName =
          typeof link.target === "string"
            ? link.target
            : (link.target as SimulationNode).name;
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
          .attr("x1", (d) => (d.source as SimulationNode).x)
          .attr("y1", (d) => (d.source as SimulationNode).y)
          .attr("x2", (d) => (d.target as SimulationNode).x)
          .attr("y2", (d) => (d.target as SimulationNode).y);
      }

      if (nodeSelectionRef.current) {
        nodeSelectionRef.current.attr(
          "transform",
          (d) => `translate(${d.x},${d.y})`,
        );
      }
    }, []);

    // Use the D3 simulation hook
    const { simulation, restart } = useD3Simulation({
      nodes: graphNodes,
      links: links as unknown as import("@/types/artist").GraphLink[],
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
        exportImage: async () => {
          if (svgRef.current) {
            return Effect.runPromise(
              svgToPng(svgRef.current).pipe(
                Effect.map((blob) => blob as Blob | null),
                Effect.catchAll(() => Effect.succeed(null)),
              ),
            );
          }
          return null;
        },
      }),
      [zoomIn, zoomOut, reset],
    );

    // Initialize SVG container structure - runs once
    useEffect(() => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);

      // Clear previous content (safety check for HMR)
      svg.selectAll("*").remove();

      const g = svg.append("g").attr("class", "graph-container");
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

      // Initialize tooltip if needed
      if (!tooltipRef.current) {
        tooltipRef.current = document.createElement("div");
        tooltipRef.current.className = "graph-tooltip";
        tooltipRef.current.style.opacity = "0";
        tooltipRef.current.style.display = "none";
        document.body.appendChild(tooltipRef.current);
      }

      // Cleanup tooltip on unmount
      return () => {
        if (tooltipRef.current) {
          tooltipRef.current.remove();
          tooltipRef.current = null;
        }
      };
    }, []);

    // Update graph elements
    useEffect(() => {
      if (!svgRef.current || !simulation) return;

      const svg = d3.select(svgRef.current);
      const g = svg.select(".graph-container");

      // Apply zoom behavior
      applyZoom(g as d3.Selection<SVGGElement, unknown, null, undefined>);

      // ----------------- LINKS -----------------
      const linkGroup = g.select(".links");

      // DATA JOIN
      const link = linkGroup
        .selectAll<SVGLineElement, SimulationLink>("line")
        .data(links, (d) => {
          // Use a unique ID for links if possible, otherwise composite key
          const sourceId = (d.source as SimulationNode).name || (d.source as string);
          const targetId = (d.target as SimulationNode).name || (d.target as string);
          return `${sourceId}-${targetId}`;
        });

      // EXIT
      link.exit().remove();

      // UPDATE
      const linkUpdate = link
        .attr("stroke-opacity", (d) => 0.2 + d.weight * 0.6)
        .attr("stroke-width", (d) => 1 + d.weight * 2);

      // ENTER
      const linkEnter = link.enter()
        .append("line")
        .attr("stroke", "hsl(var(--graph-edge))")
        .attr("stroke-opacity", (d) => 0.2 + d.weight * 0.6)
        .attr("stroke-width", (d) => 1 + d.weight * 2)
        .attr("class", "cursor-pointer")
        .style(
          "transition",
          "stroke-opacity 0.15s ease-out, stroke 0.15s ease-out",
        )
        .on("click", (event, d) => {
          event.stopPropagation();
          if (onEdgeClick) {
            const source = d.source as SimulationNode;
            const target = d.target as SimulationNode;
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            // Find shared tags
            const sourceTags = new Set(source.tags || []);
            const sharedTags = (target.tags || []).filter((tag) =>
              sourceTags.has(tag),
            );

            onEdgeClick({
              source: source.name,
              target: target.name,
              weight: d.weight,
              position: { x: midX, y: midY },
              sharedTags,
            });
          }
        })
        .on("mouseenter", function () {
          d3.select(this)
            .attr("stroke", "hsl(var(--primary))")
            .attr("stroke-opacity", 0.8);
        })
        .on("mouseleave", function (_, d) {
          d3.select(this)
            .attr("stroke", "hsl(var(--graph-edge))")
            .attr("stroke-opacity", 0.2 + d.weight * 0.6);
        });

      // MERGE
      const linkSelection = linkEnter.merge(linkUpdate);
      linkSelectionRef.current = linkSelection;

      // ----------------- NODES -----------------
      const nodeGroup = g.select(".nodes");

      // DATA JOIN
      const node = nodeGroup
        .selectAll<SVGGElement, SimulationNode>("g")
        .data(graphNodes, (d) => d.name);

      // EXIT
      node.exit()
        .style("opacity", 0)
        .transition()
        .duration(300)
        .remove();

      // UPDATE
      const nodeUpdate = node
        .attr("class", "graph-node")
        .style("cursor", "pointer")
        .style("transition", "opacity 0.15s ease-out");

      // Update existing nodes visual properties that might change
      nodeUpdate
        .select("circle:not(.node-glow-active):not(.node-glow)")
        .attr("fill", (d) => getNodeColor(d));

      // Update isCenter glow ring (add if missing, remove if present but not center)
      nodeUpdate.each(function (d) {
        const group = d3.select(this);
        const hasPulse = !group.select(".graph-node-pulse").empty();

        if (d.isCenter && !hasPulse) {
          group
            .insert("circle", ":first-child")
            .attr("r", 44)
            .attr("fill", "none")
            .attr("stroke", "hsl(var(--primary) / 0.3)")
            .attr("stroke-width", 2)
            .attr("class", "graph-node-pulse");

          // Update main circle stroke for center
           group.select(".node-glow")
             .attr("class", "node-glow-active")
             .attr("stroke-width", 4);
        } else if (!d.isCenter && hasPulse) {
          group.select(".graph-node-pulse").remove();

          // Revert main circle stroke
          group.select(".node-glow-active")
             .attr("class", "node-glow")
             .attr("stroke-width", 3);
        }

        // Update images if changed (re-check logic or update href)
        if (!isPlaceholderImage(d.image_url) && d.image_url) {
           let image = group.select("image");
           if (image.empty()) {
             // Add image if it didn't exist before
              const radius = getNodeRadius(d);
              const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, "-")}`;

              let defs = svg.select("defs");
              if (defs.empty()) defs = svg.append("defs");
              if (defs.select(`#${clipId}`).empty()) {
                 defs.append("clipPath")
                .attr("id", clipId)
                .append("circle")
                .attr("r", radius - 2);
              }

              group
                .insert("image", "circle")
                .attr("xlink:href", d.image_url)
                .attr("x", -(radius - 2))
                .attr("y", -(radius - 2))
                .attr("width", (radius - 2) * 2)
                .attr("height", (radius - 2) * 2)
                .attr("clip-path", `url(#${clipId})`)
                .style("pointer-events", "none");
           } else {
             // Update href
             image.attr("xlink:href", d.image_url);
           }
        }
      });

      // Update labels
      nodeUpdate.select(".label-group text").text((d) => d.name);

      // ENTER
      const nodeEnter = node.enter()
        .append("g")
        .attr("class", "graph-node")
        .style("cursor", "pointer")
        .style("transition", "opacity 0.15s ease-out")
        .style("opacity", 0) // Start invisible for bubble-in
        .attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`); // Initial position

      // Apply drag behavior to merged selection later, but enter needs it?
      // Actually merge is better.

      // Outer glow ring for center nodes
      nodeEnter
        .filter((d) => d.isCenter)
        .insert("circle", ":first-child")
        .attr("r", 44)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--primary) / 0.3)")
        .attr("stroke-width", 2)
        .attr("class", "graph-node-pulse");

      // Node circles with enhanced sizing
      const getNodeRadius = (d: SimulationNode) => {
        if (d.isCenter) return 32;
        const baseSize = 20;
        const listenersBonus = Math.min((d.listeners || 0) / 10000000, 1) * 10;
        return baseSize + listenersBonus;
      };

      nodeEnter
        .append("circle")
        .attr("r", getNodeRadius)
        .attr("fill", (d) => getNodeColor(d))
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", (d) => (d.isCenter ? 4 : 3))
        .attr("class", (d) => (d.isCenter ? "node-glow-active" : "node-glow"))
        .style("transition", "fill 0.2s ease-out, filter 0.2s ease-out");

      // Node images (skip Last.fm placeholder images)
      nodeEnter.each(function (d) {
        if (!isPlaceholderImage(d.image_url) && d.image_url) {
          const nodeG = d3.select(this);
          const radius = getNodeRadius(d);

          // Create clipPath
          const clipId = `clip-${d.name.replace(/[^a-zA-Z0-9]/g, "-")}`;
          // Note: Defs should be in root svg, but here we append to svg directly.
          // Ideally defs are created once. But unique IDs avoid collision.
          // Just appending to SVG defs again is fine if ID is unique.
          let defs = svg.select("defs");
          if (defs.empty()) defs = svg.append("defs");

          // Check if clipPath exists
          if (defs.select(`#${clipId}`).empty()) {
             defs.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", radius - 2);
          }

          nodeG
            .insert("image", "circle")
            .attr("xlink:href", d.image_url)
            .attr("x", -(radius - 2))
            .attr("y", -(radius - 2))
            .attr("width", (radius - 2) * 2)
            .attr("height", (radius - 2) * 2)
            .attr("clip-path", `url(#${clipId})`)
            .style("pointer-events", "none");
        }
      });

      // Node labels with backdrop
      const labelGroup = nodeEnter.append("g").attr("class", "label-group");

      // Text label
      labelGroup
        .append("text")
        .text((d) => d.name)
        .attr("text-anchor", "middle")
        .attr("dy", (d) => (d.isCenter ? 50 : 42))
        .attr("class", "fill-foreground text-xs font-medium")
        .style("pointer-events", "none")
        .style("opacity", showLabels ? 1 : 0)
        .style("transition", "opacity 0.2s ease-out");

      // Add backdrop rect behind text (measure after text is created)
      labelGroup.each(function () {
        const group = d3.select(this);
        const text = group.select("text");
        const textNode = text.node() as SVGTextElement | null;

        if (textNode) {
          const bbox = textNode.getBBox();
          group
            .insert("rect", "text")
            .attr("class", "label-backdrop")
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("x", bbox.x - 6)
            .attr("y", bbox.y - 2)
            .attr("width", bbox.width + 12)
            .attr("height", bbox.height + 4)
            .attr("fill", "hsl(var(--card) / 0.85)")
            .style("opacity", showLabels ? 0.9 : 0)
            .style("transition", "opacity 0.2s ease-out");
        }
      });

      // Click handler for node selection (opens artist panel)
      // Bind to merged selection to ensure closure freshness
      // Actually we bind to enter + update later via nodeSelection, but simple click handler
      // is often bound on enter. If onNodeClick changes, we need to re-bind.

      const tooltip = d3.select(tooltipRef.current);

      // Hover highlighting and tooltip
      // biome-ignore lint/suspicious/noExplicitAny: d3 selection types are complex
      const addHoverInteractions = (selection: any) => {
         selection
        .on("mouseenter", function (event: MouseEvent, d: SimulationNode) {
          applyHighlight(d.name);
          d3.select(this)
            .select("circle")
            .attr("fill", "hsl(var(--graph-node-hover))");

          // Show tooltip
          tooltip
            .style("display", "block")
            .style("opacity", "1")
            .html(
              `
            <div class="font-semibold">${d.name}</div>
            ${d.listeners ? `<div class="text-sm text-muted-foreground">${(d.listeners / 1000000).toFixed(1)}M listeners</div>` : ""}
            ${d.tags && d.tags.length > 0 ? `<div class="text-xs text-muted-foreground mt-1">${d.tags.slice(0, 3).join(", ")}</div>` : ""}
          `,
            )
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mousemove", (event: MouseEvent) => {
          tooltip
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        // biome-ignore lint/suspicious/noExplicitAny: d3 event type
        .on("mouseleave", function (_event: any, d: SimulationNode) {
          applyHighlight(null);
          // Restore color
          d3.select(this).select("circle").attr("fill", getNodeColor(d));

          // Hide tooltip
          tooltip.style("opacity", "0").style("display", "none");
        });
      };

      addHoverInteractions(nodeEnter);
      addHoverInteractions(nodeUpdate);

      // MERGE
      const nodeSelection = nodeEnter.merge(nodeUpdate);
      nodeSelectionRef.current = nodeSelection;

      // Re-bind click handler to ensure fresh onNodeClick
      nodeSelection.on("click", (_event, d) => {
        onNodeClick(d);
      });

      // Trigger bubble-in animation for NEW nodes
      animateNodesIn(nodeEnter);

      // Hover highlighting function (pure D3, no React state)
      const applyHighlight = (highlightedName: string | null) => {
        if (!highlightedName) {
          // Reset all to normal
          linkSelection.attr("stroke-opacity", (d) => 0.2 + d.weight * 0.6);
          nodeSelection.style("opacity", 1);
          return;
        }

        const highlightKey = highlightedName.toLowerCase();
        const neighbors = adjacencyMap.get(highlightKey) || new Set<string>();

        // Update links
        linkSelection.attr("stroke-opacity", (d) => {
          const sourceKey = (d.source as SimulationNode).name.toLowerCase();
          const targetKey = (d.target as SimulationNode).name.toLowerCase();
          if (sourceKey === highlightKey || targetKey === highlightKey) {
            return 0.8;
          }
          return 0.05;
        });

        // Update nodes
        nodeSelection.style("opacity", (d) => {
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
          .on("start", (event, d) => {
            if (!event.active) restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active && simulation) simulation.alphaTarget(0);
            d.fx = undefined;
            d.fy = undefined;
          }),
      );

      // Cleanup refs on effect cleanup
      return () => {
        linkSelectionRef.current = null;
        nodeSelectionRef.current = null;
      };
    }, [
      onNodeClick,
      onEdgeClick,
      showLabels,
      applyZoom,
      simulation,
      restart,
      graphNodes,
      links,
      getNodeColor,
      adjacencyMap,
      animateNodesIn,
    ]);

    // Update labels visibility
    useEffect(() => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll(".label-group text").style("opacity", showLabels ? 1 : 0);
      svg.selectAll(".label-backdrop").style("opacity", showLabels ? 0.9 : 0);
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
          className={cn(
            "flex h-full items-center justify-center text-muted-foreground",
            className,
          )}
        >
          <p>Search for an artist to explore their similarity map</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn("relative h-full w-full", className)}
      >
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
  },
);

export type { ForceGraphHandle, ForceGraphProps } from "./types";
