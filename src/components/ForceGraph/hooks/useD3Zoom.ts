import * as d3 from 'd3'
import { useCallback, useRef } from 'react'

interface UseD3ZoomProps {
  svgRef: React.RefObject<SVGSVGElement>
  scaleExtent?: [number, number]
}

interface UseD3ZoomResult {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  applyZoom: (g: d3.Selection<SVGGElement, unknown, null, undefined>) => void
}

export function useD3Zoom({ svgRef, scaleExtent = [0.2, 4] }: UseD3ZoomProps): UseD3ZoomResult {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const applyZoom = useCallback(
    (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      if (!svgRef.current) return

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent(scaleExtent)
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })

      d3.select(svgRef.current).call(zoom)
      zoomRef.current = zoom
    },
    [svgRef, scaleExtent],
  )

  const zoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4)
    }
  }, [svgRef])

  const zoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
    }
  }, [svgRef])

  const reset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }, [svgRef])

  return { zoomIn, zoomOut, reset, applyZoom }
}
