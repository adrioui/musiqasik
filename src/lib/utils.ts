import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with K/M suffix for display
 */
export function formatNumber(num?: number | null, suffix?: string): string {
  if (num === undefined || num === null) return 'N/A'

  let value: string
  if (num >= 1_000_000) {
    value = `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    value = `${Math.round(num / 1_000)}K`
  } else {
    value = num.toString()
  }

  return suffix ? `${value} ${suffix}` : value
}

/**
 * Checks if an image URL is a Last.fm placeholder
 */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) return true
  return (
    url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
    url.includes('star') ||
    url === '' ||
    url.endsWith('/noimage/')
  )
}

// biome-ignore lint/suspicious/noExplicitAny: Generic utility function
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
}

// biome-ignore lint/suspicious/noExplicitAny: Generic utility function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const debounced = function (this: any, ...args: Parameters<T>) {
    // biome-ignore lint/style/noNonNullAssertion: safe to use this here
    const context = this
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced as DebouncedFunction<T>
}
