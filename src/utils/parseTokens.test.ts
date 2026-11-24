import { describe, it, expect } from 'vitest'
import {
  parseTokens,
  getVariantLabel,
  getVariantSelector,
  tokensToCss,
  type TokenBlock,
} from './parseTokens'

describe('parseTokens', () => {
  it('returns parsed token blocks with version and ISO timestamp', () => {
    const result = parseTokens()
    expect(result.version).toBe('0.1.0')
    expect(Array.isArray(result.blocks)).toBe(true)
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt)
  })

  it('formats variant labels for root, data-theme, and density', () => {
    expect(getVariantLabel({ kind: 'root' })).toBe(':root (default dark)')
    expect(getVariantLabel({ kind: 'data-theme', theme: 'light' })).toBe(
      '[data-theme="light"]',
    )
    expect(getVariantLabel({ kind: 'data-theme', theme: 'dark' })).toBe(
      '[data-theme="dark"]',
    )
    expect(getVariantLabel({ kind: 'density', density: 'compact' })).toBe(
      '[data-density="compact"]',
    )
  })

  it('formats variant selectors for root, data-theme, and density', () => {
    expect(getVariantSelector({ kind: 'root' })).toBe(':root')
    expect(getVariantSelector({ kind: 'data-theme', theme: 'light' })).toBe(
      '[data-theme="light"]',
    )
    expect(getVariantSelector({ kind: 'density', density: 'compact' })).toBe(
      '[data-density="compact"]',
    )
  })

  it('serializes :root block and appends compact density block when present', () => {
    const blocks: TokenBlock[] = [
      { selector: ':root', properties: { '--bg': '#07111f', '--fg': '#fff' } },
      {
        selector: '[data-density="compact"]',
        properties: { '--space-2': '4px' },
      },
    ]

    const css = tokensToCss(blocks, { kind: 'root' })
    expect(css).toContain(':root {')
    expect(css).toContain('  --bg: #07111f;')
    expect(css).toContain('[data-density="compact"] {')
    expect(css).toContain('  --space-2: 4px;')
  })

  it('serializes data-theme variant without appending density block', () => {
    const blocks: TokenBlock[] = [
      {
        selector: '[data-theme="light"]',
        properties: { '--bg': '#ffffff' },
      },
      {
        selector: '[data-density="compact"]',
        properties: { '--space-2': '4px' },
      },
    ]

    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'light' })
    expect(css).toContain('[data-theme="light"] {')
    expect(css).toContain('  --bg: #ffffff;')
    expect(css).not.toContain('[data-density="compact"] {')
  })

  it('outputs a helpful comment when no block matches the selector', () => {
    const css = tokensToCss([], { kind: 'data-theme', theme: 'dark' })
    expect(css).toContain('/* No tokens found for selector: [data-theme="dark"] */')
  })
})
