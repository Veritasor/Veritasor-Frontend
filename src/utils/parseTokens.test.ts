import { describe, expect, it } from 'vitest'
import {
  getVariantLabel,
  getVariantSelector,
  parseTokens,
  tokensToCss,
  type ThemeVariant,
  type TokenBlock,
} from './parseTokens'

describe('getVariantLabel', () => {
  const cases: Array<{ variant: ThemeVariant; expected: string }> = [
    { variant: { kind: 'root' }, expected: ':root (default dark)' },
    { variant: { kind: 'data-theme', theme: 'light' }, expected: '[data-theme="light"]' },
    { variant: { kind: 'data-theme', theme: 'dark' }, expected: '[data-theme="dark"]' },
    { variant: { kind: 'density', density: 'compact' }, expected: '[data-density="compact"]' },
  ]

  for (const { variant, expected } of cases) {
    it(`returns "${expected}" for ${JSON.stringify(variant)}`, () => {
      expect(getVariantLabel(variant)).toBe(expected)
    })
  }
})

describe('getVariantSelector', () => {
  const cases: Array<{ variant: ThemeVariant; expected: string }> = [
    { variant: { kind: 'root' }, expected: ':root' },
    { variant: { kind: 'data-theme', theme: 'light' }, expected: '[data-theme="light"]' },
    { variant: { kind: 'data-theme', theme: 'dark' }, expected: '[data-theme="dark"]' },
    { variant: { kind: 'density', density: 'compact' }, expected: '[data-density="compact"]' },
  ]

  for (const { variant, expected } of cases) {
    it(`returns "${expected}" for ${JSON.stringify(variant)}`, () => {
      expect(getVariantSelector(variant)).toBe(expected)
    })
  }
})

describe('parseTokens', () => {
  it('returns parsed blocks with version and valid ISO timestamp', () => {
    const parsed = parseTokens()

    expect(parsed.blocks.length).toBeGreaterThan(0)
    expect(parsed.version).toBe('0.1.0')
    expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt)
  })

  it('extracts :root, light theme, and compact density blocks with custom properties', () => {
    const { blocks } = parseTokens()

    const root = blocks.find((b) => b.selector === ':root')
    const light = blocks.find((b) => b.selector === '[data-theme="light"]')
    const compact = blocks.find((b) => b.selector === '[data-density="compact"]')

    expect(root).toBeDefined()
    expect(Object.keys(root!.properties).length).toBeGreaterThan(0)
    expect(light).toBeDefined()
    expect(Object.keys(light!.properties).length).toBeGreaterThan(0)
    expect(compact).toBeDefined()
    expect(Object.keys(compact!.properties).length).toBeGreaterThan(0)
  })
})

describe('tokensToCss', () => {
  it('returns a no-tokens-found comment when blocks array is empty', () => {
    const css = tokensToCss([], { kind: 'root' })

    expect(css).toContain('Scope: :root (default dark)')
    expect(css).toContain('/* No tokens found for selector: :root */')
    expect(css).not.toContain(':root {')
  })

  it('returns a no-tokens-found comment when target variant selector is missing', () => {
    const blocks: TokenBlock[] = [
      { selector: ':root', properties: { '--bg': '#000' } },
    ]

    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'dark' })

    expect(css).toContain('Scope: [data-theme="dark"]')
    expect(css).toContain('/* No tokens found for selector: [data-theme="dark"] */')
    expect(css).not.toContain('[data-theme="dark"] {')
  })

  it('emits an empty rule block when the matching block has no properties', () => {
    const blocks: TokenBlock[] = [
      { selector: '[data-theme="light"]', properties: {} },
    ]

    const css = tokensToCss(blocks, { kind: 'data-theme', theme: 'light' })

    expect(css).toContain('[data-theme="light"] {\n}')
    expect(css).not.toContain('/* No tokens found')
  })

  it('preserves values containing single and double quotes', () => {
    const blocks: TokenBlock[] = [
      {
        selector: ':root',
        properties: {
          '--font-sans': '"Inter", \'Segoe UI\', sans-serif',
          '--content-label': '"Veritasor \'v1\'"',
        },
      },
    ]

    const css = tokensToCss(blocks, { kind: 'root' })

    expect(css).toContain('  --font-sans: "Inter", \'Segoe UI\', sans-serif;')
    expect(css).toContain('  --content-label: "Veritasor \'v1\'";')
  })

  it('preserves values containing semicolons', () => {
    const blocks: TokenBlock[] = [
      {
        selector: ':root',
        properties: {
          '--bg-image': 'url("data:image/svg+xml;utf8,<svg></svg>")',
          '--note': '"a; b"',
        },
      },
    ]

    const css = tokensToCss(blocks, { kind: 'root' })

    expect(css).toContain('  --bg-image: url("data:image/svg+xml;utf8,<svg></svg>");')
    expect(css).toContain('  --note: "a; b";')
  })

  it('includes compact density block only for root variant when present', () => {
    const blocks: TokenBlock[] = [
      { selector: ':root', properties: { '--bg': '#07111f' } },
      { selector: '[data-density="compact"]', properties: { '--density-gap': '0.5rem' } },
    ]

    const rootCss = tokensToCss(blocks, { kind: 'root' })
    expect(rootCss).toContain(':root {\n  --bg: #07111f;\n}')
    expect(rootCss).toContain('/* Compact density variant (apply [data-density="compact"] on <html>) */')
    expect(rootCss).toContain('[data-density="compact"] {\n  --density-gap: 0.5rem;\n}')

    const densityCss = tokensToCss(blocks, { kind: 'density', density: 'compact' })
    expect(densityCss).toContain('Scope: [data-density="compact"]')
    expect(densityCss).toContain('[data-density="compact"] {\n  --density-gap: 0.5rem;\n}')
    expect(densityCss).not.toContain('/* Compact density variant')
  })

  it('omits compact density section for root when compact block is absent', () => {
    const blocks: TokenBlock[] = [
      { selector: ':root', properties: { '--bg': '#07111f' } },
    ]

    const css = tokensToCss(blocks, { kind: 'root' })

    expect(css).toContain(':root {\n  --bg: #07111f;\n}')
    expect(css).not.toContain('[data-density="compact"]')
  })
})
