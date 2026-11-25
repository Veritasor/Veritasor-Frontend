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
      this.callback([], this)
    }
    unobserve() {}
    disconnect() {}
  }
}

// ─── scrollIntoView polyfill for JSDOM ────────────────────────────────────
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}

// ─── matchMedia polyfill for JSDOM ─────────────────────────────────────────
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
}

let objectUrlCounter = 0

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => {
    objectUrlCounter += 1
    return `blob:test-${objectUrlCounter}`
  }
}

if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {}
}

// ─── IntersectionObserver polyfill for JSDOM ────────────────────────────────
if (typeof IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    private callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }
    observe() {
      this.callback([], this)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root: Element | Document | null = null
    rootMargin: string = ''
    thresholds: ReadonlyArray<number> = []
  }
}
