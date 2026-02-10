import { afterEach } from 'vitest'

// Mock ResizeObserver for Radix UI components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver

afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
  }
})
