import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cn, debounce, formatNumber, isPlaceholderImage } from './utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('should handle false conditionals', () => {
    const isActive = false
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base')
  })

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle object syntax', () => {
    const result = cn('base', { active: true, disabled: false })
    expect(result).toBe('base active')
  })

  it('should handle array syntax', () => {
    const result = cn(['foo', 'bar'])
    expect(result).toBe('foo bar')
  })

  it('should handle undefined and null', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

describe('formatNumber', () => {
  it('formats millions with M suffix', () => {
    expect(formatNumber(1500000)).toBe('1.5M')
    expect(formatNumber(10000000)).toBe('10.0M')
  })

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1500)).toBe('2K')
    expect(formatNumber(999000)).toBe('999K')
  })

  it('returns raw number for small values', () => {
    expect(formatNumber(500)).toBe('500')
    expect(formatNumber(0)).toBe('0')
  })

  it('returns N/A for null or undefined', () => {
    expect(formatNumber(null)).toBe('N/A')
    expect(formatNumber(undefined)).toBe('N/A')
  })

  it('appends suffix when provided', () => {
    expect(formatNumber(1500000, 'listeners')).toBe('1.5M listeners')
    expect(formatNumber(null, 'listeners')).toBe('N/A')
  })
})

describe('isPlaceholderImage', () => {
  it('returns true for null or undefined', () => {
    expect(isPlaceholderImage(null)).toBe(true)
    expect(isPlaceholderImage(undefined)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isPlaceholderImage('')).toBe(true)
  })

  it('returns true for Last.fm placeholder hash', () => {
    expect(
      isPlaceholderImage(
        'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png',
      ),
    ).toBe(true)
  })

  it('returns true for star placeholder', () => {
    expect(isPlaceholderImage('https://example.com/star.png')).toBe(true)
  })

  it('returns true for noimage path', () => {
    expect(isPlaceholderImage('https://example.com/noimage/')).toBe(true)
  })

  it('returns false for valid image URLs', () => {
    expect(isPlaceholderImage('https://example.com/artist.jpg')).toBe(false)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should debounce function calls', () => {
    const callback = vi.fn()
    const debouncedFn = debounce(callback, 100)

    debouncedFn()
    debouncedFn()
    debouncedFn()

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should support cancellation', () => {
    const callback = vi.fn()
    const debouncedFn = debounce(callback, 100)

    debouncedFn()
    debouncedFn.cancel()

    vi.advanceTimersByTime(100)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should pass arguments to the callback', () => {
    const callback = vi.fn()
    const debouncedFn = debounce(callback, 100)

    debouncedFn('arg1', 2)

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledWith('arg1', 2)
  })
})
