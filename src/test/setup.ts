import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

// jsdom does not implement matchMedia. Several hooks (useTheme, useIsMobile)
// depend on it, so provide a safe default (no query ever matches) here so any
// component using it can mount in tests. Individual tests that need a specific
// breakpoint/theme result can vi.spyOn(window, 'matchMedia') to override it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
