import { afterEach, vi } from 'vitest'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
  }
})
