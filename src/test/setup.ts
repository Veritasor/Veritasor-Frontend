import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

// ─── ResizeObserver polyfill for JSDOM ─────────────────────────────────────
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe() {
      // Fire callback once so measurement effects run
      this.callback([], this)
    }
    unobserve() {}
    disconnect() {}
  }
}
