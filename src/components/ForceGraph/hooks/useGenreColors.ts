import { useMemo } from 'react'
import type { GraphNode } from '../types'

interface UseGenreColorsProps {
  nodes: GraphNode[]
}

interface UseGenreColorsResult {
  getNodeColor: (node: GraphNode) => string
  genreColorMap: Map<string, string>
}

// Use a vibrant, distinguishable color palette
const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
]

const DEFAULT_COLOR = 'hsl(var(--graph-node))'
const CENTER_COLOR = 'hsl(var(--graph-center))'

// Simple hash function for stable color assignment
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function useGenreColors({ nodes }: UseGenreColorsProps): UseGenreColorsResult {
  return useMemo(() => {
    // Collect unique primary tags
    const uniqueTags = new Set<string>()
    nodes.forEach((node) => {
      const primaryTag = node.tags?.[0]?.trim().toLowerCase()
      if (primaryTag) {
        uniqueTags.add(primaryTag)
      }
    })

    // Build genre -> color map using stable hashing
    const genreColorMap = new Map<string, string>()
    uniqueTags.forEach((tag) => {
      const colorIndex = hashString(tag) % COLOR_PALETTE.length
      genreColorMap.set(tag, COLOR_PALETTE[colorIndex])
    })

    // Color getter function
    const getNodeColor = (node: GraphNode): string => {
      if (node.isCenter) return CENTER_COLOR
      const primaryTag = node.tags?.[0]?.trim().toLowerCase()
      if (primaryTag && genreColorMap.has(primaryTag)) {
        return genreColorMap.get(primaryTag)!
      }
      return DEFAULT_COLOR
    }

    return { getNodeColor, genreColorMap }
  }, [nodes])
}
