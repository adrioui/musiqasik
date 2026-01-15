import * as d3 from 'd3'
import { Effect } from 'effect'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { svgToPng } from '@/lib/graph-export'
import { cn, isPlaceholderImage } from '@/lib/utils'
import { useD3Simulation } from './hooks/useD3Simulation'
import { useD3Zoom } from './hooks/useD3Zoom'
import { useElementDimensions } from './hooks/useElementDimensions'
import { useGenreColors } from './hooks/useGenreColors'
import { useGraphData } from './hooks/useGraphData'
import { useNodeAnimation } from './hooks/useNodeAnimation'
import type { ForceGraphHandle, ForceGraphProps, SimulationLink, SimulationNode } from './types'

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
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
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const hasFittedRef = useRef(false)
  const onNodeClickRef = useRef(onNodeClick)
  const onEdgeClickRef = useRef(onEdgeClick)

  // Refs for D3 selections that need to be updated on tick
  const linkSelectionRef = useRef<d3.Selection<
    SVGPathElement,
    SimulationLink,
    SVGGElement,
    unknown
  > | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<
    SVGGElement,
    SimulationNode,
    SVGGElement,
    unknown
  > | null>(null)
  const containerSelectionRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(
    null,
  )
  const linksGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodesGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const defsRef = useRef<d3.Selection<SVGDefsElement, unknown, null, undefined> | null>(null)
  const lensIndicatorRef = useRef<d3.Selection<SVGCircleElement, unknown, null, undefined> | null>(
    null,
  )
  const hoveredNodeRef = useRef<SimulationNode | null>(null)

  // Use extracted hooks
  const dimensions = useElementDimensions(containerRef)
  const { filteredNodes, graphLinks } = useGraphData({
    nodes,
    edges,
    centerArtist,
    threshold,
  })
  const zoomScaleExtent: [number, number] = [0.25, 3]
  const { zoomIn, zoomOut, reset, applyZoom, setTransform } = useD3Zoom({
    svgRef,
    scaleExtent: zoomScaleExtent,
  })
  const { getNodeColor } = useGenreColors({
    nodes: filteredNodes,
  })
  const { animateNodesIn, resetAnimation } = useNodeAnimation({
    enabled: true,
  })

  // Reset animation when center artist changes
  useEffect(() => {
    if (centerArtist !== undefined) {
      resetAnimation()
    }
  }, [resetAnimation, centerArtist])

  // Keep latest event handlers without retriggering effects
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
  }, [onNodeClick])

  useEffect(() => {
    onEdgeClickRef.current = onEdgeClick
  }, [onEdgeClick])

  // Neighbor lookup for hover highlighting
  const getNeighbors = useCallback(
    (nodeName: string) => {
      const neighbors = new Set<string>()
      const key = nodeName.toLowerCase()
      for (const link of graphLinks) {
        const sourceName =
          typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name
        const targetName =
          typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name
        const sourceKey = sourceName.toLowerCase()
        const targetKey = targetName.toLowerCase()
        if (sourceKey === key) neighbors.add(targetKey)
        if (targetKey === key) neighbors.add(sourceKey)
      }
      return neighbors
    },
    [graphLinks],
  )

  // Prepare graph data with mutable copies for D3 - memoized to prevent unnecessary recalculations
  const { graphNodes, links } = useMemo(() => {
    const centerX = dimensions.width / 2 || 400
    const centerY = dimensions.height / 2 || 300

    // Clone nodes for D3 mutation with initial positions spread around center
    const nodes: SimulationNode[] = filteredNodes.map((node, i) => {
      // Center node goes in the middle, others spread in a circle
      if (node.isCenter) {
        return {
          ...node,
          x: centerX,
          y: centerY,
          fx: centerX,
          fy: centerY,
        }
      }
      // Spread other nodes in a circle around center
      const angle = (i / filteredNodes.length) * 2 * Math.PI
      const radius = 150 + Math.random() * 100
      return {
        ...node,
        x: node.x ?? centerX + Math.cos(angle) * radius,
        y: node.y ?? centerY + Math.sin(angle) * radius,
      }
    })
    const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]))

    // Build links with resolved node references
    // graphLinks contain string-based source/target from useGraphData
    const resolvedLinks: SimulationLink[] = []
    for (const link of graphLinks) {
      const sourceName =
        typeof link.source === 'string' ? link.source : (link.source as SimulationNode).name
      const targetName =
        typeof link.target === 'string' ? link.target : (link.target as SimulationNode).name
      const source = nodeMap.get(sourceName.toLowerCase())
      const target = nodeMap.get(targetName.toLowerCase())
      if (source && target) {
        resolvedLinks.push({ source, target, weight: link.weight })
      }
    }

    return { graphNodes: nodes, links: resolvedLinks }
  }, [filteredNodes, graphLinks, dimensions.width, dimensions.height])

  // Fit graph into viewport on initial render/reload to avoid clipping
  const fitGraphToViewport = useCallback(() => {
    if (!svgRef.current) return
    const svgElement = svgRef.current
    const container = svgElement.querySelector<SVGGElement>('.graph-container')
    if (!container) return
    const bbox = container.getBBox()
    if (bbox.width === 0 || bbox.height === 0) return

    const margin = 80
    const { width, height } = dimensions
    const scaleX = (width - margin * 2) / bbox.width
    const scaleY = (height - margin * 2) / bbox.height
    const desiredScale = Math.min(scaleX, scaleY)
    const clampedScale = Math.max(zoomScaleExtent[0], Math.min(desiredScale, zoomScaleExtent[1]))
    const tx = width / 2 - (bbox.x + bbox.width / 2) * clampedScale
    const ty = height / 2 - (bbox.y + bbox.height / 2) * clampedScale

    setTransform(d3.zoomIdentity.translate(tx, ty).scale(clampedScale))
  }, [dimensions, setTransform])

  const sanitizeId = useCallback((value: string) => value.replace(/[^a-zA-Z0-9]/g, '-'), [])

  const getNodeKey = useCallback((d: SimulationNode) => d.lastfm_mbid || d.id || d.name, [])

  const getClipId = useCallback(
    (d: SimulationNode) => {
      const base = getNodeKey(d)
      return `clip-${sanitizeId(base)}`
    },
    [getNodeKey, sanitizeId],
  )

  const getVinylClipId = useCallback(
    (d: SimulationNode) => `vinyl-clip-${sanitizeId(d.name)}`,
    [sanitizeId],
  )

  const getNodeRadius = useCallback((d: SimulationNode) => {
    if (d.isCenter) return 120 // Increased from 80
    // Orbital nodes: 40-64px based on listeners (was 24-36px)
    const baseSize = 40
    const listenersBonus = Math.min((d.listeners || 0) / 10000000, 1) * 24
    return baseSize + listenersBonus
  }, [])

  const renderLabel = useCallback(
    (content: d3.Selection<SVGGElement, SimulationNode, null, undefined>, d: SimulationNode) => {
      const labelGroup = content.append('g').attr('class', 'label-group')

      labelGroup
        .append('text')
        .text(d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', d.isCenter ? 75 : 55) // Was 50 : 42
        .attr('class', 'fill-foreground text-xs font-medium')
        .style('pointer-events', 'none')
        .style('opacity', 1)
        .style('transition', 'opacity 0.2s ease-out')

      const textNode = labelGroup.select('text').node() as SVGTextElement | null
      if (textNode) {
        const bbox = textNode.getBBox()
        labelGroup
          .insert('rect', 'text')
          .attr('class', 'label-backdrop')
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('x', bbox.x - 6)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 12)
          .attr('height', bbox.height + 4)
          .attr('fill', 'hsl(var(--card) / 0.85)')
          .style('opacity', 0.9)
          .style('transition', 'opacity 0.2s ease-out')
      }
    },
    [],
  )

  const renderNodeContent = useCallback(
    (content: d3.Selection<SVGGElement, SimulationNode, null, undefined>, d: SimulationNode) => {
      const radius = getNodeRadius(d)

      if (d.isCenter) {
        const vinylClipId = getVinylClipId(d)
        if (!defsRef.current?.select(`#${vinylClipId}`).node()) {
          defsRef.current
            ?.append('clipPath')
            .attr('id', vinylClipId)
            .append('circle')
            .attr('r', radius - 12) // Was radius - 8
        }

        const spinGroup = content
          .append('g')
          .attr('class', 'vinyl-spin animate-spin-slow')
          .style('pointer-events', 'none')

        spinGroup
          .append('circle')
          .attr('r', radius)
          .attr('fill', '#111')
          .attr('stroke', 'rgba(255,255,255,0.05)')
          .attr('stroke-width', 1)
          .attr('class', 'vinyl-glow')

        spinGroup
          .append('circle')
          .attr('r', radius - 5)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.03)')
          .attr('stroke-width', radius - 20)
          .attr('stroke-dasharray', '1 3')

        if (d.image_url && !isPlaceholderImage(d.image_url)) {
          spinGroup
            .append('image')
            .attr('href', d.image_url)
            .attr('width', (radius - 12) * 2)
            .attr('height', (radius - 12) * 2)
            .attr('x', -(radius - 12))
            .attr('y', -(radius - 12))
            .attr('clip-path', `url(#${vinylClipId})`)
            .style('filter', 'grayscale(60%) contrast(1.2) brightness(0.8)')
            .style('opacity', '0.7')
            .style('pointer-events', 'none')
        }

        spinGroup
          .append('circle')
          .attr('r', 28) // Was 20
          .attr('fill', 'hsl(var(--primary))')
          .attr('class', 'vinyl-glow')

        spinGroup.append('circle').attr('r', 2).attr('fill', '#000')
      } else {
        const floatDuration = 8 + Math.random() * 4 // Was 6-12s, now 8-12s for slower drift
        const floatDelay = Math.random() * 8 // Longer stagger

        content
          .classed('animate-drift', true)
          .style('--drift-duration', `${floatDuration}s`)
          .style('--drift-delay', `${floatDelay}s`)

        content
          .append('circle')
          .attr('class', 'node-circle node-glow')
          .attr('r', radius)
          .attr('fill', getNodeColor(d))
          .attr('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 3)

        if (d.image_url && !isPlaceholderImage(d.image_url)) {
          const clipId = getClipId(d)
          if (!defsRef.current?.select(`#${clipId}`).node()) {
            defsRef.current
              ?.append('clipPath')
              .attr('id', clipId)
              .append('circle')
              .attr('r', radius - 2)
          }

          // Append image AFTER circle so it renders on top
          content
            .append('image')
            .attr('class', 'node-image')
            .attr('href', d.image_url)
            .attr('x', -(radius - 2))
            .attr('y', -(radius - 2))
            .attr('width', (radius - 2) * 2)
            .attr('height', (radius - 2) * 2)
            .attr('clip-path', `url(#${clipId})`)
            .style('filter', 'grayscale(100%)')
            .style('transition', 'filter 0.5s ease-out')
            .style('pointer-events', 'none')
        }
      }

      renderLabel(content, d)
    },
    [getClipId, getNodeColor, getNodeRadius, getVinylClipId, renderLabel],
  )

  const updateNodeContent = useCallback(
    (content: d3.Selection<SVGGElement, SimulationNode, null, undefined>, d: SimulationNode) => {
      const radius = getNodeRadius(d)

      if (d.isCenter) {
        const vinylClipId = getVinylClipId(d)
        defsRef.current?.select(`#${vinylClipId} circle`).attr('r', radius - 12) // Was radius - 8
        content.selectAll<SVGImageElement, SimulationNode>('image').each(function () {
          d3.select(this)
            .attr('width', (radius - 12) * 2)
            .attr('height', (radius - 12) * 2)
            .attr('x', -(radius - 12))
            .attr('y', -(radius - 12))
        })
      } else {
        const circle = content.select<SVGCircleElement>('.node-circle')
        circle.attr('r', radius).attr('fill', getNodeColor(d))

        const clipId = getClipId(d)
        defsRef.current?.select(`#${clipId} circle`).attr('r', radius - 2)

        content.select<SVGImageElement>('.node-image').each(function () {
          d3.select(this)
            .attr('x', -(radius - 2))
            .attr('y', -(radius - 2))
            .attr('width', (radius - 2) * 2)
            .attr('height', (radius - 2) * 2)
            .attr('clip-path', `url(#${clipId})`)
        })
      }

      const labelGroup = content.select<SVGGElement>('.label-group')
      const text = labelGroup
        .select<SVGTextElement>('text')
        .text(d.name)
        .attr('dy', d.isCenter ? 75 : 55) // Was 50 : 42
      const backdrop = labelGroup.select<SVGRectElement>('.label-backdrop')
      const textNode = text.node()

      if (textNode && !backdrop.empty()) {
        const bbox = textNode.getBBox()
        backdrop
          .attr('x', bbox.x - 6)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 12)
          .attr('height', bbox.height + 4)
      }
    },
    [getClipId, getNodeColor, getNodeRadius, getVinylClipId],
  )

  // Tick handler for simulation - updates D3 selections with curved paths
  const handleTick = useCallback(() => {
    if (linkSelectionRef.current) {
      linkSelectionRef.current.attr('d', (d) => {
        const source = d.source as SimulationNode
        const target = d.target as SimulationNode
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        // Perpendicular offset for curve
        const offset = dist * 0.15
        const controlX = midX - (dy / dist) * offset
        const controlY = midY + (dx / dist) * offset
        return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`
      })
    }

    if (nodeSelectionRef.current) {
      nodeSelectionRef.current.attr('transform', (d) => `translate(${d.x},${d.y})`)
    }

    // Update lens indicator position if a node is hovered
    if (lensIndicatorRef.current && hoveredNodeRef.current) {
      const d = hoveredNodeRef.current
      const radius = getNodeRadius(d)
      lensIndicatorRef.current
        .attr('cx', d.x)
        .attr('cy', d.y)
        .attr('r', radius + 16)
    }

    // On first tick after data/zoom reset, fit graph to viewport
    if (!hasFittedRef.current) {
      hasFittedRef.current = true
      // Defer to next frame so DOM measurements reflect latest tick
      requestAnimationFrame(() => {
        fitGraphToViewport()
      })
    }
  }, [fitGraphToViewport, getNodeRadius])

  // Use the D3 simulation hook
  const { simulation, restart } = useD3Simulation({
    nodes: graphNodes,
    links: links as unknown as import('@/types/artist').GraphLink[],
    width: dimensions.width,
    height: dimensions.height,
    onTick: handleTick,
  })

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
          )
        }
        return null
      },
    }),
    [zoomIn, zoomOut, reset],
  )

  // Initial container setup (runs once per SVG mount)
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = svg.append('g').attr('class', 'graph-container')
    containerSelectionRef.current = container

    const defs = svg.append('defs').attr('class', 'graph-defs')
    defsRef.current = defs

    applyZoom(container)

    linksGroupRef.current = container.append('g').attr('class', 'links')
    nodesGroupRef.current = container.append('g').attr('class', 'nodes')

    lensIndicatorRef.current = container
      .append('circle')
      .attr('class', 'lens-indicator')
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--primary) / 0.5)')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .style('pointer-events', 'none')

    return () => {
      containerSelectionRef.current = null
      linksGroupRef.current = null
      nodesGroupRef.current = null
      defsRef.current = null
      lensIndicatorRef.current = null
    }
  }, [applyZoom])

  const handleEdgeClick = useCallback((event: MouseEvent, d: SimulationLink) => {
    event.stopPropagation()
    const handler = onEdgeClickRef.current
    if (!handler) return

    const source = d.source as SimulationNode
    const target = d.target as SimulationNode
    const midX = (source.x + target.x) / 2
    const midY = (source.y + target.y) / 2

    const sourceTags = new Set(source.tags || [])
    const sharedTags = (target.tags || []).filter((tag) => sourceTags.has(tag))

    handler({
      source: source.name,
      target: target.name,
      weight: d.weight,
      position: { x: midX, y: midY },
      sharedTags,
    })
  }, [])

  const handleEdgeMouseEnter = useCallback(function (this: SVGPathElement) {
    d3.select(this).attr('stroke', 'hsl(var(--primary))').attr('stroke-opacity', 0.8)
  }, [])

  const handleEdgeMouseLeave = useCallback(function (
    this: SVGPathElement,
    _event: MouseEvent,
    d: SimulationLink,
  ) {
    d3.select(this)
      .attr('stroke', 'hsl(var(--graph-edge))')
      .attr('stroke-opacity', 0.15 + d.weight * 0.25)
  }, [])

  useEffect(() => {
    if (!linksGroupRef.current) return

    const linkSelection = linksGroupRef.current
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(links, (d) => {
        const source = d.source as SimulationNode
        const target = d.target as SimulationNode
        return `${source.name}-${target.name}`
      })

    linkSelection.exit().remove()

    const linkEnter = linkSelection
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--graph-edge))')
      .attr('stroke-opacity', (d) => 0.15 + d.weight * 0.25)
      .attr('stroke-width', (d) => 0.5 + d.weight * 1.5)
      .attr('class', 'cursor-pointer edge-glow')
      .style('transition', 'stroke-opacity 0.3s ease-out, stroke 0.3s ease-out')
      .on('click', handleEdgeClick)
      .on('mouseenter', handleEdgeMouseEnter)
      .on('mouseleave', handleEdgeMouseLeave)

    linkSelectionRef.current = linkEnter.merge(linkSelection)

    if (links.length === 0) {
      linkSelectionRef.current = null
    }
  }, [handleEdgeClick, handleEdgeMouseEnter, handleEdgeMouseLeave, links])

  const applyHighlight = useCallback(
    (highlightedName: string | null) => {
      if (!linkSelectionRef.current || !nodeSelectionRef.current) return

      if (!highlightedName) {
        linkSelectionRef.current.attr('stroke-opacity', (d) => 0.15 + d.weight * 0.25)
        linkSelectionRef.current.attr('stroke', 'hsl(var(--graph-edge))')
        nodeSelectionRef.current.style('opacity', 1)
        return
      }

      const highlightKey = highlightedName.toLowerCase()
      const neighbors = getNeighbors(highlightKey)

      linkSelectionRef.current.attr('stroke-opacity', (d) => {
        const sourceKey = (d.source as SimulationNode).name.toLowerCase()
        const targetKey = (d.target as SimulationNode).name.toLowerCase()
        if (sourceKey === highlightKey || targetKey === highlightKey) {
          return 0.9
        }
        return 0.03
      })

      linkSelectionRef.current.attr('stroke', (d) => {
        const sourceKey = (d.source as SimulationNode).name.toLowerCase()
        const targetKey = (d.target as SimulationNode).name.toLowerCase()
        if (sourceKey === highlightKey || targetKey === highlightKey) {
          return 'hsl(var(--primary))'
        }
        return 'hsl(var(--graph-edge))'
      })

      nodeSelectionRef.current.style('opacity', (d) => {
        const nodeKey = d.name.toLowerCase()
        if (nodeKey === highlightKey || neighbors.has(nodeKey)) {
          return 1
        }
        return 0.15
      })
    },
    [getNeighbors],
  )

  const handleNodeClick = useCallback((_event: MouseEvent, d: SimulationNode) => {
    onNodeClickRef.current?.(d)
  }, [])

  const handleNodeMouseEnter = useCallback(
    (event: MouseEvent, d: SimulationNode) => {
      if (d.isCenter) return
      applyHighlight(d.name)

      // Track hovered node for tick updates
      hoveredNodeRef.current = d

      const currentTarget = event.currentTarget as SVGGElement | null
      if (currentTarget) {
        const radius = getNodeRadius(d)

        // Show lens indicator
        if (lensIndicatorRef.current) {
          lensIndicatorRef.current
            .attr('cx', d.x)
            .attr('cy', d.y)
            .attr('r', radius + 16)
            .classed('animate-pulse-ring', true)
            .style('opacity', 1)
        }

        // Highlight circle with active glow
        d3.select(currentTarget)
          .select('.node-content circle')
          .attr('fill', 'hsl(var(--graph-node-hover))')
          .classed('node-glow-active', true)
          .classed('node-glow', false)

        // Remove grayscale on hover
        d3.select(currentTarget).select('image.node-image').classed('node-image-hover', true)
      }

      if (!tooltipRef.current) return
      const tooltip = d3.select(tooltipRef.current)
      tooltip.style('display', 'block').style('opacity', '1').html('')

      tooltip.append('div').attr('class', 'font-display italic text-lg').text(d.name)

      if (d.tags?.[0]) {
        tooltip
          .append('div')
          .attr('class', 'text-[10px] text-primary uppercase tracking-[0.2em] mt-1')
          .text(d.tags[0])
      }

      tooltip
        .append('div')
        .attr('class', 'text-[10px] text-muted-foreground mt-2 opacity-70')
        .text('Often played together')

      tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`)
    },
    [applyHighlight, getNodeRadius],
  )

  const handleNodeMouseMove = useCallback((event: MouseEvent) => {
    if (!tooltipRef.current) return
    const tooltip = d3.select(tooltipRef.current)
    tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`)
  }, [])

  const handleNodeMouseLeave = useCallback(
    (event: MouseEvent, d: SimulationNode) => {
      applyHighlight(null)

      // Clear hovered node tracking
      hoveredNodeRef.current = null

      // Hide lens indicator
      if (lensIndicatorRef.current) {
        lensIndicatorRef.current.classed('animate-pulse-ring', false).style('opacity', 0)
      }

      const currentTarget = event.currentTarget as SVGGElement | null
      if (currentTarget) {
        d3.select(currentTarget)
          .select('.node-content circle')
          .attr('fill', getNodeColor(d))
          .classed('node-glow-active', false)
          .classed('node-glow', true)

        // Restore grayscale on leave
        d3.select(currentTarget).select('image.node-image').classed('node-image-hover', false)
      }

      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', '0').style('display', 'none')
      }
    },
    [applyHighlight, getNodeColor],
  )

  // Create tooltip once
  useEffect(() => {
    if (!tooltipRef.current) {
      tooltipRef.current = document.createElement('div')
      tooltipRef.current.className = 'graph-tooltip'
      tooltipRef.current.style.opacity = '0'
      tooltipRef.current.style.display = 'none'
      document.body.appendChild(tooltipRef.current)
    }

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove()
        tooltipRef.current = null
      }
    }
  }, [])

  const dragBehavior = useMemo(
    () =>
      d3
        .drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active && simulation) simulation.alphaTarget(0)
          d.fx = undefined
          d.fy = undefined
        }),
    [restart, simulation],
  )

  useEffect(() => {
    if (!nodesGroupRef.current) return

    hasFittedRef.current = false

    const nodeSelection: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> =
      nodesGroupRef.current
        .selectAll<SVGGElement, SimulationNode>('.node-position')
        .data<SimulationNode>(graphNodes, (d) => getNodeKey(d))

    const nodeExit: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> =
      nodeSelection.exit()
    nodeExit.each((d: SimulationNode) => {
      defsRef.current?.select(`#${getClipId(d)}`).remove()
      defsRef.current?.select(`#${getVinylClipId(d)}`).remove()
    })
    nodeExit.remove()

    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'node-position')
      .style('cursor', 'pointer')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    nodeEnter.append('g').attr('class', 'node-content')

    nodeEnter.each(function (d: SimulationNode) {
      const content = d3
        .select<SVGGElement, SimulationNode>(this as SVGGElement)
        .select<SVGGElement>('.node-content')
      renderNodeContent(content, d)
    })

    nodeEnter.call(dragBehavior)
    nodeEnter
      .on('click', handleNodeClick)
      .on('mouseenter', handleNodeMouseEnter)
      .on('mousemove', handleNodeMouseMove)
      .on('mouseleave', handleNodeMouseLeave)

    const nodeMerge: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> =
      nodeEnter.merge(nodeSelection)

    nodeMerge.each(function (d: SimulationNode) {
      const content = d3
        .select<SVGGElement, SimulationNode>(this as SVGGElement)
        .select<SVGGElement>('.node-content')
      updateNodeContent(content, d)
    })

    nodeSelectionRef.current = nodeMerge

    if (nodeEnter.size() > 0) {
      animateNodesIn(nodeEnter)
    }

    if (graphNodes.length === 0) {
      nodeSelectionRef.current = null
    }
  }, [
    animateNodesIn,
    dragBehavior,
    getClipId,
    getVinylClipId,
    graphNodes,
    handleNodeClick,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeMouseMove,
    getNodeKey,
    renderNodeContent,
    updateNodeContent,
  ])

  // Toggle label visibility without rerendering nodes
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('.label-group text').style('opacity', showLabels ? 1 : 0)
    svg.selectAll('.label-backdrop').style('opacity', showLabels ? 0.9 : 0)
  }, [showLabels])

  if (filteredNodes.length === 0) {
    return (
      <div
        className={cn('flex h-full items-center justify-center text-muted-foreground', className)}
      >
        <p>Search for an artist to explore their similarity map</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-background"
      />
    </div>
  )
})

export type { ForceGraphHandle, ForceGraphProps } from './types'
