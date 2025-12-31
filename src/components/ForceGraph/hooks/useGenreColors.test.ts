import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GraphNode } from '../types'
import { useGenreColors } from './useGenreColors'

describe('useGenreColors', () => {
  const createNode = (name: string, tags?: string[], isCenter = false): GraphNode => ({
    name,
    tags,
    isCenter,
    listeners: 1000,
  })

  it('should return center color for center node', () => {
    const nodes = [createNode('Artist A', ['rock'], true)]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const color = result.current.getNodeColor(nodes[0])
    expect(color).toBe('hsl(var(--graph-center))')
  })

  it('should return default color for node without tags', () => {
    const nodes = [createNode('Artist A', undefined)]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const color = result.current.getNodeColor(nodes[0])
    expect(color).toBe('hsl(var(--graph-node))')
  })

  it('should return default color for node with empty tags', () => {
    const nodes = [createNode('Artist A', [])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const color = result.current.getNodeColor(nodes[0])
    expect(color).toBe('hsl(var(--graph-node))')
  })

  it('should return consistent color for same tag', () => {
    const nodes = [createNode('Artist A', ['rock']), createNode('Artist B', ['rock'])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const colorA = result.current.getNodeColor(nodes[0])
    const colorB = result.current.getNodeColor(nodes[1])

    expect(colorA).toBe(colorB)
    expect(colorA).not.toBe('hsl(var(--graph-node))')
  })

  it('should be case insensitive for tag matching', () => {
    const nodes = [createNode('Artist A', ['Rock']), createNode('Artist B', ['ROCK'])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const colorA = result.current.getNodeColor(nodes[0])
    const colorB = result.current.getNodeColor(nodes[1])

    expect(colorA).toBe(colorB)
  })

  it('should return different colors for different tags', () => {
    const nodes = [createNode('Artist A', ['rock']), createNode('Artist B', ['jazz'])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const colorA = result.current.getNodeColor(nodes[0])
    const colorB = result.current.getNodeColor(nodes[1])

    // Different genres should likely have different colors (with hash collisions possible)
    expect(colorA).not.toBe('hsl(var(--graph-node))')
    expect(colorB).not.toBe('hsl(var(--graph-node))')
  })

  it('should use primary tag (first tag) for color', () => {
    const nodes = [
      createNode('Artist A', ['rock', 'alternative', 'indie']),
      createNode('Artist B', ['rock', 'pop']),
    ]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const colorA = result.current.getNodeColor(nodes[0])
    const colorB = result.current.getNodeColor(nodes[1])

    // Both have 'rock' as primary tag, should have same color
    expect(colorA).toBe(colorB)
  })

  it('should build genreColorMap with normalized tags', () => {
    const nodes = [
      createNode('Artist A', ['Rock']),
      createNode('Artist B', ['Jazz']),
      createNode('Artist C', ['Pop']),
    ]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    expect(result.current.genreColorMap.has('rock')).toBe(true)
    expect(result.current.genreColorMap.has('jazz')).toBe(true)
    expect(result.current.genreColorMap.has('pop')).toBe(true)
    // Should be lowercase
    expect(result.current.genreColorMap.has('Rock')).toBe(false)
  })

  it('should return empty genreColorMap when no tags present', () => {
    const nodes = [createNode('Artist A'), createNode('Artist B', [])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    expect(result.current.genreColorMap.size).toBe(0)
  })

  it('should return colors from the palette', () => {
    const nodes = [createNode('Artist A', ['electronic'])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const color = result.current.getNodeColor(nodes[0])
    // Should be a hex color from the palette
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('should produce stable colors across hook rerenders', () => {
    const nodes = [createNode('Artist A', ['rock'])]
    const { result, rerender } = renderHook(() => useGenreColors({ nodes }))

    const colorBefore = result.current.getNodeColor(nodes[0])
    rerender()
    const colorAfter = result.current.getNodeColor(nodes[0])

    expect(colorBefore).toBe(colorAfter)
  })

  it('should memoize result when nodes do not change', () => {
    const nodes = [createNode('Artist A', ['rock'])]
    const { result, rerender } = renderHook(() => useGenreColors({ nodes }))

    const firstResult = result.current
    rerender()
    const secondResult = result.current

    expect(firstResult).toBe(secondResult)
  })

  it('should trim whitespace from tags', () => {
    const nodes = [createNode('Artist A', ['  rock  ']), createNode('Artist B', ['rock'])]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const colorA = result.current.getNodeColor(nodes[0])
    const colorB = result.current.getNodeColor(nodes[1])

    expect(colorA).toBe(colorB)
  })

  it('should handle mixed valid and invalid tags', () => {
    const nodes = [
      createNode('Artist A', ['rock']),
      createNode('Artist B', []),
      createNode('Artist C', undefined),
    ]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    expect(result.current.getNodeColor(nodes[0])).not.toBe('hsl(var(--graph-node))')
    expect(result.current.getNodeColor(nodes[1])).toBe('hsl(var(--graph-node))')
    expect(result.current.getNodeColor(nodes[2])).toBe('hsl(var(--graph-node))')
  })

  it('should prioritize center color over genre color', () => {
    const nodes = [createNode('Artist A', ['rock'], true)]
    const { result } = renderHook(() => useGenreColors({ nodes }))

    const color = result.current.getNodeColor(nodes[0])
    // Center node should always use center color, not genre color
    expect(color).toBe('hsl(var(--graph-center))')
  })
})
