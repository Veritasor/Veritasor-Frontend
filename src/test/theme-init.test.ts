import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const themeInitPath = path.resolve(process.cwd(), 'public/theme-init.js')
const indexHtmlPath = path.resolve(process.cwd(), 'index.html')
const themeInitSource = readFileSync(themeInitPath, 'utf-8')

function runThemeInit() {
  const fn = new Function(themeInitSource)
  fn()
}

describe('public/theme-init.js', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sets data-theme="dark" by default when localStorage is empty', () => {
    runThemeInit()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('sets data-theme="high-contrast" when high-contrast is stored', () => {
    localStorage.setItem('veritasor-theme', 'high-contrast')
    runThemeInit()
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
  })

  it('falls back to data-theme="dark" for light, system, or unknown stored values', () => {
    for (const value of ['light', 'dark', 'system', 'unexpected']) {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('veritasor-theme', value)
      runThemeInit()
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    }
  })

  it('handles localStorage errors gracefully and defaults to dark', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })

    expect(() => runThemeInit()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})

describe('index.html CSP readiness', () => {
  it('loads /theme-init.js externally and contains no inline scripts', () => {
    const html = readFileSync(indexHtmlPath, 'utf-8')
    expect(html).toContain('<script src="/theme-init.js"></script>')

    const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    expect(scriptTags.length).toBeGreaterThan(0)
    for (const [, attrs, body] of scriptTags) {
      expect(attrs).toMatch(/\bsrc\s*=/)
      expect(body.trim()).toBe('')
    }
  })
})
