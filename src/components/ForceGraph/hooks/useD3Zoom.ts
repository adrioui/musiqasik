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
  setTransform: (transform: d3.ZoomTransform) => void
}

export function useD3Zoom({ svgRef, scaleExtent = [0.5, 2] }: UseD3ZoomProps): UseD3ZoomResult {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const applyZoom = useCallback(
    (g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      if (!svgRef.current) return
      const { width, height } = svgRef.current.getBoundingClientRect()
      const translateExtent: [[number, number], [number, number]] = [
        [-width * 2, -height * 2],
        [width * 3, height * 3],
      ]

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent(scaleExtent)
        .translateExtent(translateExtent)
        .wheelDelta((event) => -event.deltaY * 0.002) // Slower scroll zoom
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })

      const svgSelection = d3.select(svgRef.current)
      svgSelection.call(zoom)
      // Reset transform to keep graph centered on re-init
      svgSelection.call(zoom.transform, d3.zoomIdentity)
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

  const setTransform = useCallback(
    (transform: d3.ZoomTransform) => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).call(zoomRef.current.transform, transform)
      }
    },
    [svgRef],
  )

  return { zoomIn, zoomOut, reset, applyZoom, setTransform }
}
