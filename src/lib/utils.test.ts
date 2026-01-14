import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cn, debounce, formatNumber, isPlaceholderImage } from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })
    it('handles conditionals', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
    })
    it('merges tailwind classes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })
  })

  describe('formatNumber', () => {
    it('formats numbers with K/M', () => {
      expect(formatNumber(1200)).toBe('1K')
      expect(formatNumber(1500000)).toBe('1.5M')
      expect(formatNumber(500)).toBe('500')
    })
    it('adds suffix', () => {
      expect(formatNumber(1200, 'listeners')).toBe('1K listeners')
    })
    it('handles null/undefined', () => {
      expect(formatNumber(null)).toBe('N/A')
      expect(formatNumber(undefined)).toBe('N/A')
    })
  })

  describe('isPlaceholderImage', () => {
    it('identifies placeholder images', () => {
      expect(isPlaceholderImage('')).toBe(true)
      expect(isPlaceholderImage(null)).toBe(true)
      expect(
        isPlaceholderImage(
          'https://lastfm.freetls.fastly.net/i/u/2a96cbd8b46e442fc41c2b86b821562f.png',
        ),
      ).toBe(true)
      expect(isPlaceholderImage('https://example.com/star.png')).toBe(true)
      expect(isPlaceholderImage('https://example.com/noimage/')).toBe(true)
    })
    it('identifies real images', () => {
      expect(isPlaceholderImage('https://example.com/image.jpg')).toBe(false)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debounces function calls', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc()
      debouncedFunc()
      debouncedFunc()

      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(func).toHaveBeenCalledTimes(1)
    })

    it('can be canceled', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc()
      debouncedFunc.cancel()

      vi.advanceTimersByTime(100)

      expect(func).not.toHaveBeenCalled()
    })
  })
})
